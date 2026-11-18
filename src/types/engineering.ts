export type DiscVariantId = 'A' | 'B' | 'custom';

export interface DiscParams {
  variantId: DiscVariantId;
  outerDiameter: number; // D, mm (default 120)
  pitchDiameter: number; // Dp, mm (default 94)
  thickness: number; // H, mm (default 10)
  cellCount: number; // N (8, 12, 16)
  cellDiameter: number; // D_cell, mm (default 9.2)
  cellDepth: number; // h_cell, mm (default 7.8)
  entryChamfer: number; // c_chamfer, mm (0.0 for A, 1.8 for B)
  shaftDiameter: number; // nominal shaft mm (8.0)
  printClearance: number; // print clearance mm (+0.20)
  targetRateSps: number; // target seeds/sec (default 2.0)
  cutoffGapMm: number; // adjustable cutoff clearance (default 1.2)
}

export interface InvariantCheckResult {
  chordPitchMm: number;
  webThicknessMm: number;
  outerRimWallMm: number;
  bottomFloorMm: number;
  innerHubClearanceMm: number;
  rpm: number;
  eventIntervalMs: number;
  fillTimeMs: number;
  stepFreqHz: number;
  estimatedMassGrams: number;
  estimatedPrintMinutes: number;
  valid: boolean;
  warnings: string[];
}

export interface TestProtocolEntry {
  id: 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';
  scenario: string;
  expected: string;
  actual: string;
  evidence: string;
  defectFound: string;
  fixApplied: string;
  retestResult: string;
  status: 'Пройден после доработки' | 'Пройден';
}

export type EventOutcome = '0' | '1' | '2+' | 'U';

export interface TrialLogRow {
  id: string;
  seriesId: string;
  discVersion: 'Вариант A (c=0 мм)' | 'Вариант B (c=1.8 мм)';
  printParams: string;
  measuredCellDiaMm: number;
  measuredShaftMm: number;
  seedBatch: string;
  hopperFillPct: number;
  targetRpm: number;
  actualRpm: number;
  durationSec: number;
  events0: number;
  events1: number;
  events2Plus: number;
  eventsU: number;
  outOfWindowSeeds: number;
  disputedEpisodes: number;
  damagedSeeds: number;
  jams: number;
  interventions: number;
  notes: string;
}

export interface BomItem {
  code: string;
  category: 'Печатные детали (PETG)' | 'Привод и электроника' | 'Крепёж и механика' | 'Расходники и учёт';
  name: string;
  spec: string;
  qty: number;
  unit: string;
  unitPriceRub: number;
  printTimeMin?: number;
  massGrams?: number;
}
