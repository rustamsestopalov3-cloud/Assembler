/*
 * ============================================================================
 * Команда Assembler · Олимпиада Иннагрика 2026 · Кейс AT9-3 (Задание 2, A3)
 * Прошивка контроллера высевающего аппарата:
 * Arduino Nano + TMC2209 + NEMA 17 + LM393 + Лазер KY-008 + Заслонка SG90 + OLED
 * ============================================================================
 * КРИТИЧЕСКИЕ ПРАВИЛА БЕЗОПАСНОСТИ (Сценарий С6):
 * 1. При подаче питания или перезапуске (reset/просадка) система ВСЕГДА
 *    запускается в состоянии IDLE (драйвер отключён: PIN_EN = HIGH).
 * 2. Программа НИКОГДА не запускает привод автоматически при включении и
 *    НИКОГДА не возобновляет прерванную серию после восстановления питания.
 * 3. Команда STEP двигателю НЕ равна подтверждению вращения: фактическое
 *    вращение подтверждается ТОЛЬКО импульсами оптического датчика на D2.
 * 4. При потере импульсов LM393 выполняется безопасная расклиновка (до 2
 *    попыток реверса на 15°); если вращение не восстановилось — жесткий
 *    FAULT_NO_FEEDBACK (EN=HIGH).
 * 5. При срабатывании лазерного детектора примесей (D3) заслонка SG90 (D11)
 *    открывает ветку сброса мусора на 380 мс и обновляет OLED-экран.
 */

#include <Arduino.h>
#include <Servo.h>

// --- Пины подключения ---
constexpr uint8_t PIN_OPT_SENSOR   = 2;   // INT0: оптический датчик ячеек LM393
constexpr uint8_t PIN_LASER_TRASH  = 3;   // INT1: лазерный детектор мусора (KY-008)
constexpr uint8_t PIN_BTN_START    = 4;   // Кнопка ПУСК (INPUT_PULLUP, акт. LOW)
constexpr uint8_t PIN_BTN_STOP     = 5;   // Кнопка СТОП (INPUT_PULLUP, акт. LOW)
constexpr uint8_t PIN_BTN_RATE_P   = 6;   // Увеличить скорость +0.5 сем/с
constexpr uint8_t PIN_BTN_RATE_M   = 7;   // Уменьшить скорость -0.5 сем/с
constexpr uint8_t PIN_EN           = 8;   // TMC2209 EN (LOW=вкл, HIGH=выкл + pull-up 10k)
constexpr uint8_t PIN_STEP         = 9;   // TMC2209 STEP
constexpr uint8_t PIN_DIR          = 10;  // TMC2209 DIR
constexpr uint8_t PIN_DIVERT_SERVO = 11;  // Сервопривод заслонки ветки мусора (SG90)
constexpr uint8_t PIN_SYNC_LED     = 12;  // Синхронизационный LED в кадре 60 fps

// --- Параметры кинематики, заслонки и расклинивания ---
constexpr uint16_t STEPS_PER_REV       = 3200; // NEMA 17 (200) * 1/16 микрошаг
constexpr uint16_t ANTI_JAM_REV_STEPS  = 133;  // ~15° реверс для освобождения зажатого зерна
constexpr uint8_t  MAX_ANTI_JAM_TRIES  = 2;    // Максимум 2 попытки до аварийного останова
constexpr uint8_t  CELLS_ON_DISC       = 12;
constexpr uint8_t  SERVO_HOME_DEG      = 15;   // Штатный канал -> стаканчики #1..#8
constexpr uint8_t  SERVO_DIVERT_DEG    = 68;   // Ветка отбраковки -> контейнер мусора
constexpr uint16_t DIVERT_HOLD_MS      = 380;

enum SystemState : uint8_t {
  STATE_IDLE = 0,
  STATE_RUNNING,
  STATE_ANTI_JAM_REVERSE,
  STATE_STOPPED_BY_USER,
  STATE_COMPLETED,
  STATE_FAULT_NO_FEEDBACK
};

// Состояние ВСЕГДА инициализируется в IDLE (никакого автозапуска после сбоя!)
volatile SystemState currentState = STATE_IDLE;

Servo divertServo;

float targetRateSps = 2.0; // Целевая подача, сем/с
uint16_t targetRevs = 10;

// Тайминги шагов
uint32_t stepIntervalUs = 1875;
uint32_t lastStepUs = 0;
uint64_t stepsExecuted = 0;
uint64_t stepsTarget = 0;

// Расклиновка
uint8_t  antiJamAttempts = 0;
uint16_t reverseStepsLeft = 0;

// Переменные оптического энкодера (ISR)
volatile uint32_t optPulseCount = 0;
volatile uint32_t lastOptPulseMs = 0;
volatile uint32_t prevOptPulseMs = 0;
volatile bool newCellEventFlag = false;

// Переменные лазерного датчика мусора (ISR)
volatile uint32_t trashCount = 0;
volatile uint32_t lastTrashMs = 0;
volatile bool trashTriggerFlag = false;

uint32_t syncLedOffMs = 0;
uint32_t servoReturnMs = 0;
uint32_t lastBtnRateMs = 0;
uint32_t lastOledRefreshMs = 0;

// --- Расчёт периода шага и оборотов (Сценарий С5) ---
void recalculateStepTiming() {
  if (targetRateSps < 0.5f) targetRateSps = 0.5f;
  if (targetRateSps > 6.0f) targetRateSps = 6.0f;
  float rpm = (targetRateSps * 60.0f) / (float)CELLS_ON_DISC;
  float stepsPerSec = (rpm / 60.0f) * (float)STEPS_PER_REV;
  stepIntervalUs = (uint32_t)lroundf(1000000.0f / stepsPerSec);
}

void pushOledTelemetry() {
  float rpm = (targetRateSps * 60.0f) / (float)CELLS_ON_DISC;
  Serial.print(F("OLED,state="));
  Serial.print((int)currentState);
  Serial.print(F(",sps="));
  Serial.print(targetRateSps, 1);
  Serial.print(F(",rpm="));
  Serial.print(rpm, 1);
  Serial.print(F(",opt="));
  Serial.print(optPulseCount);
  Serial.print(F(",trash="));
  Serial.println(trashCount);
}

void onOpticalSensorEdge() {
  uint32_t now = millis();
  if (now - lastOptPulseMs > 40) {
    prevOptPulseMs = lastOptPulseMs;
    lastOptPulseMs = now;
    optPulseCount++;
    newCellEventFlag = true;
  }
}

void onLaserTrashEdge() {
  uint32_t now = millis();
  if (now - lastTrashMs > 120) {
    lastTrashMs = now;
    trashCount++;
    trashTriggerFlag = true;
  }
}

void disableDrive(SystemState nextState, const char* reason) {
  digitalWrite(PIN_EN, HIGH); // Аппаратное отключение обмоток
  currentState = nextState;
  divertServo.write(SERVO_HOME_DEG);
  Serial.print(F("STATE,"));
  Serial.println(reason);
  pushOledTelemetry();
}

void startAntiJamReverse() {
  antiJamAttempts++;
  reverseStepsLeft = ANTI_JAM_REV_STEPS;
  digitalWrite(PIN_DIR, LOW); // Реверс -15° для освобождения диска
  currentState = STATE_ANTI_JAM_REVERSE;
  Serial.print(F("WARN,NO_FEEDBACK_ANTI_JAM_ATTEMPT="));
  Serial.println(antiJamAttempts);
  pushOledTelemetry();
}

void startSeries() {
  recalculateStepTiming();
  noInterrupts();
  optPulseCount = 0;
  lastOptPulseMs = millis();
  prevOptPulseMs = lastOptPulseMs;
  newCellEventFlag = false;
  trashTriggerFlag = false;
  interrupts();

  stepsExecuted = 0;
  antiJamAttempts = 0;
  stepsTarget = (uint64_t)targetRevs * (uint64_t)STEPS_PER_REV;
  lastStepUs = micros();

  divertServo.write(SERVO_HOME_DEG);
  digitalWrite(PIN_DIR, HIGH);
  digitalWrite(PIN_EN, LOW); // Включаем драйвер ТОЛЬКО по явной команде
  currentState = STATE_RUNNING;

  Serial.print(F("START,rate_sps="));
  Serial.print(targetRateSps, 2);
  Serial.print(F(",revs="));
  Serial.println(targetRevs);
  pushOledTelemetry();
}

void handleRateButtons() {
  uint32_t now = millis();
  if (now - lastBtnRateMs < 180) return;

  if (digitalRead(PIN_BTN_RATE_P) == LOW) {
    lastBtnRateMs = now;
    targetRateSps += 0.5f;
    recalculateStepTiming();
    pushOledTelemetry();
  } else if (digitalRead(PIN_BTN_RATE_M) == LOW) {
    lastBtnRateMs = now;
    targetRateSps -= 0.5f;
    recalculateStepTiming();
    pushOledTelemetry();
  }
}

void handleSerialCommands() {
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();

  if (cmd == F("START")) {
    if (currentState != STATE_RUNNING) startSeries();
  } else if (cmd == F("STOP")) {
    disableDrive(STATE_STOPPED_BY_USER, "STOPPED_BY_OPERATOR");
  } else if (cmd.startsWith(F("SET_RATE "))) {
    targetRateSps = cmd.substring(9).toFloat();
    recalculateStepTiming();
    Serial.print(F("RATE_UPDATED,sps="));
    Serial.print(targetRateSps, 2);
    Serial.print(F(",step_us="));
    Serial.println(stepIntervalUs);
    pushOledTelemetry();
  } else if (cmd.startsWith(F("SET_REVS "))) {
    int r = cmd.substring(9).toInt();
    if (r >= 1 && r <= 500) targetRevs = (uint16_t)r;
    Serial.print(F("REVS_UPDATED,revs="));
    Serial.println(targetRevs);
  }
}

void setup() {
  // ПЕРВОЙ СТРОКОЙ: принудительно блокируем драйвер (защита С6)
  pinMode(PIN_EN, OUTPUT);
  digitalWrite(PIN_EN, HIGH);

  pinMode(PIN_STEP, OUTPUT);
  pinMode(PIN_DIR, OUTPUT);
  pinMode(PIN_SYNC_LED, OUTPUT);
  digitalWrite(PIN_STEP, LOW);
  digitalWrite(PIN_SYNC_LED, LOW);

  pinMode(PIN_BTN_START, INPUT_PULLUP);
  pinMode(PIN_BTN_STOP, INPUT_PULLUP);
  pinMode(PIN_BTN_RATE_P, INPUT_PULLUP);
  pinMode(PIN_BTN_RATE_M, INPUT_PULLUP);
  pinMode(PIN_OPT_SENSOR, INPUT_PULLUP);
  pinMode(PIN_LASER_TRASH, INPUT_PULLUP);

  divertServo.attach(PIN_DIVERT_SERVO);
  divertServo.write(SERVO_HOME_DEG);

  attachInterrupt(digitalPinToInterrupt(PIN_OPT_SENSOR), onOpticalSensorEdge, FALLING);
  attachInterrupt(digitalPinToInterrupt(PIN_LASER_TRASH), onLaserTrashEdge, FALLING);

  Serial.begin(115200);
  recalculateStepTiming();
  Serial.println(F("BOOT_READY,STATE=IDLE,AUTOSTART=DISABLED"));
  pushOledTelemetry();
}

void loop() {
  handleSerialCommands();
  handleRateButtons();

  // Аппаратная кнопка СТОП имеет безусловный приоритет
  if (digitalRead(PIN_BTN_STOP) == LOW &&
      (currentState == STATE_RUNNING || currentState == STATE_ANTI_JAM_REVERSE)) {
    disableDrive(STATE_STOPPED_BY_USER, "STOPPED_BY_BUTTON");
  }

  // Аппаратная кнопка ПУСК (только из неактивного состояния)
  if (digitalRead(PIN_BTN_START) == LOW &&
      currentState != STATE_RUNNING && currentState != STATE_ANTI_JAM_REVERSE) {
    delay(30);
    if (digitalRead(PIN_BTN_START) == LOW) {
      startSeries();
    }
  }

  if (syncLedOffMs > 0 && millis() >= syncLedOffMs) {
    digitalWrite(PIN_SYNC_LED, LOW);
    syncLedOffMs = 0;
  }

  if (trashTriggerFlag) {
    noInterrupts();
    trashTriggerFlag = false;
    uint32_t tCount = trashCount;
    interrupts();

    divertServo.write(SERVO_DIVERT_DEG);
    servoReturnMs = millis() + DIVERT_HOLD_MS;
    Serial.print(F("EVENT,TRASH_DIVERTED,count="));
    Serial.println(tCount);
    pushOledTelemetry();
  }

  if (servoReturnMs > 0 && millis() >= servoReturnMs) {
    divertServo.write(SERVO_HOME_DEG);
    servoReturnMs = 0;
  }

  if (newCellEventFlag) {
    noInterrupts();
    newCellEventFlag = false;
    uint32_t count = optPulseCount;
    uint32_t tNow = lastOptPulseMs;
    uint32_t tPrev = prevOptPulseMs;
    interrupts();

    antiJamAttempts = 0; // Вращение подтверждено датчиком — сброс счётчика реверсов
    digitalWrite(PIN_SYNC_LED, HIGH);
    syncLedOffMs = millis() + 50;

    uint32_t dtMs = (tNow > tPrev) ? (tNow - tPrev) : 0;
    float actualRpm = (dtMs > 0) ? (60000.0f / ((float)dtMs * CELLS_ON_DISC)) : 0.0f;
    uint8_t cellIndex = ((count - 1) % CELLS_ON_DISC) + 1;

    Serial.print(F("EVENT,cell="));
    Serial.print(cellIndex);
    Serial.print(F(",pulse="));
    Serial.print(count);
    Serial.print(F(",actual_rpm="));
    Serial.println(actualRpm, 2);
  }

  if (millis() - lastOledRefreshMs >= 250) {
    lastOledRefreshMs = millis();
    pushOledTelemetry();
  }

  if (currentState == STATE_ANTI_JAM_REVERSE) {
    uint32_t nowUs = micros();
    if ((uint32_t)(nowUs - lastStepUs) >= 2200) {
      lastStepUs = nowUs;
      digitalWrite(PIN_STEP, HIGH);
      delayMicroseconds(4);
      digitalWrite(PIN_STEP, LOW);
      if (reverseStepsLeft > 0) reverseStepsLeft--;
      if (reverseStepsLeft == 0) {
        noInterrupts();
        lastOptPulseMs = millis();
        interrupts();
        digitalWrite(PIN_DIR, HIGH);
        currentState = STATE_RUNNING;
        Serial.println(F("INFO,ANTI_JAM_RESUME_FORWARD"));
      }
    }
    return;
  }

  if (currentState == STATE_RUNNING) {
    uint32_t nowUs = micros();
    if ((uint32_t)(nowUs - lastStepUs) >= stepIntervalUs) {
      lastStepUs = nowUs;
      digitalWrite(PIN_STEP, HIGH);
      delayMicroseconds(4);
      digitalWrite(PIN_STEP, LOW);
      stepsExecuted++;

      if (stepsExecuted >= stepsTarget) {
        disableDrive(STATE_COMPLETED, "SERIES_COMPLETED");
        return;
      }
    }

    uint32_t expectedCellMs = (uint32_t)(1000.0f / targetRateSps);
    uint32_t feedbackTimeoutMs = (uint32_t)(expectedCellMs * 2.5f) + 400;

    noInterrupts();
    uint32_t elapsedSinceOptMs = millis() - lastOptPulseMs;
    interrupts();

    if (elapsedSinceOptMs > feedbackTimeoutMs) {
      if (antiJamAttempts < MAX_ANTI_JAM_TRIES) {
        startAntiJamReverse();
      } else {
        disableDrive(STATE_FAULT_NO_FEEDBACK, "NO_ROTATION_FEEDBACK");
      }
    }
  }
}
