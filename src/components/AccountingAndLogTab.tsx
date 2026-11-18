import React, { useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { downloadTextFile } from '../generators/bundleExporter';
import { rowsToCsv } from '../generators/firmwareAndTests';
import { generateA4ReportMd } from '../generators/markdownReports';
import { TrialLogRow } from '../types/engineering';

interface AccountingAndLogTabProps {
  logRows: TrialLogRow[];
  onChangeLogs: (rows: TrialLogRow[]) => void;
}

export const AccountingAndLogTab: React.FC<AccountingAndLogTabProps> = ({
  logRows,
  onChangeLogs,
}) => {
  const [newRow, setNewRow] = useState<Omit<TrialLogRow, 'id'>>({
    seriesId: `S-${logRows.length + 1}`,
    discVersion: 'Вариант B (c=1.8 мм)',
    printParams: 'PETG 0.4мм, слой 0.20мм, 4 пер., 30%',
    measuredCellDiaMm: 9.2,
    measuredShaftMm: 8.05,
    seedBatch: 'Горох кл. 6.2–8.4 мм',
    hopperFillPct: 75,
    targetRpm: 10.0,
    actualRpm: 10.0,
    durationSec: 50.0,
    events0: 2,
    events1: 96,
    events2Plus: 2,
    eventsU: 0,
    outOfWindowSeeds: 0,
    disputedEpisodes: 0,
    damagedSeeds: 0,
    jams: 0,
    interventions: 0,
    notes: 'Новая серия испытаний',
  });

  const handleAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeLogs([
      ...logRows,
      {
        ...newRow,
        id: `T${Date.now()}`,
      },
    ]);
    setNewRow((prev) => ({
      ...prev,
      seriesId: `S-${logRows.length + 2}`,
    }));
  };

  const handleDeleteRow = (id: string) => {
    onChangeLogs(logRows.filter((r) => r.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Часть А4 и Б2 · Независимая видеорегистрация 60 fps · Журнал учёта
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Методика поштучного учёта и журнал испытаний
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadTextFile(generateA4ReportMd(), 'A4_video_registration_methodology.md')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Методика А4 (.md)
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(rowsToCsv([]), 'seeder_trial_log_template.csv', 'text/csv;charset=utf-8')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Пустой шаблон (.csv)
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(rowsToCsv(logRows), 'seeder_trial_log_filled.csv', 'text/csv;charset=utf-8')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Скачать журнал (.csv)
          </button>
        </div>
      </div>

      {/* Event Definition & Why Weighing Fails */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-bold text-slate-900">01. Определение события выдачи</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Событием считается прохождение конкретной ячейки <span className="font-mono font-semibold text-slate-900">i ∈ 1..12</span> через окно выпуска в интервале{' '}
            <span className="font-mono text-slate-900">[t_i − Δt/2; t_i + Δt/2]</span> по оптическому датчику и синхро-LED.
          </p>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-700 space-y-1.5 font-mono">
            <div><strong className="text-slate-900">0</strong> — пропуск (ячейка пустая)</div>
            <div><strong className="text-teal-800">1</strong> — одиночная штатная выдача</div>
            <div><strong className="text-amber-700">2+</strong> — многосемянная выдача (дубль)</div>
            <div><strong className="text-red-700">U</strong> — неопределённость (не скрывается!)</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-bold text-slate-900">02. Независимая видеорегистрация</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Съёмка на штативе при <strong className="text-slate-900">60 fps</strong> (выдержка ≤ 1/500 с). При 2 сем/с каждое событие занимает <strong className="text-slate-900">30 кадров</strong>.
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
            <li>В кадре одновременно: отверстие сброса Ø17 мм, номера ячеек <span className="font-mono">1..12</span> на диске, синхро-LED и табличка серии.</li>
            <li><strong className="text-slate-900">Калибровочная мишень сзади (шаг 1 мм):</strong> закреплена за каналом сброса для точного измерения траектории и скорости падения по кадрам без перспективных искажений.</li>
            <li>Выдачи между штатными окнами и спорные эпизоды фиксируются отдельно.</li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-bold text-slate-900">03. Почему взвешивание непригодно</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Суммарное взвешивание или подсчёт сборника <strong className="text-slate-900">маскируют компенсирующиеся ошибки</strong>.
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono tabular-nums space-y-1">
            <div>Пример на 100 событий:</div>
            <div>90 одиночных + 5 пропусков (0) + 5 дублей (2+)</div>
            <div className="text-red-700 font-semibold">В сборнике = 100 семян (мнимые 100%)</div>
            <div className="text-teal-800 font-semibold">Истинное качество P₁ = 90.0%</div>
          </div>
        </div>
      </section>

      {/* Trial Log Table with Live B2 Quality & Throughput Metrics */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Журнал серий испытаний и расчёт долей (Б2)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Строки ниже содержат демонстрационный шаблон расчёта. На финале вносятся фактические замеры после видеоразбора. Фактическая производительность указана отдельно от доли P₁.
            </p>
          </div>
        </div>

        {/* Visual Distribution Comparison Bars (P1 / P0 / P2+ / PU) */}
        {logRows.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Сравнение структуры событий по сериям (%)
              </span>
              <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-teal-600 inline-block" /> Одиночные (1)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block" /> Пропуски (0)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" /> Дубли (2+)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-red-600 inline-block" /> Неопределённость (U)
                </span>
              </div>
            </div>
            <div className="space-y-2.5">
              {logRows.map((row) => {
                const totalE = Math.max(1, row.events0 + row.events1 + row.events2Plus + row.eventsU);
                const w1 = (row.events1 / totalE) * 100;
                const w0 = (row.events0 / totalE) * 100;
                const w2 = (row.events2Plus / totalE) * 100;
                const wU = (row.eventsU / totalE) * 100;
                return (
                  <div key={row.id} className="grid grid-cols-12 items-center gap-3 text-xs">
                    <div className="col-span-4 sm:col-span-3 truncate font-medium text-slate-800">
                      <span className="font-mono font-semibold text-slate-900 mr-1.5">{row.seriesId}</span>
                      <span className="text-slate-500">{row.discVersion.replace('Вариант ', 'Вар. ')}</span>
                    </div>
                    <div className="col-span-6 sm:col-span-7 h-4 bg-slate-100 rounded overflow-hidden flex">
                      <div className="bg-teal-600 h-full" style={{ width: `${w1}%` }} title={`Одиночные: ${w1.toFixed(1)}%`} />
                      <div className="bg-slate-400 h-full" style={{ width: `${w0}%` }} title={`Пропуски: ${w0.toFixed(1)}%`} />
                      <div className="bg-amber-500 h-full" style={{ width: `${w2}%` }} title={`Дубли: ${w2.toFixed(1)}%`} />
                      <div className="bg-red-600 h-full" style={{ width: `${wU}%` }} title={`Неопределённость: ${wU.toFixed(1)}%`} />
                    </div>
                    <div className="col-span-2 text-right font-mono font-semibold text-teal-800 tabular-nums">
                      P₁ {w1.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-3 px-3">Серия</th>
                <th className="py-3 px-3">Диск / замеры</th>
                <th className="py-3 px-3 text-right">Скорость</th>
                <th className="py-3 px-3 text-right">E (0 / 1 / 2+ / U)</th>
                <th className="py-3 px-3 text-right">P₁ (один.)</th>
                <th className="py-3 px-3 text-right">P₀ / P₂+ / P_U</th>
                <th className="py-3 px-3 text-right">Q_один / Q_вал</th>
                <th className="py-3 px-3 text-right">Вне окна / Спорн.</th>
                <th className="py-3 px-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
              {logRows.map((row) => {
                const totalE = row.events0 + row.events1 + row.events2Plus + row.eventsU;
                const p0 = totalE > 0 ? (row.events0 / totalE) * 100 : 0;
                const p1 = totalE > 0 ? (row.events1 / totalE) * 100 : 0;
                const p2 = totalE > 0 ? (row.events2Plus / totalE) * 100 : 0;
                const pU = totalE > 0 ? (row.eventsU / totalE) * 100 : 0;
                const qSingle = row.durationSec > 0 ? row.events1 / row.durationSec : 0;
                const qGross =
                  row.durationSec > 0
                    ? (row.events1 + 2 * row.events2Plus + row.outOfWindowSeeds) / row.durationSec
                    : 0;
                const rejected = pU > 2.0;

                return (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-sans">
                      <div className="font-semibold text-slate-900">{row.seriesId}</div>
                      <div className="text-[11px] text-slate-500">Бункер {row.hopperFillPct}%</div>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-medium text-slate-900">{row.discVersion}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        D_яч={row.measuredCellDiaMm.toFixed(2)} · Вал={row.measuredShaftMm.toFixed(2)} мм
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="text-slate-900">{row.actualRpm.toFixed(2)} об/мин</div>
                      <div className="text-[11px] text-slate-500">{row.durationSec.toFixed(1)} с</div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="font-semibold text-slate-900">{totalE}</div>
                      <div className="text-[11px] text-slate-500">
                        {row.events0} / {row.events1} / {row.events2Plus} / {row.eventsU}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`font-bold ${rejected ? 'text-red-700' : 'text-teal-800'}`}>
                        {p1.toFixed(1)}%
                      </span>
                      {rejected && <div className="text-[10px] font-sans text-red-600">Брак P_U &gt; 2%</div>}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {p0.toFixed(1)}% / {p2.toFixed(1)}% / {pU.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="text-slate-900">{qSingle.toFixed(2)} сем/с</div>
                      <div className="text-[11px] text-slate-500">вал: {qGross.toFixed(2)} сем/с</div>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {row.outOfWindowSeeds} / {row.disputedEpisodes}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row.id)}
                        title="Удалить строку"
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add New Trial Series Form */}
        <form
          onSubmit={handleAddRow}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-bold text-slate-900">Добавить запись серии испытаний в журнал</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
            <label className="space-y-1">
              <span className="text-slate-600 block">ID серии</span>
              <input
                type="text"
                required
                value={newRow.seriesId}
                onChange={(e) => setNewRow({ ...newRow, seriesId: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
              />
            </label>
            <label className="space-y-1 col-span-2">
              <span className="text-slate-600 block">Версия диска</span>
              <select
                value={newRow.discVersion}
                onChange={(e) =>
                  setNewRow({
                    ...newRow,
                    discVersion: e.target.value as TrialLogRow['discVersion'],
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
              >
                <option value="Вариант A (c=0 мм)">Вариант A (c=0 мм)</option>
                <option value="Вариант B (c=1.8 мм)">Вариант B (c=1.8 мм)</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-slate-600 block">Пропуски (0)</span>
              <input
                type="number"
                min={0}
                value={newRow.events0}
                onChange={(e) => setNewRow({ ...newRow, events0: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600 block">Одиночные (1)</span>
              <input
                type="number"
                min={0}
                value={newRow.events1}
                onChange={(e) => setNewRow({ ...newRow, events1: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600 block">Дубли (2+)</span>
              <input
                type="number"
                min={0}
                value={newRow.events2Plus}
                onChange={(e) => setNewRow({ ...newRow, events2Plus: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600 block">Неопред. (U)</span>
              <input
                type="number"
                min={0}
                value={newRow.eventsU}
                onChange={(e) => setNewRow({ ...newRow, eventsU: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600 block">Длит. (с)</span>
              <input
                type="number"
                min={1}
                step={0.1}
                value={newRow.durationSec}
                onChange={(e) => setNewRow({ ...newRow, durationSec: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить серию в журнал
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
