import { useState } from 'react';
import { Download } from 'lucide-react';
import { AccountingAndLogTab } from './components/AccountingAndLogTab';
import { CadViewport3D } from './components/CadViewport3D';
import { DrawingsAndSlicingTab } from './components/DrawingsAndSlicingTab';
import { ElectronicsAndCodeTab } from './components/ElectronicsAndCodeTab';
import { ProtocolAndFinalTab } from './components/ProtocolAndFinalTab';
import { INITIAL_TRIAL_LOGS, VARIANT_B_PARAMS } from './data/deliverablesContent';
import { downloadFullDeliverablesZip } from './generators/bundleExporter';
import { DiscParams, TrialLogRow } from './types/engineering';

type ActiveSection = 'cad' | 'drawings' | 'electronics' | 'accounting' | 'protocol';

const NAV_ITEMS: Array<{ id: ActiveSection; label: string }> = [
  { id: 'cad', label: '3D САПР и STL' },
  { id: 'drawings', label: 'Чертежи и Печать' },
  { id: 'electronics', label: 'Схема и Прошивка' },
  { id: 'accounting', label: 'Учёт и Журнал' },
  { id: 'protocol', label: 'Протокол Б1–Б3' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveSection>('cad');
  const [params, setParams] = useState<DiscParams>(VARIANT_B_PARAMS);
  const [logRows, setLogRows] = useState<TrialLogRow[]>(INITIAL_TRIAL_LOGS);
  const [exportingZip, setExportingZip] = useState(false);

  const handleDownloadAllZip = async () => {
    if (exportingZip) return;
    setExportingZip(true);
    try {
      await downloadFullDeliverablesZip(params, logRows);
    } finally {
      setExportingZip(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 1 row, 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => setActiveTab('cad')}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
        >
          Assembler
        </button>

        {/* Zone 2: 5 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 h-full overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`h-full inline-flex items-center text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'border-teal-700 text-teal-800 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={handleDownloadAllZip}
            disabled={exportingZip}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {exportingZip ? 'Сборка ZIP...' : 'Скачать всё (ZIP)'}
          </button>
        </div>
      </header>

      {/* Mobile Nav Bar (shown only below md) */}
      <div className="md:hidden flex items-center gap-1 overflow-x-auto bg-white border-b border-slate-200 px-4 py-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === item.id
                ? 'bg-teal-700 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {activeTab === 'cad' && (
          <CadViewport3D params={params} onChangeParams={setParams} />
        )}
        {activeTab === 'drawings' && <DrawingsAndSlicingTab params={params} />}
        {activeTab === 'electronics' && <ElectronicsAndCodeTab params={params} />}
        {activeTab === 'accounting' && (
          <AccountingAndLogTab logRows={logRows} onChangeLogs={setLogRows} />
        )}
        {activeTab === 'protocol' && <ProtocolAndFinalTab />}
      </main>
    </div>
  );
}
