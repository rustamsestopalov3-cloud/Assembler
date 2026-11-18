# Кейс AT9-3: Разработка сменного диска для подачи семян — Команда Assembler

## Состав комплекта файлов
0. **`00_Zadanie1_and_Presentation/`**
   - `AT9-3_Zadanie1_Assembler.docx` — полное обоснованное решение Задания 1 (п. 1.1–1.4, экономика, способы подачи, расчёты привода/геометрии и ТЗ) по нашей модели.
   - `AT9-3_Prezentatsiya_Assembler.pptx` — презентация публичной защиты (12 слайдов в фирменном шаблоне Иннагрика 2026).
   - `AT9-3_Tekst_Zashchity_Assembler.docx` — развёрнутая речь докладчика по каждому слайду (1–12) и шпаргалка ответов на вопросы жюри (Q&A) для печати на лист А4.
1. **`01_CAD_Models/`**
   - `seeder_disc_parametric.scad` — параметрическая CAD-модель диска с проверками `assert()`.
   - `seeder_assembly.scad` — параметрическая сборка корпуса, бункера, направляющей, отсекателя, выпуска, привода и защиты.
   - `disk_variant_A_straight.stl` — готовый STL-файл Варианта A ($c = 0\text{ мм}$).
   - `disk_variant_B_chamfer.stl` — готовый STL-файл Варианта B ($c = 1.8\text{ мм} \times 45^\circ$).
   - `housing_body.stl` — готовый STL-файл базового корпуса.
2. **`02_Drawings_and_Slicing/`**
   - `drawing_disk_variant_A.svg`, `drawing_disk_variant_B.svg` — чертежи критических размеров с допусками.
   - `drawing_assembly_section.svg` — чертёж сечения сборки А-А (для Б1/С3).
   - `konstruktsiya_diska_AT9-3.png`, `kinematicheskaya_skhema_AT9-3.png` — отдельные чёткие схемы конструкции диска (A/B) и кинематики стенда.
   - `slicer_profile_PETG.ini` — настройки слайсера PETG без поддержек.
   - `A2_technology_and_tolerances.md` — обоснование материала, ориентации, зазоров, расчёт времени и массы.
3. **`03_Electronics_and_Firmware/`**
   - `electrical_schematic.svg` — электрическая схема узла (12 В DC, Arduino Nano, TMC2209, оптический датчик, синхро-LED).
   - `seeder_controller.ino` — прошивка контроллера без автозапуска и с подтверждением вращения датчиком.
   - `test_controller_logic.py` — программные автотесты сценариев С5 и С6.
   - `A3_control_and_safety_manual.md` — описание схемы, логики и ограничений.
4. **`04_Accounting_and_Logs/`**
   - `A4_video_registration_methodology.md` — методика видеорегистрации 60 fps и учёта событий `0 / 1 / 2+ / U`.
   - `seeder_trial_log_template.csv` — пустая форма журнала испытаний (UTF-8 BOM, разделитель `;`).
   - `seeder_trial_log_example.csv` — пример заполнения (2 тестовые строки).
5. **`05_Part_B_Tests_and_Final/`**
   - `B1_test_protocol_C1_C6.md` — протокол С1–С6 (Ожидалось / Получено / Доказательство / Ошибка / Исправление / Повтор).
   - `B2_quality_metrics_and_time_budget.md` — формулы качества, план сравнения дисков, бюджет времени финала.
   - `B3_specification_BOM_and_final_checklist.md` — спецификация, стоимость, порядок монтажа, настройки и пуска.
