import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  CRITICAL_DIMENSIONS,
  VARIANT_A_PARAMS,
  VARIANT_B_PARAMS,
  evaluateDiscInvariants,
} from '../data/deliverablesContent';
import {
  downloadDefenseScriptDocx,
  downloadPresentationPptx,
  downloadTask1Docx,
  downloadTextFile,
} from '../generators/bundleExporter';
import { generateSlicerProfileIni } from '../generators/firmwareAndTests';
import { generateA2ReportMd } from '../generators/markdownReports';
import { generateAssemblySectionSvg, generateDiscCriticalDrawingSvg } from '../generators/svgDrawings';
import { DiscParams } from '../types/engineering';

interface DrawingsAndSlicingTabProps {
  params: DiscParams;
}

export const DrawingsAndSlicingTab: React.FC<DrawingsAndSlicingTabProps> = ({ params }) => {
  const [drawingMode, setDrawingMode] = useState<'discA' | 'discB' | 'section'>('discB');

  const invA = useMemo(() => evaluateDiscInvariants(VARIANT_A_PARAMS), []);
  const invB = useMemo(() => evaluateDiscInvariants(VARIANT_B_PARAMS), []);
  const slicerIni = useMemo(() => generateSlicerProfileIni(), []);

  const activeSvg = useMemo(() => {
    if (drawingMode === 'discA') return generateDiscCriticalDrawingSvg(VARIANT_A_PARAMS);
    if (drawingMode === 'discB') return generateDiscCriticalDrawingSvg(VARIANT_B_PARAMS);
    return generateAssemblySectionSvg();
  }, [drawingMode]);

  const activeFilename =
    drawingMode === 'discA'
      ? 'drawing_disk_variant_A.svg'
      : drawingMode === 'discB'
        ? 'drawing_disk_variant_B.svg'
        : 'drawing_assembly_section.svg';

  const totalMass = invA.estimatedMassGrams + invB.estimatedMassGrams + 38.0 + 242.0;
  const totalTimeMin = invA.estimatedPrintMinutes + invB.estimatedPrintMinutes + 85 + 310;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Часть А2 · Чертежи, технология FDM и допуски · Вариант {params.variantId}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Чертежи критических размеров и слайсинг (PETG)
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/assets/diagrams/disc_variants_ab.png"
            download="konstruktsiya_diska_AT9-3.png"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Конструкция диска (.png)
          </a>
          <a
            href="/assets/diagrams/seeder_stand_cycle.png"
            download="kinematicheskaya_skhema_AT9-3.png"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Кинематическая схема (.png)
          </a>
          <button
            type="button"
            onClick={() => downloadTextFile(generateA2ReportMd(), 'A2_technology_and_tolerances.md')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Отчёт А2 (.md)
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(slicerIni, 'slicer_profile_PETG.ini')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Профиль слайсера (.ini)
          </button>
        </div>
      </div>

      {/* SVG Engineering Drawings Viewer */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setDrawingMode('discA')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                drawingMode === 'discA' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Чертёж диска (Вариант A)
            </button>
            <button
              type="button"
              onClick={() => setDrawingMode('discB')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                drawingMode === 'discB' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Чертёж диска (Вариант B)
            </button>
            <button
              type="button"
              onClick={() => setDrawingMode('section')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                drawingMode === 'section' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Сечение сборки А-А (Б1/С3)
            </button>
          </div>

          <button
            type="button"
            onClick={() => downloadTextFile(activeSvg, activeFilename, 'image/svg+xml;charset=utf-8')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Скачать {activeFilename}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
          <div
            className="w-full max-w-[1140px] mx-auto [&>svg]:w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: activeSvg }}
          />
        </div>
      </section>

      {/* Critical Dimensions & Tolerances Table */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            01. Критические размеры, посадки и обоснование печатных зазоров
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Напечатанная деталь не считается равной CAD-модели: заложены компенсации усадки PETG (~0.3%) и обязательный промер штангенциркулем перед монтажом.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Код</th>
                <th className="py-3 px-4">Размер</th>
                <th className="py-3 px-4">Номинал CAD</th>
                <th className="py-3 px-4">Допуск</th>
                <th className="py-3 px-4">Обоснование посадки/зазора</th>
                <th className="py-3 px-4">Контроль после печати</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {CRITICAL_DIMENSIONS.map((d) => (
                <tr key={d.code} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono font-semibold text-teal-800">{d.code}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{d.name}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-900 whitespace-nowrap">{d.cadValue}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-blue-700 font-medium whitespace-nowrap">{d.tolerance}</td>
                  <td className="py-3 px-4 text-slate-600 max-w-md">{d.clearanceRationale}</td>
                  <td className="py-3 px-4 text-slate-600 max-w-sm">{d.inspectionTool}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Slicing Budget & Print Orientation */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            02. Оценка времени 3D-печати и расхода PETG
          </h2>
          <p className="text-sm text-slate-600">
            В расчёт заложены: полный корпус с бункером и заслонкой мусора, два исходных диска и 1 резервная доработка.
          </p>

          {/* Visual Headroom Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Расход PETG (лимит 500 г)</span>
                <span className="font-mono font-semibold text-teal-800 tabular-nums">{totalMass.toFixed(0)} г</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-700 rounded-full"
                  style={{ width: `${Math.min(100, (totalMass / 500) * 100)}%` }}
                />
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">2 принтера (лимит 360 мин)</span>
                <span className="font-mono font-semibold text-blue-700 tabular-nums">~{Math.round(totalTimeMin / 2)} мин</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-700 rounded-full"
                  style={{ width: `${Math.min(100, ((totalTimeMin / 2) / 360) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 text-left">
                  <th className="py-2 pr-3">Деталь</th>
                  <th className="py-2 px-3">Поддержки</th>
                  <th className="py-2 px-3 text-right">Масса</th>
                  <th className="py-2 pl-3 text-right">Время</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-xs">
                <tr>
                  <td className="py-2.5 pr-3 font-sans font-medium text-slate-900">Диск Вариант A (c = 0 мм)</td>
                  <td className="py-2.5 px-3 font-sans text-emerald-700">Нет (+Z вверх)</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">{invA.estimatedMassGrams} г</td>
                  <td className="py-2.5 pl-3 text-right whitespace-nowrap">{invA.estimatedPrintMinutes} мин</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-sans font-medium text-slate-900">Диск Вариант B (c = 1.8 мм)</td>
                  <td className="py-2.5 px-3 font-sans text-emerald-700">Нет (+Z вверх)</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">{invB.estimatedMassGrams} г</td>
                  <td className="py-2.5 pl-3 text-right whitespace-nowrap">{invB.estimatedPrintMinutes} мин</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-sans font-medium text-slate-900">Доработка диска (резерв 1 шт.)</td>
                  <td className="py-2.5 px-3 font-sans text-emerald-700">Нет (+Z вверх)</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">38.0 г</td>
                  <td className="py-2.5 pl-3 text-right whitespace-nowrap">85 мин</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-sans font-medium text-slate-900">Корпус, бункер, направляющая, отсекатель, кожух</td>
                  <td className="py-2.5 px-3 font-sans text-emerald-700">Нет (скаты ≥45°)</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">242.0 г</td>
                  <td className="py-2.5 pl-3 text-right whitespace-nowrap">310 мин</td>
                </tr>
                <tr className="bg-slate-50 font-semibold text-slate-900">
                  <td className="py-2.5 pr-3 font-sans">ИТОГО комплект (на 2 принтерах: ~4 ч 45 мин)</td>
                  <td className="py-2.5 px-3 font-sans">0 на раб. гранях</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">{totalMass.toFixed(1)} г</td>
                  <td className="py-2.5 pl-3 text-right whitespace-nowrap">{totalTimeMin} мин</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">03. Профиль слайсера (PETG)</h2>
            <span className="text-xs font-mono text-slate-500">slicer_profile_PETG.ini</span>
          </div>
          <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-[260px] leading-relaxed">
            {slicerIni}
          </pre>
        </div>
      </section>

      {/* Defense Presentation (concise + photo placeholders) & Task 1 DOCX */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              04. Презентация (.pptx), речь для защиты (.docx) и Задание №1 (.docx)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Презентация адаптирована под защиту цифрового проекта; в «Текст защиты (.docx)» речь расфасована по каждому из 12 слайдов для печати на лист А4 (включая шпаргалку Q&A); Задание №1 полностью оформлено в Word.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void downloadPresentationPptx()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Презентация (.pptx)
            </button>
            <button
              type="button"
              onClick={() => void downloadDefenseScriptDocx()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Текст защиты (.docx)
            </button>
            <button
              type="button"
              onClick={() => void downloadTask1Docx()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Задание №1 (.docx)
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
