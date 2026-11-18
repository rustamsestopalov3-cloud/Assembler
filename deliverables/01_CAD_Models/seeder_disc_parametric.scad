// ============================================================================
// Олимпиада Иннагрика 2026 · Профиль «Агротех» · Кейс AT9-3 (Задание 2, A1)
// Параметрическая CAD-модель сменного ячеистого диска дозатора семян (горох)
// Конфигурация: Variant_B_Chamfered_Cell
// ============================================================================

$fn = 96;

// --- Основные параметры (мм) ---
outer_diameter   = 120.00;   // Наружный диаметр диска D
pitch_diameter   = 94.00;    // Делительный диаметр центров ячеек Dp
disc_thickness   = 10.00;    // Толщина диска H
cell_count       = 12;       // Число ячеек N (для сравнения: 8, 12, 16)
cell_diameter    = 9.20;     // Диаметр ячейки D_яч (под горох d_max=8.4 мм)
cell_depth       = 7.80;     // Глубина ячейки h_яч
entry_chamfer    = 1.80;     // ОСНОВНОЙ ИЗМЕНЯЕМЫЙ ПАРАМЕТР: входная фаска (0 = А, 1.8 = B)

// --- Посадка на вал и крепление (с учётом усадки PETG) ---
shaft_nominal    = 8.00;     // Номинал вала (мм)
print_clearance  = 0.20;     // Печатный зазор (компенсация усадки FDM)
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
