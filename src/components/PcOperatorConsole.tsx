import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Gauge,
  Pause,
  Play,
  PowerOff,
  RotateCcw,
  Send,
  ShieldAlert,
  Terminal,
  Trash2,
} from 'lucide-react';
import { DiscParams } from '../types/engineering';

export type MachineControllerState =
  | 'IDLE'
  | 'RUNNING'
  | 'ANTI_JAM_REVERSE'
  | 'STOPPED_BY_USER';

interface PcOperatorConsoleProps {
  params: DiscParams;
  isRunning: boolean;
  controllerState: MachineControllerState;
  liveTelemetry: {
    pulseCount: number;
    activeCell: number;
    activeCup: number;
    cupFilled: boolean[];
    ledActive: boolean;
    laserAlert: boolean;
    singles: number;
    doubles: number;
    misses: number;
    trash: number;
    jamsCleared: number;
  };
  serialLog: string[];
  onStart: () => void;
  onStop: () => void;
  onEStop: () => void;
  onSetRate: (rate: number) => void;
  onInjectTrash: () => void;
  onTriggerJam: () => void;
  onResetCups: () => void;
  onSendCommand: (cmd: string) => void;
}

export const PcOperatorConsole: React.FC<PcOperatorConsoleProps> = ({
  params,
  isRunning,
  controllerState,
  liveTelemetry,
  serialLog,
  onStart,
  onStop,
  onEStop,
  onSetRate,
  onInjectTrash,
  onTriggerJam,
  onResetCups,
  onSendCommand,
}) => {
  const [cmdInput, setCmdInput] = useState('');

  const rpm = (params.targetRateSps * 60) / params.cellCount;
  const stepFreqHz = Math.round((rpm / 60) * 3200);
  const stepUs = Math.round(1_000_000 / Math.max(1, stepFreqHz));

  const totalSeedEvents =
    liveTelemetry.singles + liveTelemetry.doubles + liveTelemetry.misses;
  const p1Pct =
    totalSeedEvents > 0 ? (liveTelemetry.singles / totalSeedEvents) * 100 : 100;

  const handleSubmitCmd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = cmdInput.trim();
    if (!trimmed) return;
    onSendCommand(trimmed);
    setCmdInput('');
  };

  const stateBadgeStyle =
    controllerState === 'RUNNING'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : controllerState === 'ANTI_JAM_REVERSE'
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        : controllerState === 'STOPPED_BY_USER'
          ? 'bg-red-500/20 text-red-300 border-red-500/40'
          : 'bg-slate-700 text-slate-300 border-slate-600';

  const stateLabel =
    controllerState === 'RUNNING'
      ? 'STATE_RUNNING (РАБОТА)'
      : controllerState === 'ANTI_JAM_REVERSE'
        ? 'STATE_ANTI_JAM_REVERSE (РЕВЕРС -15°)'
        : controllerState === 'STOPPED_BY_USER'
          ? 'STATE_IDLE (E-STOP / СТОП)'
          : 'STATE_IDLE (ОЖИДАНИЕ)';

  return (
    <section className="bg-slate-950 border-t border-slate-800 text-slate-100">
      {/* Desktop Software Window Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <Cpu className="w-4 h-4 text-teal-400 ml-1" />
          <span className="font-mono text-xs font-semibold text-slate-100">
            Assembler Seeder Studio v2.5 — ПК оператора (USB COM3 · 115200 бод)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-slate-400 tabular-nums hidden sm:inline">
            EN={isRunning ? 'LOW (Привод ВКЛ)' : 'HIGH (Обесточен)'} · STEP={stepFreqHz} Гц ({stepUs} мкс)
          </span>
          <span className={`px-2.5 py-0.5 rounded border font-mono text-[11px] font-semibold ${stateBadgeStyle}`}>
            {stateLabel}
          </span>
        </div>
      </div>

      {/* Main 3-Column Operator Interface */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 p-4">
        {/* Col 1: Start/Stop/E-Stop + Real-time Speed Control */}
        <div className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              1. Пульт управления приводом
            </span>
            <span className="font-mono text-xs text-teal-400 font-semibold tabular-nums">
              {params.targetRateSps.toFixed(1)} сем/с · {rpm.toFixed(1)} об/мин
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onStart}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                isRunning
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              ПУСК
            </button>
            <button
              type="button"
              onClick={onStop}
              className="flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              СТОП
            </button>
            <button
              type="button"
              onClick={onEStop}
              className="flex items-center justify-center gap-1.5 py-2 px-2 bg-red-600 hover:bg-red-500 text-white rounded-md text-xs font-bold transition-colors cursor-pointer"
            >
              <PowerOff className="w-3.5 h-3.5" />
              E-STOP
            </button>
          </div>

          <div className="pt-1 space-y-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <Gauge className="w-3.5 h-3.5 text-teal-400" />
                Задание скорости подачи (С5):
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSetRate(Math.max(0.5, Math.round((params.targetRateSps - 0.5) * 10) / 10))}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded font-mono text-xs font-bold cursor-pointer"
                >
                  −0.5
                </button>
                <button
                  type="button"
                  onClick={() => onSetRate(Math.min(6.0, Math.round((params.targetRateSps + 0.5) * 10) / 10))}
                  className="px-2 py-0.5 bg-teal-700 hover:bg-teal-600 rounded font-mono text-xs font-bold text-white cursor-pointer"
                >
                  +0.5
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[1.0, 2.0, 3.0, 4.5, 6.0].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onSetRate(v)}
                  className={`py-1 rounded font-mono text-xs font-semibold border transition-colors cursor-pointer ${
                    Math.abs(params.targetRateSps - v) < 0.05
                      ? 'bg-teal-600 border-teal-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {v.toFixed(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Col 2: Live 8-Cup Indexing Strip, Sensor Status & Stress/Jam Controls */}
        <div className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              2. Каретка стаканчиков и датчики
            </span>
            <button
              type="button"
              onClick={onResetCups}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[11px] font-mono text-slate-300 cursor-pointer"
              title="Очистить стаканы #1..#8 и счётчики"
            >
              <RotateCcw className="w-3 h-3" />
              Очистить
            </button>
          </div>

          {/* 8-Cup Live Indexing & Fill Indicator */}
          <div className="p-2 bg-slate-950 border border-slate-800 rounded space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Закладка по стаканам (#1..#8):</span>
              <span className="text-emerald-400 font-semibold tabular-nums">
                Точность P₁: {p1Pct.toFixed(1)}%
              </span>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: 8 }, (_, idx) => {
                const isFilled = liveTelemetry.cupFilled[idx];
                const isActive = liveTelemetry.activeCup === idx + 1;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-center py-1 rounded border font-mono text-[10px] transition-colors ${
                      isActive
                        ? 'border-teal-400 bg-teal-950/70 text-teal-200'
                        : isFilled
                          ? 'border-emerald-700/70 bg-emerald-950/50 text-emerald-300'
                          : 'border-slate-800 bg-slate-900 text-slate-500'
                    }`}
                  >
                    <span className="font-bold">#{idx + 1}</span>
                    <span className="text-[11px] leading-none mt-0.5">
                      {isFilled ? '●' : '○'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded">
              <div className="text-slate-400">LM393 (D2) · Клин: {liveTelemetry.jamsCleared}</div>
              <div className={`font-semibold ${liveTelemetry.ledActive ? 'text-emerald-400' : 'text-slate-200'}`}>
                Яч.#{liveTelemetry.activeCell} · Импульсов: {liveTelemetry.pulseCount}
              </div>
            </div>
            <div className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded">
              <div className="text-slate-400">KY-008 + SG90</div>
              <div className={`font-semibold ${liveTelemetry.laserAlert ? 'text-red-400' : 'text-teal-400'}`}>
                {liveTelemetry.laserAlert
                  ? 'МУСОР → ВЕТКА!'
                  : `Норма · Стакан #${liveTelemetry.activeCup}`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onInjectTrash}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-red-600/90 hover:bg-red-500 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Подбросить мусор
            </button>
            <button
              type="button"
              onClick={onTriggerJam}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Заклинивание диска
            </button>
          </div>
          {controllerState === 'ANTI_JAM_REVERSE' && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-950/70 border border-amber-700/60 rounded text-[11px] font-mono text-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>Остановка LM393 → авто-реверс −15° и сброс в ветку...</span>
            </div>
          )}
        </div>

        {/* Col 3: Interactive Serial Terminal (COM3) */}
        <div className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              Монитор порта COM3
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              START, STOP, SET_RATE 4.0, JAM, TRASH
            </span>
          </div>

          <div className="h-32 overflow-y-auto bg-slate-950 border border-slate-800 rounded p-2 font-mono text-[11px] space-y-0.5 text-emerald-300">
            {serialLog.map((line, i) => (
              <div
                key={i}
                className={
                  line.includes('WARN') || line.includes('JAM')
                    ? 'text-amber-300'
                    : line.includes('TRASH') || line.includes('E-STOP')
                      ? 'text-red-300'
                      : line.startsWith('>')
                        ? 'text-sky-300'
                        : 'text-emerald-300'
                }
              >
                {line}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmitCmd} className="flex gap-1.5">
            <input
              type="text"
              value={cmdInput}
              onChange={(e) => setCmdInput(e.target.value)}
              placeholder="Введите команду (напр. SET_RATE 5.0 или JAM)..."
              className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
            >
              <Send className="w-3 h-3" />
              Отпр.
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

