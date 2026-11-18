import React from 'react';
import { CheckCircle2, Download } from 'lucide-react';
import {
  BOM_ITEMS,
  INITIAL_TRIAL_LOGS,
  TEST_PROTOCOL_C1_C6,
  TIME_BUDGET_FINAL,
  VARIANT_A_PARAMS,
  VARIANT_B_PARAMS,
} from '../data/deliverablesContent';
import { downloadDiscStl, downloadHousingStl, downloadTextFile } from '../generators/bundleExporter';
import { generateAssemblyOpenScad, generateDiscOpenScad } from '../generators/cadOpenScad';
import {
  generateArduinoFirmware,
  generatePythonLogicTests,
  generateSlicerProfileIni,
  rowsToCsv,
} from '../generators/firmwareAndTests';
import {
  generateA2ReportMd,
  generateA3ReportMd,
  generateA4ReportMd,
  generateB1ReportMd,
  generateB2ReportMd,
  generateB3ReportMd,
  generateMasterReadmeMd,
} from '../generators/markdownReports';
import {
  generateAssemblySectionSvg,
  generateDiscCriticalDrawingSvg,
  generateElectricalSchematicSvg,
} from '../generators/svgDrawings';

export const ProtocolAndFinalTab: React.FC = () => {
  const totalCost = BOM_ITEMS.reduce((sum, item) => sum + item.unitPriceRub * item.qty, 0);
  const totalSequentialMin = TIME_BUDGET_FINAL.reduce((sum, item) => sum + item.durationMin, 0);

  const fileManifest: Array<{
    folder: string;
    name: string;
    desc: string;
    onDownload: () => void;
  }> = [
    {
      folder: '01_CAD_Models',
      name: 'seeder_disc_parametric.scad',
      desc: 'Параметрическая CAD-модель диска OpenSCAD с проверками assert()',
      onDownload: () => downloadTextFile(generateDiscOpenScad(VARIANT_B_PARAMS), 'seeder_disc_parametric.scad'),
    },
    {
      folder: '01_CAD_Models',
      name: 'seeder_assembly.scad',
      desc: 'Параметрическая сборка (корпус, бункер, отсекатель, кожух)',
      onDownload: () => downloadTextFile(generateAssemblyOpenScad(VARIANT_B_PARAMS), 'seeder_assembly.scad'),
    },
    {
      folder: '01_CAD_Models',
      name: 'disk_variant_A_straight.stl',
      desc: 'Бинарный STL-файл диска (Вариант A: прямая ячейка c = 0 мм)',
      onDownload: () => downloadDiscStl(VARIANT_A_PARAMS, 'disk_variant_A_straight.stl'),
    },
    {
      folder: '01_CAD_Models',
      name: 'disk_variant_B_chamfer.stl',
      desc: 'Бинарный STL-файл диска (Вариант B: фаска c = 1.8×45°)',
      onDownload: () => downloadDiscStl(VARIANT_B_PARAMS, 'disk_variant_B_chamfer.stl'),
    },
    {
      folder: '01_CAD_Models',
      name: 'housing_body.stl',
      desc: 'Бинарный STL-файл корпуса с окном выпуска',
      onDownload: () => downloadHousingStl(),
    },
    {
      folder: '02_Drawings_and_Slicing',
      name: 'drawing_disk_variant_A.svg',
      desc: 'Чертёж критических размеров и допусков (Вариант A)',
      onDownload: () => downloadTextFile(generateDiscCriticalDrawingSvg(VARIANT_A_PARAMS), 'drawing_disk_variant_A.svg', 'image/svg+xml;charset=utf-8'),
    },
    {
      folder: '02_Drawings_and_Slicing',
      name: 'drawing_disk_variant_B.svg',
      desc: 'Чертёж критических размеров и допусков (Вариант B)',
      onDownload: () => downloadTextFile(generateDiscCriticalDrawingSvg(VARIANT_B_PARAMS), 'drawing_disk_variant_B.svg', 'image/svg+xml;charset=utf-8'),
    },
    {
      folder: '02_Drawings_and_Slicing',
      name: 'drawing_assembly_section.svg',
      desc: 'Чертёж сечения сборки А-А (С3 / Б1)',
      onDownload: () => downloadTextFile(generateAssemblySectionSvg(), 'drawing_assembly_section.svg', 'image/svg+xml;charset=utf-8'),
    },
    {
      folder: '02_Drawings_and_Slicing',
      name: 'slicer_profile_PETG.ini',
      desc: 'Профиль слайсера PETG 0.20 мм без поддержек',
      onDownload: () => downloadTextFile(generateSlicerProfileIni(), 'slicer_profile_PETG.ini'),
    },
    {
      folder: '02_Drawings_and_Slicing',
      name: 'A2_technology_and_tolerances.md',
      desc: 'Отчёт А2: материал, допуски, зазоры и время/масса',
      onDownload: () => downloadTextFile(generateA2ReportMd(), 'A2_technology_and_tolerances.md'),
    },
    {
      folder: '03_Electronics_and_Firmware',
      name: 'electrical_schematic.svg',
      desc: 'Принципиальная электрическая схема (12 В DC ≤ 24 В)',
      onDownload: () => downloadTextFile(generateElectricalSchematicSvg(), 'electrical_schematic.svg', 'image/svg+xml;charset=utf-8'),
    },
    {
      folder: '03_Electronics_and_Firmware',
      name: 'seeder_controller.ino',
      desc: 'Прошивка Arduino Nano + TMC2209 + датчик LM393 (защита С6)',
      onDownload: () => downloadTextFile(generateArduinoFirmware(VARIANT_B_PARAMS), 'seeder_controller.ino'),
    },
    {
      folder: '03_Electronics_and_Firmware',
      name: 'test_controller_logic.py',
      desc: 'Модульные программные автотесты сценариев С5 и С6',
      onDownload: () => downloadTextFile(generatePythonLogicTests(), 'test_controller_logic.py'),
    },
    {
      folder: '03_Electronics_and_Firmware',
      name: 'A3_control_and_safety_manual.md',
      desc: 'Описание схемы управления и подтверждения вращения',
      onDownload: () => downloadTextFile(generateA3ReportMd(), 'A3_control_and_safety_manual.md'),
    },
    {
      folder: '04_Accounting_and_Logs',
      name: 'A4_video_registration_methodology.md',
      desc: 'Методика видеорегистрации 60 fps и учёта событий 0/1/2+/U',
      onDownload: () => downloadTextFile(generateA4ReportMd(), 'A4_video_registration_methodology.md'),
    },
    {
      folder: '04_Accounting_and_Logs',
      name: 'seeder_trial_log_template.csv',
      desc: 'Пустая форма журнала испытаний (UTF-8 BOM, разделитель ;)',
      onDownload: () => downloadTextFile(rowsToCsv([]), 'seeder_trial_log_template.csv', 'text/csv;charset=utf-8'),
    },
    {
      folder: '04_Accounting_and_Logs',
      name: 'seeder_trial_log_example.csv',
      desc: 'Пример заполнения журнала испытаний',
      onDownload: () => downloadTextFile(rowsToCsv(INITIAL_TRIAL_LOGS), 'seeder_trial_log_example.csv', 'text/csv;charset=utf-8'),
    },
    {
      folder: '05_Part_B_Tests_and_Final',
      name: 'B1_test_protocol_C1_C6.md',
      desc: 'Протокол испытаний С1–С6 (Ожидалось/Получено/Ошибка/Повтор)',
      onDownload: () => downloadTextFile(generateB1ReportMd(), 'B1_test_protocol_C1_C6.md'),
    },
    {
      folder: '05_Part_B_Tests_and_Final',
      name: 'B2_quality_metrics_and_time_budget.md',
      desc: 'Формулы качества P₀/P₁/P₂+/P_U, план сравнения и бюджет времени',
      onDownload: () => downloadTextFile(generateB2ReportMd(), 'B2_quality_metrics_and_time_budget.md'),
    },
    {
      folder: '05_Part_B_Tests_and_Final',
      name: 'B3_specification_BOM_and_final_checklist.md',
      desc: 'Спецификация, стоимость и порядок монтажа/пуска на финале',
      onDownload: () => downloadTextFile(generateB3ReportMd(), 'B3_specification_BOM_and_final_checklist.md'),
    },
    {
      folder: 'Корень архива',
      name: 'README_ОПИСЬ_ФАЙЛОВ.md',
      desc: 'Сводная опись всех материалов Задания 2 (Части А и Б)',
      onDownload: () => downloadTextFile(generateMasterReadmeMd(), 'README_ОПИСЬ_ФАЙЛОВ.md'),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Часть Б · Испытания цифрового проекта (Б1), качество и график работ (Б2), спецификация и регламент сборки (Б3)
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Протокол С1–С6, спецификация и регламент запуска стенда
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadTextFile(generateB1ReportMd(), 'B1_test_protocol_C1_C6.md')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Б1 (.md)
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(generateB2ReportMd(), 'B2_quality_metrics_and_time_budget.md')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Б2 (.md)
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(generateB3ReportMd(), 'B3_specification_BOM_and_final_checklist.md')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Б3 (.md)
          </button>
        </div>
      </div>

      {/* B1: Test Protocol C1 - C6 */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            01. Б1. Протокол испытаний цифрового проекта (Таблица 4: С1–С6)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Программные тесты С5 и С6 проверяют алгоритмы управления на заданных входах и не выдаются за реальное вращение или экспериментальную подачу семян.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {TEST_PROTOCOL_C1_C6.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  <span className="font-mono text-teal-800 mr-2">{entry.id}.</span>
                  {entry.scenario}
                </h3>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {entry.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs leading-relaxed">
                <div>
                  <div className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] mb-1">
                    Ожидалось
                  </div>
                  <p className="text-slate-800">{entry.expected}</p>
                </div>
                <div>
                  <div className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] mb-1">
                    Получено
                  </div>
                  <p className="text-slate-800">{entry.actual}</p>
                </div>
                <div>
                  <div className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] mb-1">
                    Доказательство
                  </div>
                  <p className="text-slate-700 font-mono text-[11.5px]">{entry.evidence}</p>
                </div>
                <div>
                  <div className="font-semibold text-amber-700 uppercase tracking-wider text-[11px] mb-1">
                    Ошибка (до исправления)
                  </div>
                  <p className="text-slate-700">{entry.defectFound}</p>
                </div>
                <div>
                  <div className="font-semibold text-blue-700 uppercase tracking-wider text-[11px] mb-1">
                    Исправление
                  </div>
                  <p className="text-slate-700">{entry.fixApplied}</p>
                </div>
                <div>
                  <div className="font-semibold text-emerald-700 uppercase tracking-wider text-[11px] mb-1">
                    Повтор
                  </div>
                  <p className="text-slate-800 font-medium">{entry.retestResult}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* B2: Quality Formulas, Comparative Plan & Time Budget */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            02. Б2. План сравнения Варианта A и Варианта B
          </h2>
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              <strong className="text-slate-900">Формулы расчёта:</strong> доля пропусков{' '}
              <span className="font-mono">P₀ = E₀/E</span>, одиночных выдач{' '}
              <span className="font-mono">P₁ = E₁/E</span>, дублей{' '}
              <span className="font-mono">P₂+ = E₂+/E</span>, неопределённых{' '}
              <span className="font-mono">P_U = E_U/E</span>. Фактическая поштучная производительность{' '}
              <span className="font-mono">Q_один = E₁ / T_серии</span> приводится отдельно от P₁.
            </p>
            <p>
              <strong className="text-slate-900">Идентичность условий:</strong> одна партия калиброванного гороха (6.2–8.4 мм), скорость 10.0 об/мин (2.0 соб/с), зазор направляющей 0.45 мм, отсекатель 1.2 мм, досыпка бункера до 75% перед каждым прогоном.
            </p>
            <p>
              <strong className="text-slate-900">Повторность:</strong> 3 повтора по ≥ 100 последовательных событий на каждый вариант (чередование <span className="font-mono">A1→B1→A2→B2→A3→B3</span>). Серия с неразличимым видео или P_U &gt; 2% исключается с фиксацией причины в журнале.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">03. Б2. График изготовления и испытаний</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Печать на 2 принтерах идёт автономно, пока команда собирает электронику и датчик.
              </p>
            </div>
            <div className="text-right font-mono text-xs font-semibold text-teal-800 tabular-nums">
              <div>2 принтера: ~4 ч 45 мин</div>
              <div className="text-slate-600">Ручные работы: ~2 ч 55 мин</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-left">
                  <th className="py-2 pr-3">Этап</th>
                  <th className="py-2 px-2 text-right">Длительность</th>
                  <th className="py-2 pl-3">Организация работ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TIME_BUDGET_FINAL.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-2 pr-3 font-medium text-slate-900">{row.stage}</td>
                    <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                      {row.durationMin} мин
                    </td>
                    <td className="py-2 pl-3 text-slate-600">{row.parallelNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <strong className="text-slate-900">Итого по календарю (~5 ч 20 мин):</strong> сумма всех {totalSequentialMin} мин складывается из 563 мин машинной 3D-печати (выполняются параллельно на двух принтерах за ~4 ч 45 мин) и 195 мин ручной сборки, калибровки, стендовых серий и видеоразбора.
          </div>
        </div>
      </section>

      {/* B3: BOM & Pre-flight Checklist */}
      <section className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 p-5 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">
              04. Б3. Уточнённая спецификация (BOM) и стоимость комплекта
            </h2>
            <div className="font-mono text-base font-bold text-teal-800 tabular-nums">
              Итого: {totalCost.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-3 px-4">Код</th>
                <th className="py-3 px-4">Категория</th>
                <th className="py-3 px-4">Наименование</th>
                <th className="py-3 px-4">Спецификация</th>
                <th className="py-3 px-4 text-right">Кол-во</th>
                <th className="py-3 px-4 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {BOM_ITEMS.map((item) => (
                <tr key={item.code} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">{item.code}</td>
                  <td className="py-2.5 px-4 text-slate-600">{item.category}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">{item.name}</td>
                  <td className="py-2.5 px-4 text-slate-600">{item.spec}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                    {item.qty} {item.unit}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {(item.unitPriceRub * item.qty).toLocaleString('ru-RU')} ₽
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
            <h3 className="text-sm font-bold text-slate-900">1. Проверка размеров после печати</h3>
            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4">
              <li>Снять микрозаусенцы с кромок ячеек (не скругляя заходную фаску).</li>
              <li>Замерить штангенциркулем (0.05 мм): наружный Ø120±0.3, все 12 ячеек (9.2+0.2/-0.1), глубину (7.8±0.15).</li>
              <li>Откалибровать отверстие вала Ø8.0 мм развёрткой и внести замеры в журнал.</li>
            </ol>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
            <h3 className="text-sm font-bold text-slate-900">2. Монтаж, защита и ветка мусора</h3>
            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4">
              <li>Установить подшипник 608ZZ, вал Ø8 мм, муфту 5→8 мм и закрыть кожухом (PRT-04).</li>
              <li>Закрепить на профиле 2020 камеру 60 fps, оптический датчик LM393 и лазерный детектор примесей с заслонкой.</li>
              <li>Выставить щупом зазор направляющей 0.45 мм и отсекателя 1.2 мм, закрыть прозрачную крышку.</li>
            </ol>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
            <h3 className="text-sm font-bold text-slate-900">3. Настройка и первый пуск</h3>
            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4">
              <li>Проверить напряжение блока питания 12 В DC (в пределах ≤24 В) перед подачей на драйвер.</li>
              <li>Убедиться, что при включении вал неподвижен (<span className="font-mono">STATE=IDLE</span>, автозапуска нет).</li>
              <li>Проверить на холостом ходу 12 вспышек синхро-LED, отработку лазера с заслонкой и кнопку E-Stop.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Complete 21-File Submission Manifest */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              05. Реестр файлов к сдаче (21 файл Задания 2)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Все файлы можно скачать по отдельности ниже или единым архивом через кнопку «Скачать всё (ZIP)» вверху экрана.
            </p>
          </div>
        </div>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
              <th className="py-3 px-4">Раздел</th>
              <th className="py-3 px-4">Файл</th>
              <th className="py-3 px-4">Назначение</th>
              <th className="py-3 px-4 text-right">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {fileManifest.map((file) => (
              <tr key={file.name} className="hover:bg-slate-50/60">
                <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">{file.folder}</td>
                <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">{file.name}</td>
                <td className="py-2.5 px-4 text-slate-600">{file.desc}</td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={file.onDownload}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-medium rounded whitespace-nowrap cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    Скачать
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

