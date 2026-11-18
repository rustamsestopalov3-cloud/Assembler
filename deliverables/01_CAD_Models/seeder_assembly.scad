// ============================================================================
// Олимпиада Иннагрика 2026 · Профиль «Агротех» · Кейс AT9-3 (Задание 2, A1)
// Параметрическая 3D-сборка высевающего узла:
// Корпус + Подшипник 608ZZ + Бункер + Направляющая + Отсекатель + Выпуск + Кожух
// ============================================================================

$fn = 72;

use <seeder_disc_parametric.scad>;

// --- Геометрия сопряжений и зазоров ---
D_disc          = 120.00;
Dp_disc         = 94.00;
H_disc          = 10.00;
housing_gap     = 1.50;   // Радиальный зазор диск-корпус
guide_gap       = 0.45;   // Зазор направляющая-диск (< толщины кожуры семени)
cutoff_gap      = 1.20;  // Регулируемый зазор отсекателя дублей
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
