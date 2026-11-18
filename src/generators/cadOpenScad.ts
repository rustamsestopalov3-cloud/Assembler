import { DiscParams } from '../types/engineering';

export function generateDiscOpenScad(params: DiscParams): string {
  const variantLabel =
    params.variantId === 'A'
      ? 'Variant_A_Straight_Cell'
      : params.variantId === 'B'
        ? 'Variant_B_Chamfered_Cell'
        : 'Variant_Custom_Parametric';

  return `// ============================================================================
// Олимпиада Иннагрика 2026 · Профиль «Агротех» · Кейс AT9-3 (Задание 2, A1)
// Параметрическая CAD-модель сменного ячеистого диска дозатора семян (горох)
// Конфигурация: ${variantLabel}
// ============================================================================

$fn = 96;

// --- Основные параметры (мм) ---
outer_diameter   = ${params.outerDiameter.toFixed(2)};   // Наружный диаметр диска D
pitch_diameter   = ${params.pitchDiameter.toFixed(2)};    // Делительный диаметр центров ячеек Dp
disc_thickness   = ${params.thickness.toFixed(2)};    // Толщина диска H
cell_count       = ${params.cellCount};       // Число ячеек N (для сравнения: 8, 12, 16)
cell_diameter    = ${params.cellDiameter.toFixed(2)};     // Диаметр ячейки D_яч (под горох d_max=8.4 мм)
cell_depth       = ${params.cellDepth.toFixed(2)};     // Глубина ячейки h_яч
entry_chamfer    = ${params.entryChamfer.toFixed(2)};     // ОСНОВНОЙ ИЗМЕНЯЕМЫЙ ПАРАМЕТР: входная фаска (0 = А, 1.8 = B)

// --- Посадка на вал и крепление (с учётом усадки PETG) ---
shaft_nominal    = ${params.shaftDiameter.toFixed(2)};     // Номинал вала (мм)
print_clearance  = ${params.printClearance.toFixed(2)};     // Печатный зазор (компенсация усадки FDM)
bore_diameter    = shaft_nominal + print_clearance;
d_flat_depth     = 0.80;     // Глубина лыски D-вала
mount_pcd        = 24.0;     // Диаметр центров 3 крепёжных отверстий М3 / штифтов
mount_hole_d     = 3.30;     // Под винт M3 / направляющий штифт

// --- Оптический энкодер (подтверждение фактического вращения, A3) ---
encoder_pcd      = 54.0;     // Делительный диаметр прорезей датчика (R = 27 мм)
encoder_slot_w   = 3.20;     // Ширина прорези (мм)
encoder_slot_l   = 6.00;     // Радиальная длина прорези (мм)

// --- Расчёт и автоматическая проверка геометрических инвариантов (C1, C2) ---
chord_pitch      = pitch_diameter * sin(180 / cell_count);
eff_entry_dia    = cell_diameter + 2 * entry_chamfer;
web_thickness    = chord_pitch - eff_entry_dia;
outer_wall       = (outer_diameter - pitch_diameter)/2 - eff_entry_dia/2;
bottom_floor     = disc_thickness - cell_depth;
enc_chord_pitch  = encoder_pcd * sin(180 / cell_count);
enc_web          = enc_chord_pitch - encoder_slot_w;

assert(web_thickness >= 3.0, str("Ошибка С1/С2: перемычка между ячейками < 3.0 мм (", web_thickness, ")"));
assert(outer_wall >= 3.0, str("Ошибка С1: наружная стенка венца < 3.0 мм (", outer_wall, ")"));
assert(bottom_floor >= 1.6, str("Ошибка С1: толщина дна ячейки < 1.6 мм (", bottom_floor, ")"));
assert(entry_chamfer < cell_depth * 0.6, "Ошибка С1: фаска превышает 60% глубины ячейки");
assert(enc_web >= 3.0, str("Ошибка С2: перемычка окна энкодера < 3.0 мм (", enc_web, ")"));

echo("=== ПРОВЕРКА ИНВАРИАНТОВ ДИСКА ===");
echo("Хордовый шаг ячеек (мм):", chord_pitch);
echo("Перемычка между ячейками (мм):", web_thickness);
echo("Толщина дна под ячейкой (мм):", bottom_floor);
echo("Наружная стенка венца (мм):", outer_wall);

module d_shaft_bore(h) {
    difference() {
        cylinder(d = bore_diameter, h = h);
        translate([bore_diameter/2 - d_flat_depth, -bore_diameter, -0.5])
            cube([bore_diameter, bore_diameter * 2, h + 1]);
    }
}

module seed_cell() {
    r_cell = cell_diameter / 2;
    r_top  = r_cell + entry_chamfer;
    // Рабочая полость ячейки открыта вверх (+Z) для печати без поддержек
    translate([0, 0, disc_thickness - cell_depth]) {
        // Цилиндрическая часть ячейки
        cylinder(r = r_cell, h = cell_depth + 0.05);
        // Входная заборная фаска 45 deg (для Варианта B)
        if (entry_chamfer > 0) {
            translate([0, 0, cell_depth - entry_chamfer])
                cylinder(r1 = r_cell, r2 = r_top, h = entry_chamfer + 0.05);
        }
    }
}

module seeder_disc() {
    difference() {
        // Основное тело диска + ступичный бортик 1.5 мм со стороны крышки
        union() {
            cylinder(d = outer_diameter, h = disc_thickness);
            // Лёгкая технологическая фаска по наружному краю 0.6 мм
        }

        // 1. Посадка D-вала
        translate([0, 0, -0.5])
            d_shaft_bore(disc_thickness + 1.0);

        // 2. Три отверстия М3 (крепление и угловая фиксация на ступице)
        for (i = [0 : 2]) {
            rotate([0, 0, i * 120])
                translate([mount_pcd / 2, 0, -0.5])
                    cylinder(d = mount_hole_d, h = disc_thickness + 1.0);
        }

        // 3. Ячейки по делительному диаметру Dp
        for (i = [0 : cell_count - 1]) {
            angle = i * (360 / cell_count);
            rotate([0, 0, angle])
                translate([pitch_diameter / 2, 0, 0])
                    seed_cell();

            // 4. Синхронные прорези оптического энкодера (1 прорезь = 1 ячейка)
            rotate([0, 0, angle])
                translate([encoder_pcd / 2, 0, disc_thickness / 2])
                    cube([encoder_slot_l, encoder_slot_w, disc_thickness + 1.0], center = true);

            // 5. Гравировка номера ячейки (1..N) для видеорегистрации (A4)
            rotate([0, 0, angle])
                translate([outer_diameter / 2 - 4.2, 0, disc_thickness - 0.6])
                    linear_extrude(height = 0.8)
                        text(str(i + 1), size = 3.6, halign = "center", valign = "center", font = "Liberation Sans:style=Bold");
        }
    }
}

seeder_disc();
`;
}

export function generateAssemblyOpenScad(params: DiscParams): string {
  return `// ============================================================================
// Олимпиада Иннагрика 2026 · Профиль «Агротех» · Кейс AT9-3 (Задание 2, A1)
// Параметрическая 3D-сборка высевающего узла:
// Корпус + Подшипник 608ZZ + Бункер + Направляющая + Отсекатель + Выпуск + Кожух
// ============================================================================

$fn = 72;

use <seeder_disc_parametric.scad>;

// --- Геометрия сопряжений и зазоров ---
D_disc          = ${params.outerDiameter.toFixed(2)};
Dp_disc         = ${params.pitchDiameter.toFixed(2)};
H_disc          = ${params.thickness.toFixed(2)};
housing_gap     = 1.50;   // Радиальный зазор диск-корпус
guide_gap       = 0.45;   // Зазор направляющая-диск (< толщины кожуры семени)
cutoff_gap      = ${params.cutoffGapMm.toFixed(2)};  // Регулируемый зазор отсекателя дублей
wall_t          = 4.00;   // Толщина стенок корпуса

D_cavity        = D_disc + 2 * housing_gap;
pocket_depth    = H_disc + 1.20;

// Флаги визуализации / экспорта отдельных деталей для печати
show_housing    = true;
show_disc       = true;
show_hopper     = true;
show_cutoff     = true;
show_guard      = true;
exploded_offset = 0; // Установите >0 для разнесённого вида

module housing_body() {
    difference() {
        union() {
            // Основная плита корпуса
            cylinder(d = D_cavity + 2 * wall_t, h = wall_t + pocket_depth);
            // Нижний монтажный фланец основания
            translate([-(D_cavity/2 + wall_t), -(D_cavity/2 + wall_t + 12), 0])
                cube([D_cavity + 2 * wall_t, 28, wall_t + pocket_depth]);
            // Задний кронштейн подшипника 608ZZ и NEMA 17
            translate([0, 0, -22])
                cylinder(d = 52, h = 22);
        }

        // Полость под сменный диск
        translate([0, 0, wall_t])
            cylinder(d = D_cavity, h = pocket_depth + 1);

        // Окно выпуска в нижней части (-90 deg)
        rotate([0, 0, -90])
            translate([Dp_disc / 2, 0, -1])
                cylinder(d = 15.0, h = wall_t + pocket_depth + 4);

        // Посадка подшипника 608ZZ (Ø22 x 7 мм)
        translate([0, 0, -7.0])
            cylinder(d = 22.15, h = 7.5);

        // Сквозной канал вала Ø8 мм
        translate([0, 0, -25])
            cylinder(d = 10.5, h = 35);

        // 4 отверстия М3 крепления NEMA 17 (квадрат 31 x 31 мм)
        for (sx = [-15.5, 15.5], sy = [-15.5, 15.5]) {
            translate([sx, sy, -23])
                cylinder(d = 3.4, h = 16);
        }

        // 4 ушка под невыпадающие барашки М4 передней прозрачной крышки
        for (a = [45, 135, 225, 315]) {
            rotate([0, 0, a])
                translate([D_cavity/2 + wall_t/2 + 2, 0, 2])
                    cylinder(d = 4.2, h = wall_t + pocket_depth);
        }
    }
}

module hopper_and_chute() {
    // Бункер с углом ската 48 deg в секторе 20..110 deg (зона заполнения)
    translate([22, 26, wall_t + 1]) {
        difference() {
            cube([58, 62, H_disc + 24]);
            translate([4, 4, -1])
                cube([50, 54, H_disc + 26]);
        }
    }
    // Выпускная воронка снизу (-90 deg) с вырезом для видеосъёмки
    translate([0, -Dp_disc/2 - 10, wall_t]) {
        difference() {
            translate([-12, -28, 0]) cube([24, 28, H_disc + 4]);
            translate([-8, -30, 2])  cube([16, 30, H_disc + 2]);
        }
    }
}

module adjustable_cutoff() {
    // Отсекатель на заднем регулировочном пазу (угол ~125 deg)
    rotate([0, 0, 125])
        translate([Dp_disc/2 - 8, -5, wall_t + H_disc - cutoff_gap])
            color("#D97706")
                cube([18, 10, 4]);
}

module protective_guard() {
    // Защитный кожух зоны муфты и вращающегося вала сзади корпуса (Б3)
    translate([0, 0, -56])
        difference() {
            cylinder(d = 56, h = 34);
            translate([0, 0, -1]) cylinder(d = 48, h = 36);
        }
}

if (show_housing) color("#334155") housing_body();
if (show_disc)    translate([0, 0, wall_t + 0.5 + exploded_offset]) color("#0D9488") seeder_disc();
if (show_hopper)  color("#64748B") hopper_and_chute();
if (show_cutoff)  translate([0, 0, exploded_offset * 1.3]) adjustable_cutoff();
if (show_guard)   translate([0, 0, -exploded_offset * 0.8]) color("#475569") protective_guard();
`;
}
