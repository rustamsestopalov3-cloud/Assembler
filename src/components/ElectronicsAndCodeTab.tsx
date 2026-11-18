import React, { useMemo, useState } from 'react';
import { CheckCircle2, Download, Play, PowerOff, ShieldAlert } from 'lucide-react';
import { downloadTextFile } from '../generators/bundleExporter';
import { generateArduinoFirmware, generatePythonLogicTests } from '../generators/firmwareAndTests';
import { generateA3ReportMd } from '../generators/markdownReports';
import { generateElectricalSchematicSvg } from '../generators/svgDrawings';
import { DiscParams } from '../types/engineering';

interface ElectronicsAndCodeTabProps {
  params: DiscParams;
}

export const ElectronicsAndCodeTab: React.FC<ElectronicsAndCodeTabProps> = ({ params }) => {
  const [codeTab, setCodeTab] = useState<'ino' | 'py'>('ino');
  const [simRate, setSimRate] = useState<number>(params.targetRateSps);
  const [simState, setSimState] = useState<'IDLE' | 'RUNNING' | 'FAULT_NO_FEEDBACK'>('IDLE');
  const [simLog, setSimLog] = useState<string[]>([
    'BOOT_READY,STATE=IDLE,AUTOSTART=DISABLED (EN=HIGH, привод обесточен)',
  ]);

  const schematicSvg = useMemo(() => generateElectricalSchematicSvg(), []);
  const firmwareCode = useMemo(() => generateArduinoFirmware(params), [params]);
  const pythonTestCode = useMemo(() => generatePythonLogicTests(), []);

  const simRpm = (simRate * 60) / params.cellCount;
  const simStepUs = Math.round(1_000_000 / ((simRpm / 60) * 3200));

  const handleSimStart = () => {
    setSimState('RUNNING');
    setSimLog((prev) => [
      ...prev.slice(-6),
      `START,rate_sps=${simRate.toFixed(2)},rpm=${simRpm.toFixed(2)},step_us=${simStepUs}`,
    ]);
  };

  const handleSimPowerCut = () => {
    setSimState('IDLE');
    setSimLog((prev) => [
      ...prev.slice(-6),
      'POWER_LOSS_&_RESTORE → BOOT_READY,STATE=IDLE,AUTOSTART=DISABLED (серия сброшена, С6 пройден)',
    ]);
  };

  const handleSimSensorTimeout = () => {
    setSimState('FAULT_NO_FEEDBACK');
    setSimLog((prev) => [
      ...prev.slice(-6),
      `NO_ROTATION_FEEDBACK (нет импульсов LM393 > ${(Math.round((1000 / simRate) * 2.5) + 400)} мс) → EN=HIGH (заклинивание не заявляется)`,
    ]);
  };

  const handleSimTrashDivert = () => {
    setSimLog((prev) => [
      ...prev.slice(-6),
      'LASER_KY008_TRIGGER (D3) → Заслонка SG90 (D11) открыта 68° на 380 мс → мусор отведён в боковой лоток',
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Часть А3 · Электроника 12 В DC · Прошивка и логические тесты (С5, С6)
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Электрическая схема, управление и подтверждение вращения
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadTextFile(generateA3ReportMd(), 'A3_control_and_safety_manual.md')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Инструкция А3 (.md)
          </button>
          <button
            type="button"
            onClick={() =>
              downloadTextFile(schematicSvg, 'electrical_schematic.svg', 'image/svg+xml;charset=utf-8')
            }
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Скачать схему (.svg)
          </button>
        </div>
      </div>

      {/* Electrical Schematic SVG */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
        <div
          className="w-full max-w-[1140px] mx-auto [&>svg]:w-full [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: schematicSvg }}
        />
      </section>

      {/* Interactive Software Verification Simulator (C5 / C6) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              01. Программная проверка логики управления (С5 и С6)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Проверяет расчёт частоты шагов и запрет самозапуска при потере питания. Не является доказательством реального вращения или подачи семян (Б1).
            </p>
          </div>
          <div className="font-mono text-xs font-semibold text-slate-900">
            Состояние контроллера:{' '}
            <span
              className={
                simState === 'RUNNING'
                  ? 'text-teal-700'
                  : simState === 'FAULT_NO_FEEDBACK'
                    ? 'text-red-700'
                    : 'text-slate-700'
              }
            >
              {simState}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pt-2">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-700">Подача Q (С5)</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {simRate.toFixed(1)} сем/с · {simRpm.toFixed(2)} об/мин
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={6.0}
              step={0.5}
              value={simRate}
              onChange={(e) => setSimRate(parseFloat(e.target.value))}
              className="w-full accent-teal-700 cursor-pointer"
            />
            <div className="text-xs font-mono text-slate-600 tabular-nums">
              Период STEP: {simStepUs} мкс ({Math.round(1_000_000 / simStepUs)} Гц)
            </div>
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSimStart}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              Команда START
            </button>
            <button
              type="button"
              onClick={handleSimPowerCut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap"
            >
              <PowerOff className="w-3.5 h-3.5" />
              Тест С6: Сбой и возврат питания
            </button>
            <button
              type="button"
              onClick={handleSimSensorTimeout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg whitespace-nowrap"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Тест А3: Обрыв сигнала датчика
            </button>
            <button
              type="button"
              onClick={handleSimTrashDivert}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg whitespace-nowrap"
            >
              Тест лазера: Отвод мусора SG90
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-900 text-emerald-300 rounded-lg font-mono text-xs space-y-1">
          {simLog.map((line, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
              <span>{line}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Firmware & Python Tests Code View */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setCodeTab('ino')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                codeTab === 'ino' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Прошивка Arduino (seeder_controller.ino)
            </button>
            <button
              type="button"
              onClick={() => setCodeTab('py')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                codeTab === 'py' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Автотесты С5/С6 (test_controller_logic.py)
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              codeTab === 'ino'
                ? downloadTextFile(firmwareCode, 'seeder_controller.ino')
                : downloadTextFile(pythonTestCode, 'test_controller_logic.py')
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Скачать {codeTab === 'ino' ? 'seeder_controller.ino' : 'test_controller_logic.py'}
          </button>
        </div>

        <pre className="p-5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[480px] leading-relaxed">
          {codeTab === 'ino' ? firmwareCode : pythonTestCode}
        </pre>
      </section>

    </div>
  );
};
