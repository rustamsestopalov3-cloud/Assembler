import * as THREE from 'three';

/**
 * Generates a high-DPI transparent decal texture with engraved cell numbers 1..N,
 * degree ticks, and radial markings to mount flush on the rotating disc face.
 */
export function createDiscNumberRingTexture(
  cellCount: number,
  outerDiameter: number,
  pitchDiameter: number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const pxPerMm = size / outerDiameter;

  // Fine concentric 3D print sheen rings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let rMm = 12; rMm < outerDiameter / 2 - 1; rMm += 1.4) {
    ctx.beginPath();
    ctx.arc(cx, cy, rMm * pxPerMm, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Degree tick marks around outer perimeter
  for (let deg = 0; deg < 360; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    const isMajor = deg % 30 === 0;
    const rOut = (outerDiameter / 2 - 0.6) * pxPerMm;
    const rIn = (outerDiameter / 2 - (isMajor ? 3.2 : 1.6)) * pxPerMm;
    ctx.strokeStyle = isMajor ? 'rgba(248, 250, 252, 0.72)' : 'rgba(248, 250, 252, 0.28)';
    ctx.lineWidth = isMajor ? 2.4 : 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * rIn, cy - Math.sin(rad) * rIn);
    ctx.lineTo(cx + Math.cos(rad) * rOut, cy - Math.sin(rad) * rOut);
    ctx.stroke();
  }

  // Dashed pitch circle Dp
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = 'rgba(240, 253, 250, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, (pitchDiameter / 2) * pxPerMm, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Cell numbers 1..N positioned between outer rim and cells for camera 60fps reading
  const labelRadiusMm = outerDiameter / 2 - 4.3;
  ctx.font = '700 26px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < cellCount; i++) {
    const a = (i * Math.PI * 2) / cellCount;
    const lx = cx + Math.cos(a) * labelRadiusMm * pxPerMm;
    const ly = cy - Math.sin(a) * labelRadiusMm * pxPerMm;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(-a + Math.PI / 2);
    // High-contrast backing pill for 60 fps camera legibility
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.beginPath();
    ctx.roundRect(-18, -14, 36, 28, 5);
    ctx.fill();
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(String(i + 1), 0, 1);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a subtle brushed metal bump/roughness map for shafts, couplers, and aluminum 2020 profiles.
 */
export function createBrushedMetalTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const v = 110 + Math.floor(Math.random() * 40);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, size, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates an optical-lab metric workbench texture (10mm / 50mm grid) with subtle vignette.
 */
export function createWorkbenchTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(0, 0, size, size);

  // Minor 10mm grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1;
  const stepMinor = size / 40;
  for (let i = 0; i <= 40; i++) {
    const pos = i * stepMinor;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  // Major 50mm grid
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
  ctx.lineWidth = 1.6;
  const stepMajor = size / 8;
  for (let i = 0; i <= 8; i++) {
    const pos = i * stepMajor;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  // Subtle radial darkening toward edges
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.15, size / 2, size / 2, size * 0.55);
  grad.addColorStop(0, 'rgba(248, 250, 252, 0.18)');
  grad.addColorStop(1, 'rgba(203, 213, 225, 0.65)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a high-contrast millimeter calibration backdrop behind the discharge chute for the 60 fps camera.
 */
export function createCalibrationBackdropTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Dark anodized metrology surface (replaces plain white rectangle)
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, w, h);

  // Subtle 5mm optical metrology grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.lineWidth = 1;
  for (let g = 40; g < w - 40; g += 24) {
    ctx.beginPath();
    ctx.moveTo(g, 58);
    ctx.lineTo(g, h - 54);
    ctx.stroke();
  }
  for (let g = 58; g < h - 54; g += 24) {
    ctx.beginPath();
    ctx.moveTo(40, g);
    ctx.lineTo(w - 40, g);
    ctx.stroke();
  }

  // Outer precision border
  ctx.strokeStyle = '#14B8A6';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  // Millimeter ruler along left & right edges (0..50 mm)
  ctx.strokeStyle = '#94A3B8';
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '600 17px "IBM Plex Mono", monospace';
  for (let i = 0; i <= 25; i++) {
    const y = 76 + i * 15;
    const isMajor = i % 5 === 0;
    ctx.lineWidth = isMajor ? 2.5 : 1.2;
    ctx.strokeStyle = isMajor ? '#2DD4BF' : '#64748B';
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(isMajor ? 50 : 34, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w - 16, y);
    ctx.lineTo(w - (isMajor ? 50 : 34), y);
    ctx.stroke();

    if (isMajor) {
      ctx.textAlign = 'left';
      ctx.fillText(`${i * 2}`, 56, y + 6);
    }
  }

  // Optical drop-axis crosshair & target circle aligned with seed fall center
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.65)';
  ctx.setLineDash([10, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 58);
  ctx.lineTo(w / 2, h - 54);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(80, h / 2 + 10);
  ctx.lineTo(w - 80, h / 2 + 10);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(248, 113, 113, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 + 10, 38, 0, Math.PI * 2);
  ctx.stroke();

  // Header & Footer labels
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(14, 14, w - 28, 38);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '700 18px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('КАЛИБРОВОЧНАЯ МИШЕНЬ А4', w / 2, 39);

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(14, h - 50, w - 28, 36);
  ctx.fillStyle = '#2DD4BF';
  ctx.font = '700 16px "IBM Plex Mono", monospace';
  ctx.fillText('ШКАЛА 1 ММ · ДЛЯ КАМЕРЫ 60 FPS', w / 2, h - 26);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Creates and updates an OLED control-box screen texture in real time (speed, RPM, cell, trash diverter).
 */
export function createOledDisplayTexture(maxAnisotropy: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  update: (
    rpm: number,
    rateSps: number,
    pulses: number,
    cellIdx: number,
    trashCount: number,
    laserTriggered: boolean,
    running: boolean
  ) => void;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;

  const update = (
    rpm: number,
    rateSps: number,
    pulses: number,
    cellIdx: number,
    trashCount: number,
    laserTriggered: boolean,
    running: boolean
  ) => {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = laserTriggered ? '#EF4444' : '#0F766E';
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, 502, 246);

    // Top Header Bar
    ctx.fillStyle = laserTriggered ? '#7F1D1D' : running ? '#064E3B' : '#451A03';
    ctx.fillRect(10, 10, 492, 42);
    ctx.fillStyle = laserTriggered ? '#FCA5A5' : running ? '#34D399' : '#FBBF24';
    ctx.font = '700 24px "IBM Plex Mono", monospace';
    ctx.fillText(
      laserTriggered ? 'LASER: МУСОР -> ВЕТКА!' : running ? 'ASSEMBLER · RUN' : 'ASSEMBLER · IDLE',
      22,
      39
    );

    // Large Speed Display
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 36px "IBM Plex Mono", monospace';
    ctx.fillText(`${rateSps.toFixed(1)} сем/с`, 22, 98);

    ctx.fillStyle = '#38BDF8';
    ctx.font = '700 32px "IBM Plex Mono", monospace';
    ctx.fillText(`${rpm.toFixed(1)} RPM`, 278, 98);

    // Speed bar meter (0.5 .. 6.0 sps)
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(22, 114, 468, 12);
    const barFrac = Math.min(1, Math.max(0.05, rateSps / 6.0));
    ctx.fillStyle = rateSps >= 4.0 ? '#F59E0B' : '#14B8A6';
    ctx.fillRect(22, 114, Math.round(468 * barFrac), 12);

    // Cell, Optical Sensor & Trash Counters
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 26px "IBM Plex Mono", monospace';
    ctx.fillText(`ЯЧ.#${String(cellIdx).padStart(2, '0')}`, 22, 168);

    ctx.fillStyle = '#A7F3D0';
    ctx.fillText(`LM393:${pulses}`, 152, 168);

    ctx.fillStyle = trashCount > 0 ? '#FCA5A5' : '#94A3B8';
    ctx.fillText(`БРАК:${trashCount}`, 340, 168);

    // Footer Safety Line
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 20px "IBM Plex Mono", monospace';
    ctx.fillText('12V DC · SG90 ДИВЕРТОР · С6 SAFE', 22, 224);

    texture.needsUpdate = true;
  };

  update(10, 2.0, 0, 1, 0, false, true);
  return { canvas, ctx, texture, update };
}

/**
 * Generates a transparent level-scale decal for the conical polycarbonate hopper.
 */
export function createHopperScaleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const levels = [
    { y: 54, label: 'MAX 100%', color: '#64748B' },
    { y: 102, label: '75% НОРМА', color: '#D97706' },
    { y: 150, label: '50%', color: '#64748B' },
    { y: 198, label: '25% ДОСЫП', color: '#DC2626' },
  ];

  ctx.font = '700 20px "IBM Plex Mono", monospace';
  for (const lv of levels) {
    ctx.strokeStyle = lv.color;
    ctx.lineWidth = lv.y === 102 ? 4 : 2.5;
    ctx.beginPath();
    ctx.moveTo(20, lv.y);
    ctx.lineTo(78, lv.y);
    ctx.stroke();
    ctx.fillStyle = lv.color;
    ctx.fillText(lv.label, 86, lv.y + 7);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a crisp label texture for the separate trash/impurity rejection bin.
 */
export function createTrashBinTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#991B1B';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#FCA5A5';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 116);

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('МУСОР', 128, 56);
  ctx.font = '600 20px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#FECACA';
  ctx.fillText('ВЕТКА ОТБРАКОВКИ', 128, 94);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}
