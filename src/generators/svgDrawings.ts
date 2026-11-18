import { DiscParams } from '../types/engineering';

export function generateDiscCriticalDrawingSvg(params: DiscParams): string {
  const N = params.cellCount;
  const cx = 275;
  const cy = 266;
  const scale = 2.85; // 1 mm = 2.85 px -> Ø120 = 342 px (R=171)
  const R = (params.outerDiameter / 2) * scale;
  const Rp = (params.pitchDiameter / 2) * scale;
  const rCell = (params.cellDiameter / 2) * scale;
  const rChamfer = (params.cellDiameter / 2 + params.entryChamfer) * scale;
  const rBore = ((params.shaftDiameter + params.printClearance) / 2) * scale;
  const rEnc = 27 * scale;

  const cellsSvg = Array.from({ length: N }, (_, i) => {
    const a = (i * 2 * Math.PI) / N - Math.PI / 2;
    const x = cx + Math.cos(a) * Rp;
    const y = cy + Math.sin(a) * Rp;
    const ex = cx + Math.cos(a) * rEnc;
    const ey = cy + Math.sin(a) * rEnc;
    const deg = (a * 180) / Math.PI + 90;
    const labelX = cx + Math.cos(a) * (R - 12.5);
    const labelY = cy + Math.sin(a) * (R - 12.5);
    return `
      <g>
        ${params.entryChamfer > 0 ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rChamfer.toFixed(1)}" fill="#F0FDFA" stroke="#0F766E" stroke-width="1.2" stroke-dasharray="4,2"/>` : ''}
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rCell.toFixed(1)}" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.8"/>
        <line x1="${(x - rCell - 5).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + rCell + 5).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#64748B" stroke-width="0.6" stroke-dasharray="4,2,1,2"/>
        <line x1="${x.toFixed(1)}" y1="${(y - rCell - 5).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + rCell + 5).toFixed(1)}" stroke="#64748B" stroke-width="0.6" stroke-dasharray="4,2,1,2"/>
        <rect x="${(ex - 4.4).toFixed(1)}" y="${(ey - 8).toFixed(1)}" width="8.8" height="16" rx="1.2" transform="rotate(${deg.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)})" fill="#E2E8F0" stroke="#334155" stroke-width="1.1"/>
        <text x="${labelX.toFixed(1)}" y="${(labelY + 3.2).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.5" font-weight="700" fill="#0F172A">${i + 1}</text>
      </g>
    `;
  }).join('');

  const mountHolesSvg = [0, 1, 2]
    .map((i) => {
      const a = (i * 2 * Math.PI) / 3 - Math.PI / 2;
      const hx = cx + Math.cos(a) * (12 * scale);
      const hy = cy + Math.sin(a) * (12 * scale);
      return `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${(1.65 * scale).toFixed(1)}" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.4"/>`;
    })
    .join('');

  const webMm = (
    params.pitchDiameter * Math.sin(Math.PI / N) -
    (params.cellDiameter + 2 * params.entryChamfer)
  ).toFixed(2);
  const bottomMm = (params.thickness - params.cellDepth).toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1180 650" width="1180" height="650">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#1D4ED8"/>
    </marker>
    <marker id="arrowBlk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#0F172A"/>
    </marker>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F1F5F9" stroke-width="0.9"/>
    </pattern>
    <pattern id="hatch" width="7" height="7" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="7" stroke="#64748B" stroke-width="1.0"/>
    </pattern>
  </defs>

  <!-- Background & Engineering Grid -->
  <rect width="1180" height="650" fill="#FFFFFF"/>
  <rect x="18" y="18" width="1144" height="614" fill="url(#grid)" stroke="#0F172A" stroke-width="2.2"/>
  <rect x="24" y="24" width="1132" height="602" fill="none" stroke="#64748B" stroke-width="0.8"/>

  <!-- Left View Header -->
  <text x="275" y="48" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#0F172A">ВИД СПЕРЕДИ · ДИСК СМЕННЫЙ (N = ${N})</text>
  <line x1="538" y1="24" x2="538" y2="626" stroke="#CBD5E1" stroke-width="1.1"/>

  <!-- Centerlines -->
  <line x1="60" y1="${cy}" x2="498" y2="${cy}" stroke="#94A3B8" stroke-width="0.9" stroke-dasharray="16,3,2,3"/>
  <line x1="${cx}" y1="64" x2="${cx}" y2="482" stroke="#94A3B8" stroke-width="0.9" stroke-dasharray="16,3,2,3"/>

  <!-- Outer Disc & Pitch Circle -->
  <circle cx="${cx}" cy="${cy}" r="${R.toFixed(1)}" fill="#F8FAFC" fill-opacity="0.82" stroke="#0F172A" stroke-width="2.4"/>
  <circle cx="${cx}" cy="${cy}" r="${Rp.toFixed(1)}" fill="none" stroke="#1D4ED8" stroke-width="1.1" stroke-dasharray="8,3,2,3"/>
  <circle cx="${cx}" cy="${cy}" r="${rEnc.toFixed(1)}" fill="none" stroke="#64748B" stroke-width="0.9" stroke-dasharray="4,3"/>

  ${cellsSvg}

  <!-- Central D-Shaft Bore & 3xM3 Mounting Holes -->
  <circle cx="${cx}" cy="${cy}" r="${rBore.toFixed(1)}" fill="#FFFFFF" stroke="#0F172A" stroke-width="2.2"/>
  <line x1="${(cx + rBore - 2.3).toFixed(1)}" y1="${(cy - rBore * 0.78).toFixed(1)}" x2="${(cx + rBore - 2.3).toFixed(1)}" y2="${(cy + rBore * 0.78).toFixed(1)}" stroke="#0F172A" stroke-width="2.4"/>
  ${mountHolesSvg}

  <!-- Section Cut Arrows B-B (ESKD) -->
  <line x1="74" y1="${cy}" x2="108" y2="${cy}" stroke="#0F172A" stroke-width="3.6"/>
  <line x1="92" y1="${cy}" x2="92" y2="${cy - 22}" stroke="#0F172A" stroke-width="1.3" marker-end="url(#arrowBlk)"/>
  <text x="80" y="${cy - 10}" font-family="Plus Jakarta Sans, sans-serif" font-size="13.5" font-weight="700" fill="#0F172A">В</text>

  <line x1="442" y1="${cy}" x2="476" y2="${cy}" stroke="#0F172A" stroke-width="3.6"/>
  <line x1="458" y1="${cy}" x2="458" y2="${cy - 22}" stroke="#0F172A" stroke-width="1.3" marker-end="url(#arrowBlk)"/>
  <text x="466" y="${cy - 10}" font-family="Plus Jakarta Sans, sans-serif" font-size="13.5" font-weight="700" fill="#0F172A">В</text>

  <!-- Bore Leader Callout (upper-left) -->
  <polyline points="${cx - 6},${cy - 6} ${cx - 58},${cy - 78} ${cx - 210},${cy - 78}" fill="none" stroke="#0F172A" stroke-width="1.2"/>
  <text x="${cx - 64}" y="${cy - 85}" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F172A">Ø${(params.shaftDiameter + params.printClearance).toFixed(2)} (+0.15/+0.05)</text>
  <text x="${cx - 64}" y="${cy - 64}" text-anchor="end" font-family="IBM Plex Sans, sans-serif" font-size="9.5" fill="#475569">D-вал Ø8.0 мм (D5)</text>

  <!-- Encoder Slot Callout (upper-right) -->
  <polyline points="${cx + rEnc * 0.65},${cy - rEnc * 0.72} ${cx + 96},${cy - 102} ${cx + 230},${cy - 102}" fill="none" stroke="#334155" stroke-width="1.1"/>
  <text x="${cx + 100}" y="${cy - 109}" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="600" fill="#334155">${N} пазов LM393 (3.2×6 мм)</text>

  <!-- Bottom Dimension Lines -->
  <line x1="${cx - Rp}" y1="${cy}" x2="${cx - Rp}" y2="520" stroke="#1D4ED8" stroke-width="0.8"/>
  <line x1="${cx + Rp}" y1="${cy}" x2="${cx + Rp}" y2="520" stroke="#1D4ED8" stroke-width="0.8"/>
  <line x1="${cx - Rp + 3}" y1="514" x2="${cx + Rp - 3}" y2="514" stroke="#1D4ED8" stroke-width="1.4" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text x="${cx}" y="506" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="700" fill="#1D4ED8">Ø ${params.pitchDiameter.toFixed(1)} ±0.20 (D2 делительный)</text>

  <line x1="${cx - R}" y1="${cy}" x2="${cx - R}" y2="564" stroke="#1D4ED8" stroke-width="0.8"/>
  <line x1="${cx + R}" y1="${cy}" x2="${cx + R}" y2="564" stroke="#1D4ED8" stroke-width="0.8"/>
  <line x1="${cx - R + 3}" y1="558" x2="${cx + R - 3}" y2="558" stroke="#1D4ED8" stroke-width="1.4" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text x="${cx}" y="550" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11.5" font-weight="700" fill="#1D4ED8">Ø ${params.outerDiameter.toFixed(1)} ±0.30 (D1 наружный)</text>

  <!-- Left Footer Spec Note -->
  <text x="275" y="604" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.5" fill="#475569">Мин. перемычка: ${webMm} мм · Неуказанные допуски ±0.25 мм (FDM PETG)</text>

  <!-- Right Column: Section B-B + Detail View I (M 4:1) -->
  <text x="855" y="48" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#0F172A">РАЗРЕЗ В-В (ОРИЕНТАЦИЯ ПЕЧАТИ +Z ВВЕРХ)</text>

  <!-- Print Bed Line -->
  <line x1="560" y1="218" x2="1128" y2="218" stroke="#0F766E" stroke-width="1.8" stroke-dasharray="8,4"/>
  <text x="1125" y="236" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F766E">СТОЛ ПРИНТЕРА Z = 0 · ПОДДЕРЖКИ: 0</text>

  <!-- Disc Body Cross-Section -->
  <rect x="615" y="146" width="430" height="72" fill="url(#hatch)" stroke="#0F172A" stroke-width="2"/>
  <rect x="805" y="146" width="50" height="72" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.6"/>

  <!-- Left Cell Cutout -->
  <rect x="658" y="146" width="56" height="56" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.7"/>
  ${params.entryChamfer > 0 ? `
    <polygon points="644,146 658,146 658,160" fill="#FFFFFF" stroke="#0F766E" stroke-width="1.8"/>
    <polygon points="714,146 728,146 714,160" fill="#FFFFFF" stroke="#0F766E" stroke-width="1.8"/>
    <text x="686" y="132" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F766E">Фаска ${params.entryChamfer.toFixed(1)}×45° (Вар. B)</text>
  ` : `
    <text x="686" y="132" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#334155">Прямая кромка 90° (Вар. A)</text>
  `}

  <!-- Right Cell Cutout -->
  <rect x="946" y="146" width="56" height="56" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.7"/>
  ${params.entryChamfer > 0 ? `
    <polygon points="932,146 946,146 946,160" fill="#FFFFFF" stroke="#0F766E" stroke-width="1.8"/>
    <polygon points="1002,146 1016,146 1002,160" fill="#FFFFFF" stroke="#0F766E" stroke-width="1.8"/>
  ` : ''}

  <!-- Cell Diameter Dimension -->
  <line x1="658" y1="146" x2="658" y2="96" stroke="#1D4ED8" stroke-width="0.8"/>
  <line x1="714" y1="146" x2="714" y2="96" stroke="#1D4ED8" stroke-width="0.8"/>
  <line x1="661" y1="102" x2="711" y2="102" stroke="#1D4ED8" stroke-width="1.3" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text x="686" y="93" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" font-weight="700" fill="#1D4ED8">D_яч ${params.cellDiameter.toFixed(1)} (+0.2/-0.1) (D3)</text>

  <!-- Depth Dimension -->
  <line x1="1002" y1="146" x2="1076" y2="146" stroke="#1D4ED8" stroke-width="0.8"/>
  <line x1="1002" y1="202" x2="1076" y2="202" stroke="#1D4ED8" stroke-width="0.8"/>
  <line x1="1069" y1="149" x2="1069" y2="199" stroke="#1D4ED8" stroke-width="1.3" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text x="1077" y="178" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#1D4ED8">h=${params.cellDepth.toFixed(1)}±0.15</text>

  <!-- Thickness H Dimension -->
  <line x1="585" y1="146" x2="615" y2="146" stroke="#1D4ED8" stroke-width="0.8"/>
  <line x1="585" y1="218" x2="615" y2="218" stroke="#1D4ED8" stroke-width="0.8"/>
  <line x1="592" y1="149" x2="592" y2="215" stroke="#1D4ED8" stroke-width="1.3" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text x="583" y="185" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="11" font-weight="700" fill="#1D4ED8">H=${params.thickness.toFixed(1)}</text>

  <!-- Detail View I (Zoomed Cell Profile 4:1) -->
  <rect x="560" y="256" width="245" height="196" rx="4" fill="#FFFFFF" stroke="#334155" stroke-width="1.3"/>
  <text x="682" y="276" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="700" fill="#0F172A">ВЫНОСНОЙ ЭЛЕМЕНТ А (М 4:1)</text>
  <polygon points="590,312 628,312 ${params.entryChamfer > 0 ? '646,330' : '628,312'} 646,408 718,408 ${params.entryChamfer > 0 ? '718,330 736,312' : '718,312'} 774,312 774,432 590,432" fill="url(#hatch)" stroke="#0F172A" stroke-width="1.6"/>
  <rect x="646" y="${params.entryChamfer > 0 ? '330' : '312'}" width="72" height="${params.entryChamfer > 0 ? '78' : '96'}" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.4"/>
  ${params.entryChamfer > 0 ? `<polygon points="628,312 646,312 646,330" fill="#F0FDFA" stroke="#0F766E" stroke-width="1.5"/><polygon points="718,312 736,312 718,330" fill="#F0FDFA" stroke="#0F766E" stroke-width="1.5"/>` : ''}
  <!-- Seed outline inside cell -->
  <circle cx="682" cy="368" r="28" fill="#BEF264" fill-opacity="0.55" stroke="#3F6212" stroke-width="1.3" stroke-dasharray="4,2"/>
  <text x="682" y="372" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.5" font-weight="700" fill="#365314">Ø7.2 мм</text>
  <text x="682" y="424" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="600" fill="#0F172A">Дно t = ${bottomMm} мм (≥1.6)</text>

  <!-- Technical Notes Box -->
  <rect x="818" y="256" width="320" height="196" rx="4" fill="#F8FAFC" stroke="#334155" stroke-width="1.3"/>
  <text x="832" y="278" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="700" fill="#0F172A">ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ (А2):</text>
  <text x="832" y="300" font-family="IBM Plex Sans, sans-serif" font-size="10.2" fill="#334155">1. Материал: PETG (сопло 0.4 мм, слой 0.20 мм).</text>
  <text x="832" y="321" font-family="IBM Plex Sans, sans-serif" font-size="10.2" fill="#334155">2. Печать плашмя (+Z вверх), поддержки: 0.</text>
  <text x="832" y="342" font-family="IBM Plex Sans, sans-serif" font-size="10.2" fill="#334155">3. Периметры: 4; заполнение: 30% гироид.</text>
  <text x="832" y="363" font-family="IBM Plex Sans, sans-serif" font-size="10.2" fill="#334155">4. Шов Z: aligned (выведен на тыльную ступицу).</text>
  <text x="832" y="384" font-family="IBM Plex Sans, sans-serif" font-size="10.2" fill="#334155">5. Развёртка вала Ø8.0 мм; зачистка P400/P800.</text>
  <text x="832" y="408" font-family="IBM Plex Sans, sans-serif" font-size="10.2" font-weight="700" fill="#0F766E">6. Обязательный промер штангенциркулем</text>
  <text x="832" y="424" font-family="IBM Plex Sans, sans-serif" font-size="10.2" font-weight="700" fill="#0F766E">   всех 12 ячеек перед сборкой узла.</text>

  <!-- GOST Title Block (Основная надпись ГОСТ 2.104) -->
  <rect x="560" y="472" width="578" height="132" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.8"/>
  <line x1="560" y1="510" x2="1138" y2="510" stroke="#0F172A" stroke-width="1.1"/>
  <line x1="560" y1="544" x2="1138" y2="544" stroke="#0F172A" stroke-width="1.1"/>
  <line x1="560" y1="574" x2="1138" y2="574" stroke="#0F172A" stroke-width="1.1"/>
  <line x1="920" y1="472" x2="920" y2="604" stroke="#0F172A" stroke-width="1.1"/>
  <line x1="1028" y1="510" x2="1028" y2="604" stroke="#0F172A" stroke-width="1.1"/>

  <text x="740" y="497" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="13.5" font-weight="700" fill="#0F172A">AT9-3.01.001 Диск ячеистый (${params.entryChamfer > 0 ? 'Вариант B · фаска' : 'Вариант A · прямой'})</text>
  <text x="1029" y="497" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="12" font-weight="700" fill="#0F172A">М 1:1 · PETG</text>

  <text x="740" y="532" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="11" fill="#334155">Команда: Assembler · Профиль «Агротех» · Кейс AT9-3</text>
  <text x="974" y="532" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="600" fill="#0F172A">Масса ~38 г</text>
  <text x="1083" y="532" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.5" fill="#475569">Лист 1 / 2</text>

  <text x="740" y="564" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="10.5" fill="#475569">Культура: горох калиброванный (6.2–8.4 мм)</text>
  <text x="974" y="564" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.5" fill="#0F766E">0 поддержек</text>
  <text x="1083" y="564" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.5" fill="#475569">Слой 0.20</text>

  <text x="740" y="594" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.2" font-weight="600" fill="#0F172A">Перемычка ${webMm} мм · Зазор направл. 0.45 мм · Отв. сброса Ø17 мм</text>
  <text x="1029" y="594" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F766E">ДОПУСК ±0.15..0.30</text>
</svg>`;
}

export function generateAssemblySectionSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1180 660" width="1180" height="660">
  <defs>
    <marker id="arrB" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#1D4ED8"/>
    </marker>
    <pattern id="gridB" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F1F5F9" stroke-width="0.9"/>
    </pattern>
    <pattern id="hatchA" width="7" height="7" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="7" stroke="#94A3B8" stroke-width="1"/>
    </pattern>
    <pattern id="hatchB" width="7" height="7" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="7" stroke="#0F766E" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1180" height="660" fill="#FFFFFF"/>
  <rect x="18" y="18" width="1144" height="624" fill="url(#gridB)" stroke="#0F172A" stroke-width="2.2"/>
  <rect x="24" y="24" width="1132" height="612" fill="none" stroke="#64748B" stroke-width="0.8"/>

  <text x="590" y="48" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#0F172A">СЕЧЕНИЕ СБОРКИ А-А · ОТВЕРСТИЕ СБРОСА Ø17 ММ, МОСТ ДАТЧИКОВ, МИШЕНЬ А4 И КАРЕТКА SC8UU</text>

  <!-- Axis of Rotation -->
  <line x1="52" y1="240" x2="668" y2="240" stroke="#EF4444" stroke-width="1.1" stroke-dasharray="16,4,3,4"/>

  <!-- 1. NEMA 17 Stepper Motor -->
  <rect x="72" y="174" width="102" height="132" rx="4" fill="#E2E8F0" stroke="#0F172A" stroke-width="2"/>
  <text x="123" y="232" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="12" font-weight="700" fill="#0F172A">NEMA 17</text>
  <text x="123" y="252" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#475569">12V DC · 1.8°</text>

  <!-- 2. Protective Guard & Coupler -->
  <rect x="174" y="156" width="104" height="168" fill="none" stroke="#475569" stroke-width="2.2" stroke-dasharray="6,3"/>
  <rect x="193" y="216" width="66" height="48" rx="3" fill="#CBD5E1" stroke="#0F172A" stroke-width="1.6"/>
  <rect x="220" y="216" width="12" height="48" fill="#EF4444" fill-opacity="0.7" stroke="#991B1B" stroke-width="1"/>
  <text x="226" y="206" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.5" font-weight="700" fill="#0F172A">Муфта 5→8</text>

  <!-- 3. Bearing 608ZZ (with steel balls) & D-Shaft -->
  <rect x="278" y="140" width="46" height="200" fill="url(#hatchA)" stroke="#0F172A" stroke-width="1.7"/>
  <rect x="285" y="196" width="32" height="88" fill="#F1F5F9" stroke="#0F172A" stroke-width="1.5"/>
  <circle cx="301" cy="211" r="7" fill="#CBD5E1" stroke="#0F172A" stroke-width="1.2"/>
  <circle cx="301" cy="269" r="7" fill="#CBD5E1" stroke="#0F172A" stroke-width="1.2"/>
  <rect x="174" y="229" width="260" height="22" fill="#94A3B8" stroke="#0F172A" stroke-width="1.6"/>

  <!-- 4. Housing Body with Real Ø17mm Bottom Discharge Hole -->
  <path d="M 324,76 L 404,76 L 404,104 L 354,104 L 354,376 L 404,376 L 404,400 L 324,400 Z" fill="url(#hatchA)" stroke="#0F172A" stroke-width="1.9"/>
  <!-- Chamfered Aluminum Nozzle Ring around Ø17mm Hole (y=376..402) -->
  <rect x="372" y="376" width="56" height="26" fill="#FFFFFF" stroke="#0F766E" stroke-width="1.8" stroke-dasharray="4,2"/>
  <line x1="372" y1="376" x2="365" y2="376" stroke="#0F172A" stroke-width="2.2"/>
  <line x1="428" y1="376" x2="435" y2="376" stroke="#0F172A" stroke-width="2.2"/>
  <text x="400" y="393" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9" font-weight="700" fill="#0F766E">Ø17 мм</text>

  <!-- 5. Replaceable Seed Disc -->
  <rect x="366" y="112" width="30" height="256" fill="url(#hatchB)" stroke="#0F766E" stroke-width="2.2"/>
  <rect x="373" y="132" width="23" height="24" fill="#FFFFFF" stroke="#0F766E" stroke-width="1.4"/>
  <circle cx="384" cy="144" r="8" fill="#A3E635" stroke="#3F6212" stroke-width="1.2"/>
  <rect x="373" y="330" width="23" height="24" fill="#FFFFFF" stroke="#0F766E" stroke-width="1.4"/>
  <circle cx="384" cy="342" r="8" fill="#A3E635" stroke="#3F6212" stroke-width="1.2"/>

  <!-- 6. Thumbnut M5 -->
  <rect x="400" y="219" width="28" height="42" rx="2" fill="#F59E0B" stroke="#92400E" stroke-width="1.6"/>

  <!-- 7. Clear Removable Front Cover & 4x M4 -->
  <rect x="436" y="74" width="13" height="330" fill="#E0F2FE" fill-opacity="0.78" stroke="#0284C7" stroke-width="1.7"/>
  <rect x="404" y="84" width="54" height="10" fill="#64748B" stroke="#0F172A" stroke-width="1.2"/>
  <rect x="404" y="384" width="54" height="10" fill="#64748B" stroke="#0F172A" stroke-width="1.2"/>

  <!-- 8. Conical Hopper & 9. Cutoff Scraper -->
  <polygon points="449,94 624,64 624,162 449,162" fill="#F8FAFC" stroke="#334155" stroke-width="1.8"/>
  <text x="538" y="116" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="700" fill="#0F172A">БУНКЕР (скат 48°)</text>
  <text x="538" y="134" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#0F766E">шкала 75% · горловина</text>
  <rect x="402" y="166" width="32" height="18" fill="#F59E0B" stroke="#92400E" stroke-width="1.4"/>

  <!-- 10. Optical Encoder LM393 -->
  <rect x="296" y="294" width="28" height="36" fill="#15803D" stroke="#0F172A" stroke-width="1.4"/>
  <rect x="302" y="302" width="10" height="8" fill="#1E293B"/>
  <line x1="324" y1="312" x2="366" y2="312" stroke="#06B6D4" stroke-width="2" stroke-dasharray="3,2"/>

  <!-- 13. Calibration Target Plate A4 (1mm grid behind drop zone) -->
  <rect x="312" y="406" width="20" height="98" fill="#0F172A" stroke="#14B8A6" stroke-width="1.8"/>
  <text x="322" y="458" text-anchor="middle" transform="rotate(-90 322 458)" font-family="IBM Plex Mono, monospace" font-size="8.5" font-weight="700" fill="#2DD4BF">МИШЕНЬ А4 1ММ</text>

  <!-- 11. C-Bridge Laser Impurity Detector + Servo Diverter SG90 -->
  <rect x="342" y="418" width="28" height="16" rx="2" fill="#F59E0B" stroke="#0F172A" stroke-width="1.3"/>
  <rect x="438" y="418" width="24" height="16" rx="2" fill="#1E293B" stroke="#0F172A" stroke-width="1.3"/>
  <line x1="370" y1="426" x2="438" y2="426" stroke="#EF4444" stroke-width="2.5"/>
  <circle cx="436" cy="426" r="3.8" fill="#EF4444"/>

  <!-- Servo Diverter Flap -->
  <line x1="400" y1="454" x2="444" y2="486" stroke="#D97706" stroke-width="4.2" stroke-linecap="round"/>
  <circle cx="400" cy="454" r="5" fill="#0F172A"/>

  <!-- 14. Linear Cup Indexing Carriage (SC8UU + GT2 Belt + NEMA 14 + Cups #1..#8) -->
  <rect x="296" y="516" width="164" height="62" rx="4" fill="#F8FAFC" stroke="#334155" stroke-width="1.4" stroke-dasharray="5,3"/>
  <rect x="366" y="502" width="68" height="44" rx="4" fill="#E0F2FE" fill-opacity="0.75" stroke="#0F766E" stroke-width="1.8"/>
  <text x="400" y="528" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700" fill="#0F766E">СТАКАН #1..#8</text>
  <rect x="306" y="552" width="144" height="10" fill="#334155"/>
  <text x="378" y="573" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9" font-weight="700" fill="#0F172A">Каретка SC8UU + ремень GT2 + NEMA 14</text>

  <!-- Angled Trash Reject Branch (Right, Forward Z=60) -->
  <polygon points="436,454 550,512 536,532 422,474" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.5"/>
  <rect x="520" y="514" width="96" height="46" rx="4" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.8"/>
  <text x="568" y="536" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700" fill="#991B1B">МУСОР (Z=60)</text>
  <text x="568" y="551" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="8.5" fill="#991B1B">ветка отбраковки</text>

  <!-- 12. 2020 Bracket Mounted Camera -->
  <rect x="544" y="346" width="94" height="14" fill="#CBD5E1" stroke="#334155" stroke-width="1.4"/>
  <rect x="506" y="334" width="38" height="32" rx="3" fill="#1E293B" stroke="#0F172A" stroke-width="1.6"/>
  <circle cx="506" cy="350" r="7" fill="#38BDF8" stroke="#0F172A" stroke-width="1.4"/>
  <line x1="499" y1="354" x2="434" y2="412" stroke="#0284C7" stroke-width="1" stroke-dasharray="4,3"/>

  <!-- Callouts cleanly routed -->
  <polyline points="296,312 208,358 76,358" fill="none" stroke="#0F766E" stroke-width="1.2"/>
  <text x="76" y="351" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700" fill="#0F766E">Энкодер LM393 (INT0)</text>

  <polyline points="342,426 218,452 76,452" fill="none" stroke="#DC2626" stroke-width="1.2"/>
  <text x="76" y="444" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700" fill="#DC2626">С-мост KY-008 (650 нм)</text>

  <polyline points="312,482 218,498 76,498" fill="none" stroke="#0F172A" stroke-width="1.2"/>
  <text x="76" y="490" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700" fill="#0F172A">Мишень А4 (шаг 1 мм)</text>

  <polyline points="449,198 510,198 656,198" fill="none" stroke="#1D4ED8" stroke-width="1.1"/>
  <text x="515" y="191" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700" fill="#1D4ED8">Зазор отсекателя 1.2 мм</text>

  <polyline points="396,282 510,282 656,282" fill="none" stroke="#0F766E" stroke-width="1.1"/>
  <text x="515" y="275" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700" fill="#0F766E">Зазор направляющей 0.45 мм</text>

  <text x="588" y="338" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.5" font-weight="700" fill="#0284C7">Камера 60 fps (на 2020)</text>

  <!-- Specification Table on Right (1..14) -->
  <rect x="684" y="68" width="462" height="552" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.6"/>
  <rect x="684" y="68" width="462" height="32" fill="#0F172A"/>
  <text x="915" y="89" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF">СПЕЦИФИКАЦИЯ УЗЛОВ · КОМАНДА ASSEMBLER</text>

  <text x="702" y="122" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F172A">1. Привод NEMA 17 (12 В DC, 1.8°/шаг)</text>
  <text x="702" y="145" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F172A">2. Кожух вала и муфта 5→8 мм (Б3)</text>
  <text x="702" y="168" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F172A">3. Подшипник 608ZZ + D-вал Ø8.0 мм</text>
  <text x="702" y="191" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F766E">4. Корпус (PETG) + сквозное отв. сброса Ø17 мм</text>
  <text x="702" y="214" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F766E">5. Сменный диск AT9-3 (Вариант A / B)</text>
  <text x="702" y="237" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F172A">6. Гайка-барашек М5 (быстрый съём &lt;45 с)</text>
  <text x="702" y="260" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F172A">7. Прозрачная крышка ПЭТГ 3 мм + 4×М4</text>
  <text x="702" y="283" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F172A">8. Бункер конусный (скат 48°, шкала 75%)</text>
  <text x="702" y="306" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#92400E">9. Регулируемый отсекатель (0.5–3.0 мм)</text>
  <text x="702" y="329" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F766E">10. Энкодер LM393 (SOIC-8) + синхро-LED</text>
  <text x="702" y="352" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#DC2626">11. С-мост KY-008 + заслонка SG90 → урна Z=60</text>
  <text x="702" y="375" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0284C7">12. Камера 60 fps на кронштейне профиля 2020</text>
  <text x="702" y="398" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F172A">13. Калибровочная мишень А4 (шкала 1 мм)</text>
  <text x="702" y="421" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#1D4ED8">14. Линейная каретка SC8UU + GT2 + NEMA 14</text>

  <line x1="684" y1="442" x2="1146" y2="442" stroke="#CBD5E1" stroke-width="1.2"/>
  <text x="702" y="466" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="700" fill="#0F172A">ПРОВЕРКА КИНЕМАТИКИ И БЕЗОПАСНОСТИ (С3/С6):</text>
  <text x="702" y="490" font-family="IBM Plex Sans, sans-serif" font-size="10.5" fill="#334155">• Замена диска (~38 с) без снятия бункера, датчиков и привода.</text>
  <text x="702" y="512" font-family="IBM Plex Sans, sans-serif" font-size="10.5" fill="#334155">• Отверстие Ø17 мм с фаской исключает задевание семян о корпус.</text>
  <text x="702" y="534" font-family="IBM Plex Sans, sans-serif" font-size="10.5" fill="#334155">• Мишень А4 (1 мм) задаёт масштаб для видеоразбора 60 fps.</text>
  <text x="702" y="556" font-family="IBM Plex Sans, sans-serif" font-size="10.5" fill="#334155">• При потере импульсов LM393 — до 2 реверсов −15°, далее SAFE STOP.</text>
  <text x="702" y="586" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#0F766E">Направл.: 0.45 мм · Урна вынесена на Z=60 мм (свободный ход стаканов)</text>
</svg>`;
}

export function generateElectricalSchematicSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1180 680" width="1180" height="680">
  <defs>
    <pattern id="gridE" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F8FAFC" stroke-width="0.9"/>
    </pattern>
  </defs>

  <rect width="1180" height="680" fill="#FFFFFF"/>
  <rect x="18" y="18" width="1144" height="644" fill="url(#gridE)" stroke="#0F172A" stroke-width="2.2"/>
  <rect x="24" y="24" width="1132" height="632" fill="none" stroke="#64748B" stroke-width="0.8"/>

  <text x="590" y="48" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#0F172A">ПРИНЦИПИАЛЬНАЯ ЭЛЕКТРИЧЕСКАЯ СХЕМА · КОМАНДА ASSEMBLER (12 В DC · АНТИ-КЛИН −15° · КАРЕТКА NEMA 14 · USB COM3)</text>

  <!-- 1. Power Block 12V DC + Fuse + E-Stop -->
  <rect x="38" y="70" width="230" height="148" rx="6" fill="#FFFBEB" stroke="#D97706" stroke-width="1.9"/>
  <text x="153" y="92" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="12" font-weight="700" fill="#92400E">ПИТАНИЕ +12 В DC / 4 А</text>
  <text x="153" y="112" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#78350F">Безопасное напряжение ≤ 24 В</text>
  <rect x="78" y="124" width="44" height="14" fill="#FFFFFF" stroke="#78350F" stroke-width="1.4"/>
  <line x1="60" y1="131" x2="140" y2="131" stroke="#DC2626" stroke-width="1.6"/>
  <text x="195" y="135" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700" fill="#78350F">F1: 4.0 A</text>
  <line x1="60" y1="168" x2="92" y2="168" stroke="#B91C1C" stroke-width="1.8"/>
  <line x1="92" y1="168" x2="122" y2="156" stroke="#B91C1C" stroke-width="2.2"/>
  <line x1="122" y1="168" x2="145" y2="168" stroke="#B91C1C" stroke-width="1.8"/>
  <text x="200" y="172" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700" fill="#B91C1C">S0: E-STOP (NC)</text>
  <text x="153" y="202" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#78350F">TVS-диод 15В · Разрыв шины VMOT</text>

  <!-- 2. DC-DC 12V -> 5V -->
  <rect x="38" y="236" width="230" height="86" rx="6" fill="#F1F5F9" stroke="#334155" stroke-width="1.7"/>
  <text x="153" y="258" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="700" fill="#0F172A">DC-DC LM2596 (5.0 В / 2.5 А)</text>
  <text x="153" y="278" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#334155">IN+: +12V → OUT+: +5.0V (логика)</text>
  <text x="153" y="296" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#334155">Общая земля GND (звезда)</text>
  <text x="153" y="313" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9" fill="#64748B">МК, LM393, KY-008, OLED и SG90</text>

  <!-- 3. Operator Controls -->
  <rect x="38" y="338" width="230" height="106" rx="6" fill="#F8FAFC" stroke="#475569" stroke-width="1.6"/>
  <text x="153" y="359" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="700" fill="#0F172A">ПУЛЬТ УПРАВЛЕНИЯ (PULL-UP)</text>
  <text x="54" y="380" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700" fill="#0F766E">S1: ПУСК (START) ───→ D4</text>
  <text x="54" y="398" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700" fill="#B91C1C">S2: СТОП (STOP)  ───→ D5</text>
  <text x="54" y="416" font-family="IBM Plex Mono, monospace" font-size="10" fill="#1D4ED8">S3: СКОР.+ (RATE+) ─→ D6</text>
  <text x="54" y="434" font-family="IBM Plex Mono, monospace" font-size="10" fill="#1D4ED8">S4: СКОР.- (RATE-) ─→ D7</text>

  <!-- 4. OLED 0.96 I2C + USB PC Link -->
  <rect x="38" y="460" width="230" height="70" rx="6" fill="#0F172A" stroke="#0F766E" stroke-width="1.8"/>
  <text x="153" y="481" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="11" font-weight="700" fill="#34D399">OLED ЭКРАН SSD1306 (I2C)</text>
  <text x="153" y="500" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.8" fill="#E2E8F0">SDA → A4 · SCL → A5 · +5V/GND</text>
  <text x="153" y="518" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9" fill="#38BDF8">Сем/с, RPM, ячейка, брак, анти-клин</text>

  <rect x="38" y="544" width="230" height="62" rx="6" fill="#EFF6FF" stroke="#1D4ED8" stroke-width="1.7"/>
  <text x="153" y="566" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="11" font-weight="700" fill="#1E3A8A">ПК ОПЕРАТОРА (USB COM3)</text>
  <text x="153" y="584" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#1D4ED8">115200 бод · Assembler Studio v2.5</text>
  <text x="153" y="598" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="8.8" fill="#475569">START/STOP/SET_RATE/JAM/TRASH</text>

  <!-- +12V & +5V Bus Lines -->
  <line x1="153" y1="218" x2="153" y2="236" stroke="#DC2626" stroke-width="2.6"/>
  <line x1="268" y1="96" x2="758" y2="96" stroke="#DC2626" stroke-width="2.6"/>
  <circle cx="268" cy="96" r="3.5" fill="#DC2626"/>
  <text x="515" y="88" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.5" font-weight="700" fill="#DC2626">Шина +12V VMOT (через F1 и E-STOP)</text>

  <line x1="268" y1="278" x2="365" y2="278" stroke="#EA580C" stroke-width="2.2"/>
  <circle cx="315" cy="278" r="3.5" fill="#EA580C"/>
  <line x1="315" y1="278" x2="315" y2="132" stroke="#EA580C" stroke-width="1.6"/>
  <line x1="315" y1="132" x2="758" y2="132" stroke="#EA580C" stroke-width="1.6"/>
  <text x="310" y="268" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="700" fill="#EA580C">+5V</text>

  <line x1="268" y1="392" x2="365" y2="392" stroke="#475569" stroke-width="1.6"/>
  <line x1="268" y1="495" x2="365" y2="495" stroke="#0F766E" stroke-width="1.6"/>
  <line x1="268" y1="574" x2="365" y2="574" stroke="#1D4ED8" stroke-width="1.8" stroke-dasharray="4,2"/>

  <!-- 5. Arduino Nano MCU -->
  <rect x="365" y="152" width="280" height="454" rx="6" fill="#F8FAFC" stroke="#0F172A" stroke-width="2.2"/>
  <text x="505" y="178" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="13.5" font-weight="700" fill="#0F172A">ARDUINO NANO (ATmega328P)</text>
  <text x="505" y="196" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#475569">USB-UART 115200 бод · Телеметрия</text>
  <line x1="385" y1="208" x2="625" y2="208" stroke="#CBD5E1" stroke-width="1.2"/>

  <text x="382" y="232" font-family="IBM Plex Mono, monospace" font-size="10.2" font-weight="700" fill="#EA580C">+5V / GND ← DC-DC LM2596</text>
  <text x="382" y="260" font-family="IBM Plex Mono, monospace" font-size="10.2" font-weight="700" fill="#0F766E">D2 (INT0) ← Энкодер LM393 DO</text>
  <text x="382" y="288" font-family="IBM Plex Mono, monospace" font-size="10.2" font-weight="700" fill="#DC2626">D3 (INT1) ← Лазер мусора KY-008</text>
  <text x="382" y="316" font-family="IBM Plex Mono, monospace" font-size="10.2" fill="#0F172A">D4 / D5 ← Кнопки START / STOP</text>
  <text x="382" y="344" font-family="IBM Plex Mono, monospace" font-size="10.2" fill="#1D4ED8">D6 / D7 ← Кнопки RATE+ / RATE-</text>
  <text x="382" y="372" font-family="IBM Plex Mono, monospace" font-size="10.2" font-weight="700" fill="#B91C1C">D8 (EN)  → Оба TMC2209 (R1 10к→+5V)</text>
  <text x="382" y="400" font-family="IBM Plex Mono, monospace" font-size="10.2" fill="#0F172A">D9 (STEP1) / D10 (DIR1) → Диск</text>
  <text x="382" y="428" font-family="IBM Plex Mono, monospace" font-size="10.2" font-weight="700" fill="#1D4ED8">A0 (STEP2) / A1 (DIR2) → Каретка</text>
  <text x="382" y="456" font-family="IBM Plex Mono, monospace" font-size="10.2" font-weight="700" fill="#D97706">D11 (PWM) → Серво заслонки SG90</text>
  <text x="382" y="484" font-family="IBM Plex Mono, monospace" font-size="10.2" font-weight="700" fill="#059669">D12 → Синхро-LED (R2 330 Ом)</text>
  <text x="382" y="512" font-family="IBM Plex Mono, monospace" font-size="10.2" font-weight="700" fill="#0F766E">A4 / A5 (I2C) → OLED дисплей</text>
  <text x="382" y="544" font-family="IBM Plex Mono, monospace" font-size="9.5" font-weight="700" fill="#92400E">Анти-клин: 2× реверс DIR=LOW (−15°)</text>
  <text x="382" y="564" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#64748B">Первая строка setup(): EN=HIGH (IDLE)</text>
  <text x="382" y="584" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#1D4ED8">USB COM3 ↔ ПК оператора (Web/Serial)</text>

  <!-- 6. TMC2209 #1 (Disc Stepper NEMA 17) -->
  <rect x="758" y="72" width="235" height="148" rx="6" fill="#F0FDFA" stroke="#0F766E" stroke-width="1.9"/>
  <text x="875" y="94" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="700" fill="#0F766E">ДРАЙВЕР TMC2209 #1 (ДИСК)</text>
  <text x="772" y="116" font-family="IBM Plex Mono, monospace" font-size="9.8" fill="#0F172A">VMOT: +12V · C1 100 мкФ/25В · VIO: +5V</text>
  <text x="772" y="136" font-family="IBM Plex Mono, monospace" font-size="9.8" font-weight="700" fill="#B91C1C">EN (акт. LOW) + R1 10кОм → +5V</text>
  <text x="772" y="156" font-family="IBM Plex Mono, monospace" font-size="9.8" fill="#0F172A">STEP1 ← D9 · DIR1 ← D10 (реверс −15°)</text>
  <text x="772" y="176" font-family="IBM Plex Mono, monospace" font-size="9.8" fill="#0F172A">1A/1B · 2A/2B → NEMA 17 (1/16 шага)</text>
  <text x="875" y="204" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="9.2" font-weight="700" fill="#0F766E">R1 блокирует рывок при старте</text>

  <!-- 7. NEMA 17 Stepper -->
  <rect x="1028" y="88" width="114" height="114" rx="6" fill="#E2E8F0" stroke="#0F172A" stroke-width="1.9"/>
  <text x="1085" y="134" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="12" font-weight="700" fill="#0F172A">NEMA 17</text>
  <text x="1085" y="152" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#475569">Привод диска</text>
  <text x="1085" y="168" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#475569">1.8° · 1.2 A</text>
  <line x1="993" y1="124" x2="1028" y2="124" stroke="#0F172A" stroke-width="1.8"/>
  <line x1="993" y1="142" x2="1028" y2="142" stroke="#0F172A" stroke-width="1.8"/>
  <line x1="993" y1="160" x2="1028" y2="160" stroke="#1D4ED8" stroke-width="1.8"/>
  <line x1="993" y1="178" x2="1028" y2="178" stroke="#1D4ED8" stroke-width="1.8"/>

  <!-- 6B. TMC2209 #2 + NEMA 14 Linear Cup Carriage Drive -->
  <rect x="758" y="234" width="235" height="92" rx="6" fill="#EFF6FF" stroke="#1D4ED8" stroke-width="1.8"/>
  <text x="875" y="254" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="11" font-weight="700" fill="#1E3A8A">ДРАЙВЕР TMC2209 #2 (КАРЕТКА)</text>
  <text x="772" y="274" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#0F172A">VMOT: +12V · EN ← D8 · STEP2 ← A0</text>
  <text x="772" y="292" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#0F172A">DIR2 ← A1 · Шаг индексации: 24.0 мм</text>
  <text x="772" y="310" font-family="IBM Plex Mono, monospace" font-size="9.2" fill="#1D4ED8">Сдвиг стаканов #1..#8 на ремне GT2</text>

  <rect x="1028" y="242" width="114" height="76" rx="6" fill="#E2E8F0" stroke="#1D4ED8" stroke-width="1.7"/>
  <text x="1085" y="274" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="700" fill="#0F172A">NEMA 14</text>
  <text x="1085" y="294" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.2" fill="#475569">Ремень GT2</text>
  <line x1="993" y1="268" x2="1028" y2="268" stroke="#1D4ED8" stroke-width="1.8"/>
  <line x1="993" y1="292" x2="1028" y2="292" stroke="#1D4ED8" stroke-width="1.8"/>

  <!-- Wires MCU -> Drivers -->
  <polyline points="645,370 698,370 698,136 758,136" fill="none" stroke="#B91C1C" stroke-width="1.6"/>
  <polyline points="645,398 712,398 712,156 758,156" fill="none" stroke="#0F172A" stroke-width="1.6"/>
  <polyline points="645,426 724,426 724,274 758,274" fill="none" stroke="#1D4ED8" stroke-width="1.6"/>

  <!-- 8. Optical Sensor LM393 -->
  <rect x="758" y="340" width="384" height="78" rx="6" fill="#F0FDFA" stroke="#0F766E" stroke-width="1.8"/>
  <text x="950" y="362" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="700" fill="#0F766E">ДАТЧИК ВРАЩЕНИЯ LM393 (INT0 · D2)</text>
  <text x="950" y="382" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.8" fill="#115E59">+5V/GND · Выход DO → D2 · 12 прорезей диска</text>
  <text x="950" y="401" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.2" fill="#475569">Таймаут → 2× реверс −15°, при сбое → SAFE STOP</text>
  <polyline points="645,258 676,258 676,378 758,378" fill="none" stroke="#0F766E" stroke-width="1.8"/>

  <!-- 9. Laser Impurity Detector + Servo Diverter -->
  <rect x="758" y="432" width="384" height="96" rx="6" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.8"/>
  <text x="950" y="454" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="700" fill="#991B1B">С-МОСТ ЛАЗЕР KY-008 + ЗАСЛОНКА SG90</text>
  <text x="950" y="474" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.8" fill="#7F1D1D">Излучатель 650 нм + фотомодуль → D3 (INT1)</text>
  <text x="950" y="494" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.8" fill="#92400E">Серво SG90 ← D11 (PWM): ветка отбраковки (Z=60)</text>
  <text x="950" y="514" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.2" fill="#475569">При обнаружении мусора заслонка открывается на 380 мс</text>
  <polyline points="645,286 662,286 662,470 758,470" fill="none" stroke="#DC2626" stroke-width="1.7"/>
  <polyline points="645,454 736,454 736,494 758,494" fill="none" stroke="#D97706" stroke-width="1.7"/>

  <!-- 10. Sync LED -->
  <rect x="758" y="542" width="384" height="64" rx="6" fill="#ECFDF5" stroke="#059669" stroke-width="1.7"/>
  <text x="950" y="564" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="700" fill="#065F46">СИНХРО-СВЕТОДИОД КАМЕРЫ + R2 330 Ом</text>
  <text x="950" y="586" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.8" fill="#065F46">Вспышка 50 мс в кадре 60 fps над мишенью А4</text>
  <polyline points="645,484 684,484 684,574 758,574" fill="none" stroke="#059669" stroke-width="1.7"/>

  <!-- Safety Footer Banner -->
  <rect x="38" y="618" width="1104" height="28" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.2"/>
  <text x="590" y="636" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="10.8" font-weight="700" fill="#991B1B">ПРАВИЛО С6: При включении или пропадании питания контроллер входит в IDLE (EN=HIGH, заслонка закрыта). Автозапуск исключён.</text>
</svg>`;
}
