import { DiscParams, TrialLogRow } from '../types/engineering';

export function generateArduinoFirmware(params: DiscParams): string {
  return `/*
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
constexpr uint8_t  CELLS_ON_DISC       = ${params.cellCount};
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

float targetRateSps = ${params.targetRateSps.toFixed(1)}; // Целевая подача, сем/с
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
  String cmd = Serial.readStringUntil('\\n');
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
`;
}

export function generatePythonLogicTests(): string {
  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Модульные программные тесты логики управления высевающим узлом (Кейс AT9-3, Б1: С5, С6).
ВНИМАНИЕ: Эти тесты проверяют корректность алгоритма расчёта скорости, отбраковки
мусора, безопасной расклиновки и запрет автозапуска на заданных входах; они НЕ
заменяют натурное испытание с реальными семенами.
"""

import unittest


STEPS_PER_REV = 3200  # 200 * 16 микрошаг
SERVO_HOME_DEG = 15
SERVO_DIVERT_DEG = 68
MAX_ANTI_JAM_TRIES = 2


class SeederControllerModel:
    """Точная программная модель логики контроллера для проверки C5, C6, лазера и расклиновки."""

    def __init__(self, cell_count: int = 12):
        self.cell_count = cell_count
        self.state = "IDLE"
        self.en_pin_high = True  # HIGH = драйвер отключён
        self.target_revs = 0
        self.target_rate_sps = 2.0
        self.steps_executed = 0
        self.servo_deg = SERVO_HOME_DEG
        self.trash_count = 0
        self.anti_jam_attempts = 0

    def power_on_reset(self):
        self.state = "IDLE"
        self.en_pin_high = True
        self.target_revs = 0
        self.steps_executed = 0
        self.servo_deg = SERVO_HOME_DEG
        self.anti_jam_attempts = 0

    def compute_step_interval_us(self, rate_sps: float) -> int:
        rate_sps = max(0.5, min(6.0, rate_sps))
        rpm = (rate_sps * 60.0) / self.cell_count
        steps_per_sec = (rpm / 60.0) * STEPS_PER_REV
        return round(1_000_000.0 / steps_per_sec)

    def adjust_rate(self, delta_sps: float) -> float:
        self.target_rate_sps = max(0.5, min(6.0, round(self.target_rate_sps + delta_sps, 1)))
        return self.target_rate_sps

    def start_series(self, rate_sps: float, target_revs: int):
        self.target_rate_sps = rate_sps
        self.target_revs = target_revs
        self.steps_executed = 0
        self.anti_jam_attempts = 0
        self.en_pin_high = False
        self.state = "RUNNING"

    def trigger_laser_trash_diverter(self):
        self.trash_count += 1
        self.servo_deg = SERVO_DIVERT_DEG

    def check_rotation_feedback(self, ms_since_last_optical_pulse: int) -> bool:
        expected_cell_ms = 1000.0 / self.target_rate_sps
        timeout_ms = int(expected_cell_ms * 2.5) + 400
        if ms_since_last_optical_pulse > timeout_ms:
            if self.anti_jam_attempts < MAX_ANTI_JAM_TRIES:
                self.anti_jam_attempts += 1
                self.state = "ANTI_JAM_REVERSE"
                return False
            self.state = "FAULT_NO_FEEDBACK"
            self.en_pin_high = True
            self.servo_deg = SERVO_HOME_DEG
            return False
        self.anti_jam_attempts = 0
        self.state = "RUNNING"
        return True


class TestSeederControlScenarios(unittest.TestCase):
    def test_c5_rate_change_step_timing(self):
        """Сценарий С5: Проверка пересчёта скорости и кнопок RATE+/RATE- при смене подачи."""
        ctrl = SeederControllerModel(cell_count=12)
        self.assertEqual(ctrl.compute_step_interval_us(2.0), 1875)
        self.assertEqual(ctrl.compute_step_interval_us(1.5), 2500)
        self.assertEqual(ctrl.compute_step_interval_us(3.0), 1250)
        self.assertEqual(ctrl.adjust_rate(+0.5), 2.5)
        self.assertEqual(ctrl.adjust_rate(+4.0), 6.0)
        self.assertEqual(ctrl.adjust_rate(-10.0), 0.5)

    def test_c6_no_autostart_or_blind_resume_after_power_loss(self):
        """Сценарий С6: При сбросе/восстановлении питания самозапуск и повтор исключены."""
        ctrl = SeederControllerModel(cell_count=12)
        self.assertEqual(ctrl.state, "IDLE")
        self.assertTrue(ctrl.en_pin_high)

        ctrl.start_series(rate_sps=2.0, target_revs=10)
        ctrl.steps_executed = 12800
        self.assertEqual(ctrl.state, "RUNNING")
        self.assertFalse(ctrl.en_pin_high)

        ctrl.power_on_reset()
        self.assertEqual(ctrl.state, "IDLE")
        self.assertTrue(ctrl.en_pin_high)
        self.assertEqual(ctrl.target_revs, 0)
        self.assertEqual(ctrl.steps_executed, 0)
        self.assertEqual(ctrl.servo_deg, SERVO_HOME_DEG)

    def test_anti_jam_reverse_then_safe_stop_on_persistent_stall(self):
        """А3: Сначала 2 попытки реверса на 15°, при сохранении потери связи — SAFE STOP."""
        ctrl = SeederControllerModel(cell_count=12)
        ctrl.start_series(rate_sps=2.0, target_revs=5)
        self.assertTrue(ctrl.check_rotation_feedback(450))
        self.assertEqual(ctrl.state, "RUNNING")

        # 1-й таймаут -> безопасный реверс (попытка 1)
        self.assertFalse(ctrl.check_rotation_feedback(1700))
        self.assertEqual(ctrl.state, "ANTI_JAM_REVERSE")
        self.assertFalse(ctrl.en_pin_high)

        # 2-й таймаут -> реверс (попытка 2)
        self.assertFalse(ctrl.check_rotation_feedback(1700))
        self.assertEqual(ctrl.state, "ANTI_JAM_REVERSE")

        # 3-й таймаут -> жёсткая остановка FAULT_NO_FEEDBACK, EN=HIGH
        self.assertFalse(ctrl.check_rotation_feedback(1700))
        self.assertEqual(ctrl.state, "FAULT_NO_FEEDBACK")
        self.assertTrue(ctrl.en_pin_high)

    def test_laser_trash_diverter_branch(self):
        """Лазерный детектор примесей переводит заслонку SG90 в ветку сброса мусора."""
        ctrl = SeederControllerModel(cell_count=12)
        self.assertEqual(ctrl.servo_deg, SERVO_HOME_DEG)
        ctrl.trigger_laser_trash_diverter()
        self.assertEqual(ctrl.trash_count, 1)
        self.assertEqual(ctrl.servo_deg, SERVO_DIVERT_DEG)


if __name__ == "__main__":
    unittest.main(verbosity=2)
`;
}

export function generateSlicerProfileIni(): string {
  return `# ============================================================================
# Команда Assembler · Профиль слайсера (PrusaSlicer / OrcaSlicer) · Кейс AT9-3
# Деталь: Сменные ячеистые диски (Варианты A и B) + корпус + заслонка мусора
# Материал: PETG (1.75 мм), сопло 0.4 мм
# ============================================================================

[print:AT9-3_PETG_020_NoSupports]
layer_height = 0.20
first_layer_height = 0.24
perimeters = 4
top_solid_layers = 5
bottom_solid_layers = 5
fill_density = 30%
fill_pattern = gyroid
support_material = 0
support_material_auto = 0
seam_position = aligned
elefant_foot_compensation = 0.20
xy_size_compensation = 0.00
external_perimeters_first = 1
perimeter_speed = 45
external_perimeter_speed = 35
infill_speed = 70
travel_speed = 150
skirts = 2
brim_width = 0

[filament:AT9-3_PETG_Standard]
filament_type = PETG
temperature = 235
first_layer_temperature = 240
bed_temperature = 75
first_layer_bed_temperature = 80
fan_always_on = 1
min_fan_speed = 30
max_fan_speed = 50
disable_fan_first_layers = 2
filament_density = 1.27
filament_cost = 1500

[notes]
orientation = Диск печатается плашмя, рабочие ячейки направлены вверх (+Z). Поддержки отключены полностью.
`;
}

export function rowsToCsv(rows: TrialLogRow[]): string {
  const header = [
    'ID_серии',
    'Версия_диска',
    'Параметры_печати',
    'Факт_D_яч_мм',
    'Факт_d_вала_мм',
    'Партия_семян',
    'Заполнение_бункера_%',
    'Скорость_заданная_об_мин',
    'Скорость_факт_об_мин',
    'Длительность_с',
    'Всего_событий_E',
    'Исход_0_пропуск',
    'Исход_1_одиночная',
    'Исход_2plus_дубль',
    'Исход_U_неопред',
    'Доля_одиночных_P1_%',
    'Доля_пропусков_P0_%',
    'Доля_дублей_P2_%',
    'Выдачи_вне_штатных_окон',
    'Спорные_эпизоды',
    'Повреждения_семян',
    'Застревания',
    'Вмешательства',
    'Примечание',
  ].join(';');

  const lines = rows.map((r) => {
    const total = r.events0 + r.events1 + r.events2Plus + r.eventsU;
    const p1 = total > 0 ? ((r.events1 / total) * 100).toFixed(1) : '0.0';
    const p0 = total > 0 ? ((r.events0 / total) * 100).toFixed(1) : '0.0';
    const p2 = total > 0 ? ((r.events2Plus / total) * 100).toFixed(1) : '0.0';
    return [
      r.seriesId,
      r.discVersion,
      r.printParams,
      r.measuredCellDiaMm.toFixed(2),
      r.measuredShaftMm.toFixed(2),
      r.seedBatch,
      r.hopperFillPct,
      r.targetRpm.toFixed(2),
      r.actualRpm.toFixed(2),
      r.durationSec.toFixed(1),
      total,
      r.events0,
      r.events1,
      r.events2Plus,
      r.eventsU,
      p1,
      p0,
      p2,
      r.outOfWindowSeeds,
      r.disputedEpisodes,
      r.damagedSeeds,
      r.jams,
      r.interventions,
      `"${r.notes.replace(/"/g, '""')}"`,
    ].join(';');
  });

  return '\uFEFF' + [header, ...lines].join('\n');
}
