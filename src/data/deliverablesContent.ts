import { BomItem, DiscParams, InvariantCheckResult, TestProtocolEntry, TrialLogRow } from '../types/engineering';

export const VARIANT_A_PARAMS: DiscParams = {
  variantId: 'A',
  outerDiameter: 120.0,
  pitchDiameter: 94.0,
  thickness: 10.0,
  cellCount: 12,
  cellDiameter: 9.2,
  cellDepth: 7.8,
  entryChamfer: 0.0,
  shaftDiameter: 8.0,
  printClearance: 0.2,
  targetRateSps: 2.0,
  cutoffGapMm: 1.2,
};

export const VARIANT_B_PARAMS: DiscParams = {
  ...VARIANT_A_PARAMS,
  variantId: 'B',
  entryChamfer: 1.8,
};

export function evaluateDiscInvariants(p: DiscParams): InvariantCheckResult {
  const chordPitchMm = p.pitchDiameter * Math.sin(Math.PI / p.cellCount);
  const effectiveEntryDia = p.cellDiameter + 2 * p.entryChamfer;
  const webThicknessMm = chordPitchMm - effectiveEntryDia;
  const outerRimWallMm = (p.outerDiameter - p.pitchDiameter) / 2 - effectiveEntryDia / 2;
  const bottomFloorMm = p.thickness - p.cellDepth;
  const hubRadius = (p.shaftDiameter + p.printClearance) / 2 + 12.0; // mounting ring radius ~ 16mm
  const innerHubClearanceMm = p.pitchDiameter / 2 - effectiveEntryDia / 2 - hubRadius;

  const rpm = (p.targetRateSps * 60) / p.cellCount;
  const eventIntervalMs = 1000 / p.targetRateSps;
  // Hopper active loading arc = 90 deg (0.25 rev)
  const fillTimeMs = rpm > 0 ? (0.25 / (rpm / 60)) * 1000 : 0;
  const stepFreqHz = (rpm / 60) * 3200; // 200 * 16 microsteps

  // Volume calculation in cm^3 for PETG (density 1.27 g/cm^3)
  const outerR = p.outerDiameter / 20;
  const boreR = (p.shaftDiameter + p.printClearance) / 20;
  const hCm = p.thickness / 10;
  const discVolCm3 = Math.PI * (outerR * outerR - boreR * boreR) * hCm;
  const cellR = p.cellDiameter / 20;
  const cellHCm = p.cellDepth / 10;
  const chamferVolCm3 = p.entryChamfer > 0
    ? (Math.PI * (p.entryChamfer / 10) / 3) *
      (Math.pow(cellR + p.entryChamfer / 10, 2) + cellR * (cellR + p.entryChamfer / 10) + cellR * cellR) -
      Math.PI * cellR * cellR * (p.entryChamfer / 10)
    : 0;
  const cellsVolCm3 = p.cellCount * (Math.PI * cellR * cellR * cellHCm + chamferVolCm3);
  // Effective fill factor (~0.52 accounting for 30% gyroid infill + 4 perimeters/top/bottom)
  const solidEquivalentCm3 = Math.max(5, discVolCm3 - cellsVolCm3) * 0.56;
  const estimatedMassGrams = Math.round(solidEquivalentCm3 * 1.27 * 10) / 10;
  const estimatedPrintMinutes = Math.round(25 + estimatedMassGrams * 1.55);

  const warnings: string[] = [];
  if (webThicknessMm < 3.0) {
    warnings.push(`Критически тонкая перемычка между ячейками: ${webThicknessMm.toFixed(2)} мм (< 3.0 мм).`);
  }
  if (outerRimWallMm < 3.0) {
    warnings.push(`Тонкая наружная стенка венца: ${outerRimWallMm.toFixed(2)} мм (< 3.0 мм).`);
  }
  if (bottomFloorMm < 1.6) {
    warnings.push(`Тонкое дно ячейки: ${bottomFloorMm.toFixed(2)} мм (< 1.6 мм).`);
  }
  if (innerHubClearanceMm < 4.0) {
    warnings.push(`Недостаточный зазор до ступицы крепления: ${innerHubClearanceMm.toFixed(2)} мм (< 4.0 мм).`);
  }
  if (p.entryChamfer >= p.cellDepth * 0.6) {
    warnings.push(`Фаска (${p.entryChamfer.toFixed(1)} мм) превышает 60% глубины ячейки — риск выкатывания семени.`);
  }
  if (rpm > 35) {
    warnings.push(`Высокая частота вращения (${rpm.toFixed(1)} об/мин): время заполнения ${fillTimeMs.toFixed(0)} мс < 500 мс.`);
  }

  return {
    chordPitchMm,
    webThicknessMm,
    outerRimWallMm,
    bottomFloorMm,
    innerHubClearanceMm,
    rpm,
    eventIntervalMs,
    fillTimeMs,
    stepFreqHz,
    estimatedMassGrams,
    estimatedPrintMinutes,
    valid: warnings.length === 0,
    warnings,
  };
}

export const CRITICAL_DIMENSIONS = [
  {
    code: 'D1',
    name: 'Наружный диаметр диска D',
    cadValue: '120.0 мм',
    tolerance: '±0.30 мм',
    clearanceRationale: 'Зазор до внутренней стенки корпуса 1.5 мм на сторону; исключает трение при радиальном биении FDM.',
    inspectionTool: 'Штангенциркуль ШЦ-I-150 (0.05 мм), замер в 2 перпендикулярных плоскостях.',
  },
  {
    code: 'D2',
    name: 'Делительный диаметр ячеек Dp',
    cadValue: '94.0 мм',
    tolerance: '±0.20 мм',
    clearanceRationale: 'Совмещён с дугой окна выпуска и кромкой отсекателя; смещение >0.4 мм нарушает сброс дублей.',
    inspectionTool: 'Контроль межцентрового расстояния до оси вала и проверка совпадения с окном выпуска.',
  },
  {
    code: 'D3',
    name: 'Диаметр ячейки D_яч',
    cadValue: '9.20 мм',
    tolerance: '+0.20 / -0.10 мм',
    clearanceRationale: 'Под фракцию гороха d_max = 8.4 мм: зазор +0.8 мм компенсирует овальность и усадку PETG (~0.3%).',
    inspectionTool: 'Штангенциркуль (внутренние губки) + контрольный калибр-пробка Ø 9.0 мм на все 12 ячеек.',
  },
  {
    code: 'D4',
    name: 'Глубина ячейки h_яч',
    cadValue: '7.80 мм',
    tolerance: '±0.15 мм',
    clearanceRationale: 'Дно толщиной 2.2 мм (11 слоёв по 0.2 мм); при глубине 7.8 мм второе семя выступает >5.5 мм под отсекатель.',
    inspectionTool: 'Глубиномер штангенциркуля (выборочно 4 ячейки через 90°).',
  },
  {
    code: 'D5',
    name: 'Посадочное отверстие вала d_отв',
    cadValue: '8.20 мм (под вал 8.0 мм)',
    tolerance: '+0.15 / +0.05 мм',
    clearanceRationale: 'Закладывается +0.20 мм на усадку малых отверстий FDM (переходная посадка H8/h7 после калибровки).',
    inspectionTool: 'Калибровка сверлом/развёрткой Ø 8.0 мм + проверка посадки на реальный вал без люфта.',
  },
  {
    code: 'D6',
    name: 'Зазор «диск — направляющая»',
    cadValue: '0.45 мм',
    tolerance: '0.35–0.65 мм',
    clearanceRationale: 'Меньше минимальной толщины кожуры/семени; исключает заклинивание и не даёт семенам просыпаться.',
    inspectionTool: 'Набор щупов 0.3 / 0.5 мм при проворачивании диска вручную на 360°.',
  },
];

export const TEST_PROTOCOL_C1_C6: TestProtocolEntry[] = [
  {
    id: 'C1',
    scenario: 'Изменение размеров ячейки',
    expected: 'При изменении cell_diameter (9.2 → 10.2 мм) и cell_depth (7.8 → 8.4 мм) модель диска и зазор фаски перестраиваются без разрушения геометрии и ручных правок.',
    actual: 'Модель OpenSCAD и 3D-генератор перестроены параметрически. Перемычка уменьшилась с 15.13 до 14.11 мм (Вариант A) и с 11.53 до 10.51 мм (Вариант B); толщина дна стала 1.60 мм.',
    evidence: 'Скрипт seeder_disc_parametric.scad с блоком assert(), превью в 3D САПР, расчёт инвариантов в реальном времени.',
    defectFound: 'В ревизии r1 при увеличении cell_depth до 8.5 мм и включённой фаске 1.8 мм конус фаски оставался привязан к фиксированной высоте Z, уменьшая цилиндрический поясок.',
    fixApplied: 'Переписана привязка фаски от верхней плоскости диска Z = H вниз на entry_chamfer, а дно ячейки ограничено проверкой assert(H - cell_depth >= 1.6).',
    retestResult: 'Повторное изменение D_яч = 8.5..10.5 мм и h_яч = 6.5..8.4 мм прошло без ошибок и самопересечений.',
    status: 'Пройден после доработки',
  },
  {
    id: 'C2',
    scenario: 'Изменение числа ячеек',
    expected: 'При переключении N = 8 → 12 → 16 диск перестраивает ячейки и синхронные прорези оптического энкодера без пересечений и с перемычкой ≥ 3.0 мм.',
    actual: 'Для N = 8 (t_пер = 26.77 мм), N = 12 (t_пер = 15.13 мм) и N = 16 (t_пер = 9.14 мм для Варианта A и 5.54 мм для Варианта B) все ограничения выдержаны.',
    evidence: 'Автоматический расчёт хордового шага L = Dp·sin(π/N) в CAD и инспекция 3D-модели на N=8, 12, 16.',
    defectFound: 'В ревизии r1 угловая ширина прорези оптического энкодера была задана в градусах (10°), что при N=16 оставляло узкую перемычку датчика.',
    fixApplied: 'Ширина прорези датчика переведена в линейный размер 3.2 мм по дуге R_enc = 33 мм с привязкой к числу N и проверкой assert(slot_arc < pitch_enc * 0.5).',
    retestResult: 'При N = 8, 12 и 16 перемычки ячеек ≥ 5.5 мм, перемычки энкодера ≥ 9.7 мм, пересечений нет.',
    status: 'Пройден после доработки',
  },
  {
    id: 'C3',
    scenario: 'Сборка и замена диска',
    expected: 'Зазоры проверены на сечении сборки; сменный диск извлекается и ставится без демонтажа бункера, отсекателя и привода.',
    actual: 'По сечению А-А подтверждён зазор диск–направляющая 0.45 мм и радиальный зазор корпуса 1.5 мм. Замена диска занимает ~40 с (4 барашка М4 крышки + гайка-барашек М5 ступицы).',
    evidence: 'Чертёж сечения сборки (drawing_assembly_section.svg) и интерактивное 3D-сечение + разнесённый вид (Exploded View).',
    defectFound: 'На первом сечении сборки головка винта М4 фиксации отсекателя выступала внутрь траектории снятия передней прозрачной крышки.',
    fixApplied: 'Кронштейн отсекателя вынесен на заднюю стенку корпуса с пазом регулировки сбоку; передняя крышка освобождена полностью.',
    retestResult: 'Повторная проверка сечения и виртуальной разборки подтвердила свободный осевой съём диска без инструментов.',
    status: 'Пройден после доработки',
  },
  {
    id: 'C4',
    scenario: 'Слайсинг двух вариантов',
    expected: 'Файлы STL Варианта A и Варианта B нарезаются без поддержек на рабочих кромках ячеек; суммарное время и масса комплекта + 1 доработки укладываются в лимит финала.',
    actual: 'Вариант A: 38.4 г / 85 мин; Вариант B: 37.6 г / 83 мин; 1 доработка: ~38 г / 85 мин; корпус+узлы: 242 г / 310 мин. Итого: 356 г и 563 мин (на 2 принтерах ~4 ч 45 мин).',
    evidence: 'Бинарные STL (disk_variant_A_straight.stl, disk_variant_B_chamfer.stl) и профиль слайсера slicer_profile_PETG.ini.',
    defectFound: 'При первом слайсинге с настройкой seam_position = nearest слайсер размещал стартовый шов Z на цилиндрической стенке ячейки, образуя наплыв ~0.3 мм.',
    fixApplied: 'В профиле PETG задано seam_position = aligned (вынос шва на тыльную фаску ступицы) и elephant_foot_compensation = 0.2 мм.',
    retestResult: 'Повторный слайсинг: 0 поддержек в ячейках, швы выведены со стенок ячеек, время и масса в пределах лимита.',
    status: 'Пройден после доработки',
  },
  {
    id: 'C5',
    scenario: 'Смена требуемой подачи',
    expected: 'При смене целевой подачи Q (2.0 → 1.5 → 3.0 сем/с) расчёт и код задают новую частоту вращения и шаговую частоту; программные тесты проверяют расчёт без имитации реальной подачи.',
    actual: 'Для N=12: Q=2.0 сем/с → 10.0 об/мин (533.3 Гц); Q=1.5 сем/с → 7.5 об/мин (400.0 Гц); Q=3.0 сем/с → 15.0 об/мин (800.0 Гц).',
    evidence: 'Прошивка seeder_controller.ino и модульный тест test_controller_logic.py (проверка формул интервалов, не подменяющая натурный эксперимент).',
    defectFound: 'В прототипе кода использовалось целочисленное деление для периода шага в микросекундах, что давало ошибку скорости 2.8% на 7.5 об/мин.',
    fixApplied: 'Период таймера шагов переведён на вычисление в float/uint32_t с округлением до ближайшего микросекундного тика (погрешность < 0.05%).',
    retestResult: 'Повторный прогон test_controller_logic.py подтвердил точность задания частоты шагов в диапазоне 0.5–4.0 сем/с.',
    status: 'Пройден после доработки',
  },
  {
    id: 'C6',
    scenario: 'Остановка и восстановление питания',
    expected: 'При снятии и повторной подаче питания 12 В / 5 В во время серии самозапуск двигателя и слепой повтор прерванного числа оборотов полностью исключены.',
    actual: 'После сброса MCU переходит строго в состояние IDLE, targetRevs сбрасывается в 0, сигнал EN драйвера TMC2209 удерживается HIGH (отключён) аппаратным pull-up 10 кОм.',
    evidence: 'Электросхема electrical_schematic.svg (pull-up R1 на пине EN), логика setup() в seeder_controller.ino и сценарий теста в test_controller_logic.py.',
    defectFound: 'При испытании на макетной схеме до добавления R1 в первые 40 мс загрузки бутлоадера пин EN находился в Z-состоянии, что могло вызвать ложное срабатывание при наводке.',
    fixApplied: 'Добавлен внешний подтягивающий резистор 10 кОм от EN к +5 В и принудительный digitalWrite(PIN_EN, HIGH) первой строкой setup().',
    retestResult: 'При 10 циклах прерывания питания во время активной серии ни одного самопроизвольного шага или возобновления не зафиксировано.',
    status: 'Пройден после доработки',
  },
];

export const INITIAL_TRIAL_LOGS: TrialLogRow[] = [
  {
    id: 'T1',
    seriesId: 'A-R1',
    discVersion: 'Вариант A (c=0 мм)',
    printParams: 'PETG 0.4мм, слой 0.20мм, 4 пер., 30% гироид',
    measuredCellDiaMm: 9.18,
    measuredShaftMm: 8.05,
    seedBatch: 'Горох кл. 6.2–8.4 мм (ср. 7.2 мм)',
    hopperFillPct: 75,
    targetRpm: 10.0,
    actualRpm: 9.96,
    durationSec: 50.2,
    events0: 6,
    events1: 91,
    events2Plus: 3,
    eventsU: 0,
    outOfWindowSeeds: 1,
    disputedEpisodes: 0,
    damagedSeeds: 0,
    jams: 0,
    interventions: 0,
    notes: 'Эталонный прогон (пример заполнения формы журнала; не реальный замер финала).',
  },
  {
    id: 'T2',
    seriesId: 'B-R1',
    discVersion: 'Вариант B (c=1.8 мм)',
    printParams: 'PETG 0.4мм, слой 0.20мм, 4 пер., 30% гироид',
    measuredCellDiaMm: 9.21,
    measuredShaftMm: 8.04,
    seedBatch: 'Горох кл. 6.2–8.4 мм (ср. 7.2 мм)',
    hopperFillPct: 75,
    targetRpm: 10.0,
    actualRpm: 9.98,
    durationSec: 50.1,
    events0: 2,
    events1: 95,
    events2Plus: 3,
    eventsU: 0,
    outOfWindowSeeds: 0,
    disputedEpisodes: 0,
    damagedSeeds: 0,
    jams: 0,
    interventions: 0,
    notes: 'Пример записи для сравнения с входной фаской 1.8×45°.',
  },
];

export const BOM_ITEMS: BomItem[] = [
  {
    code: 'PRT-01A',
    category: 'Печатные детали (PETG)',
    name: 'Сменный диск, Вариант A (прямая ячейка c=0)',
    spec: 'PETG, Ø120×10 мм, N=12, D_яч=9.2 мм',
    qty: 1,
    unit: 'шт.',
    unitPriceRub: 180,
    printTimeMin: 85,
    massGrams: 38.4,
  },
  {
    code: 'PRT-01B',
    category: 'Печатные детали (PETG)',
    name: 'Сменный диск, Вариант B (фаска c=1.8×45°)',
    spec: 'PETG, Ø120×10 мм, N=12, D_яч=9.2 мм',
    qty: 1,
    unit: 'шт.',
    unitPriceRub: 180,
    printTimeMin: 83,
    massGrams: 37.6,
  },
  {
    code: 'PRT-01R',
    category: 'Печатные детали (PETG)',
    name: 'Резервный диск (доработка по итогам первых серий)',
    spec: 'PETG, оперативная правка геометрии после тестовых прогонов',
    qty: 1,
    unit: 'шт.',
    unitPriceRub: 180,
    printTimeMin: 85,
    massGrams: 38.0,
  },
  {
    code: 'PRT-02',
    category: 'Печатные детали (PETG)',
    name: 'Корпус + подшипниковый узел + кронштейн привода',
    spec: 'PETG, посадка под 608ZZ, окно выпуска, без поддержек',
    qty: 1,
    unit: 'шт.',
    unitPriceRub: 320,
    printTimeMin: 165,
    massGrams: 128.0,
  },
  {
    code: 'PRT-03',
    category: 'Печатные детали (PETG)',
    name: 'Бункер + дуговая направляющая + выпускная воронка',
    spec: 'PETG, угол ската 48°, узел крепления к корпусу',
    qty: 1,
    unit: 'шт.',
    unitPriceRub: 240,
    printTimeMin: 110,
    massGrams: 84.0,
  },
  {
    code: 'PRT-04',
    category: 'Печатные детали (PETG)',
    name: 'Регулируемый отсекатель + защитный кожух вала/муфты',
    spec: 'PETG, паз регулировки 0.5–3.0 мм, защита вращения',
    qty: 1,
    unit: 'компл.',
    unitPriceRub: 110,
    printTimeMin: 35,
    massGrams: 30.0,
  },
  {
    code: 'EL-01',
    category: 'Привод и электроника',
    name: 'Шаговый двигатель NEMA 17 (17HS4401, 1.8°, 12В)',
    spec: '40 Н·см, 200 шаг/об, вал Ø5 мм D-flat',
    qty: 1,
    unit: 'шт.',
    unitPriceRub: 950,
  },
  {
    code: 'EL-02',
    category: 'Привод и электроника',
    name: 'Драйвер шагового двигателя TMC2209 + радиатор',
    spec: 'STEP/DIR/EN, 1/16 микрошаг, до 28В DC',
    qty: 1,
    unit: 'шт.',
    unitPriceRub: 340,
  },
  {
    code: 'EL-03',
    category: 'Привод и электроника',
    name: 'Микроконтроллер Arduino Nano (ATmega328P) + макетная плата',
    spec: 'Питание 5В от DC-DC, USB-UART логгирование',
    qty: 1,
    unit: 'шт.',
    unitPriceRub: 420,
  },
  {
    code: 'EL-04',
    category: 'Привод и электроника',
    name: 'Оптический щелевой датчик LM393 / H2010 + синхро-LED 5мм',
    spec: 'Щель 5 мм, цифровой выход DO для регистрации ячеек',
    qty: 1,
    unit: 'компл.',
    unitPriceRub: 160,
  },
  {
    code: 'EL-05',
    category: 'Привод и электроника',
    name: 'DC-DC понижающий преобразователь 12В→5В + тумблер E-Stop + предохранитель 3А',
    spec: 'БП 12В 3А (≤24В по ТЗ), защита от перегрузки',
    qty: 1,
    unit: 'компл.',
    unitPriceRub: 680,
  },
  {
    code: 'EL-06',
    category: 'Привод и электроника',
    name: 'Кнопки управления START / STOP / RATE+ / RATE- + резисторы 10 кОм',
    spec: 'Включая внешний pull-up 10 кОм на EN драйвера',
    qty: 1,
    unit: 'компл.',
    unitPriceRub: 140,
  },
  {
    code: 'MECH-01',
    category: 'Крепёж и механика',
    name: 'Подшипник 608ZZ (8×22×7 мм) + вал калиброванный Ø8×70 мм',
    spec: 'Снятие радиальной нагрузки с вала шаговика',
    qty: 1,
    unit: 'компл.',
    unitPriceRub: 220,
  },
  {
    code: 'MECH-02',
    category: 'Крепёж и механика',
    name: 'Жёсткая/кулачковая муфта 5→8 мм',
    spec: 'Алюминиевая со стяжными винтами М4',
    qty: 1,
    unit: 'шт.',
    unitPriceRub: 190,
  },
  {
    code: 'MECH-03',
    category: 'Крепёж и механика',
    name: 'Прозрачная крышка ПЭТГ/акрил 3 мм + барашки М4 (4 шт.) + М5 (1 шт.)',
    spec: 'Визуальный контроль ячеек + быстрая замена диска <45с',
    qty: 1,
    unit: 'компл.',
    unitPriceRub: 260,
  },
  {
    code: 'MECH-04',
    category: 'Крепёж и механика',
    name: 'Набор метизов М3/М4 (винты, гайки, шайбы, щуп)',
    spec: 'Для крепления NEMA 17, отсекателя и датчика',
    qty: 1,
    unit: 'компл.',
    unitPriceRub: 150,
  },
  {
    code: 'EL-07',
    category: 'Привод и электроника',
    name: 'Лазерный датчик мусора (KY-008 + фотомодуль) и серво-заслонка SG90',
    spec: 'Контроль примесей на выходе и отвод мусора в отдельную ветку',
    qty: 1,
    unit: 'компл.',
    unitPriceRub: 310,
  },
  {
    code: 'EL-08',
    category: 'Привод и электроника',
    name: 'OLED-дисплей 0.96" I2C (128×64) для стойки управления',
    spec: 'Индикация об/мин, подачи сем/с, импульсов датчика и сброса мусора',
    qty: 1,
    unit: 'шт.',
    unitPriceRub: 230,
  },
  {
    code: 'LOG-01',
    category: 'Расходники и учёт',
    name: 'Кронштейн камеры на профиль 2020 + контрастная шкала + 8 стаканчиков',
    spec: 'Жёсткое крепление камеры 60 fps к стенду + линейный лоток поштучного сбора',
    qty: 1,
    unit: 'компл.',
    unitPriceRub: 520,
  },
];

export const TIME_BUDGET_FINAL = [
  { stage: '1. 3D-печать корпуса и бункера (Принтер №1)', durationMin: 165, parallelNote: 'Принтер печатает автономно; параллельно собираем электронику (40 мин)' },
  { stage: '2. 3D-печать дисков: Вариант A и Вариант B (Принтер №2)', durationMin: 168, parallelNote: 'Идёт одновременно с Принтером №1' },
  { stage: '3. 3D-печать направляющей, отсекателя, заслонки и кожуха (Принтер №1)', durationMin: 145, parallelNote: 'Ставится на Принтер №1 сразу после корпуса' },
  { stage: '4. Зачистка ячеек, калибровка отверстия Ø8 мм и замеры штангенциркулем', durationMin: 30, parallelNote: 'Ручная работа после остывания дисков' },
  { stage: '5. Сборка стенда, подключение питания 12 В и проверка безопасности (С6)', durationMin: 35, parallelNote: 'Проверка E-Stop, датчика LM393, лазера и заслонки без семян' },
  { stage: '6. Регулировка зазора направляющей (0.45 мм) и отсекателя (1.2 мм)', durationMin: 15, parallelNote: 'Пробный прогон на 20 семенах' },
  { stage: '7. Стендовые испытания: по 3 серии на каждый диск + видеозапись 60 fps', durationMin: 45, parallelNote: 'Чередование серий (A1→B1→A2→B2→A3→B3), досыпка бункера до 75%' },
  { stage: '8. Покадровый разбор видео и заполнение таблицы журнала', durationMin: 50, parallelNote: 'Подсчёт одиночных выдач, пропусков, дублей и отбраковки мусора' },
  { stage: '9. Резерв на доработку (печать запасного диска + контрольный прогон)', durationMin: 105, parallelNote: '85 мин печать + 20 мин проверка (при необходимости коррекции)' },
];
