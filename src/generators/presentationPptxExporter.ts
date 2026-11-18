import PptxGenJS from 'pptxgenjs';
import { BOM_ITEMS, VARIANT_A_PARAMS, VARIANT_B_PARAMS, evaluateDiscInvariants } from '../data/deliverablesContent';
import type { DiagramBuffers } from './task1DocxExporter';

const NAVY = '2B3B7F';
const MAGENTA = 'DF2F7D';
const LAVENDER = 'E4E9FB';
const LAVENDER_SOFT = 'F1F4FD';
const PINK_SOFT = 'FDECF4';
const DARK_TEXT = '1F243D';
const MUTED = '5A6382';
const SEC_NAVY = '9EAAD8';
const SEC_PINK = 'EB8DB6';
const BORDER_BLUE = 'C5D0F3';
const WHITE = 'FFFFFF';
const FONT = 'Calibri';

function uint8ToDataUrl(bytes?: Uint8Array): string | undefined {
  if (!bytes || bytes.byteLength === 0) return undefined;
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64');
  return `image/png;base64,${b64}`;
}

function addWaves(slide: PptxGenJS.Slide, pres: PptxGenJS, onDark = false) {
  slide.addShape('custGeom' as PptxGenJS.ShapeType, {
    x: 9.75,
    y: 0,
    w: 3.583,
    h: 1.55,
    fill: { color: MAGENTA },
    line: { color: MAGENTA, width: 0 },
    points: [
      { x: 0.0, y: 0.0, moveTo: true },
      { x: 3.583, y: 0.0 },
      { x: 3.583, y: 1.45 },
      { x: 2.35, y: 1.45, curve: { type: 'cubic', x1: 3.15, y1: 1.55, x2: 2.7, y2: 1.35 } },
      { x: 0.0, y: 0.0, curve: { type: 'cubic', x1: 1.25, y1: 1.5, x2: 0.45, y2: 0.5 } },
      { close: true },
    ],
  });

  slide.addShape('custGeom' as PptxGenJS.ShapeType, {
    x: 0,
    y: 6.45,
    w: 13.333,
    h: 1.05,
    fill: { color: onDark ? 'D5DDF7' : LAVENDER, transparency: onDark ? 12 : 0 },
    line: { color: LAVENDER, width: 0 },
    points: [
      { x: 0.0, y: 1.05, moveTo: true },
      { x: 0.0, y: 0.55 },
      { x: 5.5, y: 0.72, curve: { type: 'cubic', x1: 1.8, y1: 0.15, x2: 3.6, y2: 0.95 } },
      { x: 11.4, y: 0.35, curve: { type: 'cubic', x1: 7.7, y1: 0.45, x2: 9.8, y2: 0.1 } },
      { x: 13.333, y: 0.52, curve: { type: 'cubic', x1: 12.2, y1: 0.48, x2: 12.85, y2: 0.56 } },
      { x: 13.333, y: 1.05 },
      { close: true },
    ],
  });
}

function addInnagrikaLogo(slide: PptxGenJS.Slide, pres: PptxGenJS, onDark = false) {
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.4,
    y: 0.21,
    w: 0.36,
    h: 0.46,
    rectRadius: 0.2,
    fill: { color: onDark ? '394B97' : LAVENDER_SOFT },
    line: { color: MAGENTA, width: 1.5 },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: 0.45,
    y: 0.22,
    w: 0.26,
    h: 0.06,
    fill: { color: MAGENTA },
    line: { color: MAGENTA, width: 0 },
  });
  slide.addText('5', {
    x: 0.4,
    y: 0.23,
    w: 0.36,
    h: 0.44,
    fontFace: FONT,
    fontSize: 22,
    bold: true,
    color: onDark ? WHITE : NAVY,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });
  slide.addText(
    [
      { text: 'юбилейная олимпиада\n', options: { fontSize: 8.5, color: onDark ? 'F69AC3' : MAGENTA, bold: true } },
      { text: 'иннагрика', options: { fontSize: 15, color: onDark ? WHITE : NAVY, bold: true } },
    ],
    {
      x: 0.82,
      y: 0.2,
      w: 2.3,
      h: 0.48,
      fontFace: FONT,
      valign: 'middle',
      margin: 0,
    }
  );
}

function addSmileyBadge(slide: PptxGenJS.Slide, pres: PptxGenJS, x: number, y: number) {
  slide.addShape(pres.ShapeType.roundRect, {
    x,
    y,
    w: 0.12,
    h: 0.34,
    rectRadius: 0.3,
    rotate: -16,
    fill: { color: NAVY },
    line: { color: NAVY, width: 0 },
  });
  slide.addShape(pres.ShapeType.roundRect, {
    x: x + 0.34,
    y: y + 0.04,
    w: 0.12,
    h: 0.34,
    rectRadius: 0.3,
    rotate: -16,
    fill: { color: NAVY },
    line: { color: NAVY, width: 0 },
  });
  slide.addShape('custGeom' as PptxGenJS.ShapeType, {
    x: x - 0.04,
    y: y + 0.34,
    w: 0.72,
    h: 0.32,
    line: { color: MAGENTA, width: 4.5 },
    fill: { type: 'none' },
    points: [
      { x: 0.02, y: 0.08, moveTo: true },
      { x: 0.68, y: 0.04, curve: { type: 'quadratic', x1: 0.35, y1: 0.36 } },
    ],
  });
}

function addSectionLabel(slide: PptxGenJS.Slide, label: string, pink = false) {
  slide.addText(label, {
    x: -0.68,
    y: 3.15,
    w: 2.1,
    h: 0.48,
    rotate: 270,
    fontFace: FONT,
    fontSize: 20,
    bold: true,
    color: pink ? SEC_PINK : SEC_NAVY,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });
}

function addContentChrome(
  slide: PptxGenJS.Slide,
  pres: PptxGenJS,
  opts: { section: string; title: string; subtitle?: string; slideNum: number; pinkSection?: boolean; smiley?: boolean }
) {
  slide.background = { color: WHITE };
  addWaves(slide, pres, false);
  addInnagrikaLogo(slide, pres, false);
  addSectionLabel(slide, opts.section, opts.pinkSection);

  slide.addText(opts.title, {
    x: 0.92,
    y: 0.78,
    w: 9.0,
    h: 0.46,
    fontFace: FONT,
    fontSize: 22.5,
    bold: true,
    color: NAVY,
    margin: 0,
    valign: 'middle',
  });

  if (opts.subtitle) {
    slide.addText(opts.subtitle, {
      x: 0.92,
      y: 1.24,
      w: 9.4,
      h: 0.26,
      fontFace: FONT,
      fontSize: 10.8,
      color: MUTED,
      margin: 0,
    });
  }

  if (opts.smiley) {
    addSmileyBadge(slide, pres, 11.78, 1.54);
  }

  slide.addText(`Команда Assembler · Кейс AT9-3 · Полуфинал (цифровой проект) · Стр. ${opts.slideNum}/12`, {
    x: 6.5,
    y: 7.14,
    w: 6.45,
    h: 0.25,
    fontFace: FONT,
    fontSize: 9,
    color: NAVY,
    align: 'right',
    margin: 0,
  });
}

function addCard(
  slide: PptxGenJS.Slide,
  pres: PptxGenJS,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    title: string;
    body: string;
    fill?: string;
    accent?: string;
    titleSize?: number;
    bodySize?: number;
  }
) {
  const fill = opts.fill ?? LAVENDER_SOFT;
  const accent = opts.accent ?? NAVY;
  slide.addShape(pres.ShapeType.roundRect, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color: BORDER_BLUE, width: 0.75 },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: opts.x,
    y: opts.y + 0.08,
    w: 0.07,
    h: opts.h - 0.16,
    fill: { color: accent },
    line: { color: accent, width: 0 },
  });
  slide.addText(opts.title, {
    x: opts.x + 0.17,
    y: opts.y + 0.09,
    w: opts.w - 0.26,
    h: 0.28,
    fontFace: FONT,
    fontSize: opts.titleSize ?? 12.5,
    bold: true,
    color: accent === MAGENTA ? MAGENTA : NAVY,
    margin: 0,
    valign: 'top',
  });
  slide.addText(opts.body, {
    x: opts.x + 0.17,
    y: opts.y + 0.38,
    w: opts.w - 0.26,
    h: opts.h - 0.44,
    fontFace: FONT,
    fontSize: opts.bodySize ?? 10.5,
    color: DARK_TEXT,
    margin: 0,
    valign: 'top',
  });
}

function addVisualSlot(
  slide: PptxGenJS.Slide,
  pres: PptxGenJS,
  opts: { x: number; y: number; w: number; h: number; label: string; hint: string; accent?: string }
) {
  const accent = opts.accent ?? NAVY;
  slide.addShape(pres.ShapeType.roundRect, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    rectRadius: 0.1,
    fill: { color: 'F8FAFF' },
    line: { color: accent, width: 1.5, dashType: 'dash' },
  });

  const cx = opts.x + opts.w / 2;
  const cy = opts.y + opts.h / 2 - 0.26;
  slide.addShape(pres.ShapeType.roundRect, {
    x: cx - 0.34,
    y: cy - 0.22,
    w: 0.68,
    h: 0.44,
    rectRadius: 0.1,
    fill: { color: LAVENDER },
    line: { color: accent, width: 1.2 },
  });
  slide.addShape(pres.ShapeType.ellipse, {
    x: cx - 0.12,
    y: cy - 0.12,
    w: 0.24,
    h: 0.24,
    fill: { color: WHITE },
    line: { color: MAGENTA, width: 2 },
  });

  slide.addText(opts.label, {
    x: opts.x + 0.14,
    y: cy + 0.28,
    w: opts.w - 0.28,
    h: 0.3,
    fontFace: FONT,
    fontSize: 11.5,
    bold: true,
    color: accent,
    align: 'center',
    margin: 0,
  });
  slide.addText(opts.hint, {
    x: opts.x + 0.14,
    y: cy + 0.58,
    w: opts.w - 0.28,
    h: 0.46,
    fontFace: FONT,
    fontSize: 9.8,
    color: MUTED,
    align: 'center',
    margin: 0,
  });
}

export async function generatePresentationPptxBytes(diagrams: DiagramBuffers = {}): Promise<Uint8Array> {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'Команда Assembler';
  pres.company = 'Олимпиада Иннагрика 2026';
  pres.title = 'Кейс AT9-3 — Разработка сменного диска для подачи семян (Assembler)';

  const invA = evaluateDiscInvariants(VARIANT_A_PARAMS);
  const invB = evaluateDiscInvariants(VARIANT_B_PARAMS);
  const bomTotal = BOM_ITEMS.reduce((s, i) => s + i.unitPriceRub * i.qty, 0);

  const econImg = uint8ToDataUrl(diagrams.economicsPng);
  const geomImg = uint8ToDataUrl(diagrams.discGeomPng);
  const cycleImg = uint8ToDataUrl(diagrams.assemblyCyclePng);

  // ===========================================================================
  // SLIDE 1 — ТИТУЛЬНЫЙ
  // ===========================================================================
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };

    s.addShape(pres.ShapeType.rect, {
      x: 6.28,
      y: 0,
      w: 7.053,
      h: 7.5,
      fill: { color: NAVY },
      line: { color: NAVY, width: 0 },
    });

    addWaves(s, pres, true);
    addInnagrikaLogo(s, pres, false);

    s.addText('2026', {
      x: 0.65,
      y: 1.55,
      w: 3.4,
      h: 0.85,
      fontFace: FONT,
      fontSize: 44,
      bold: true,
      color: NAVY,
      margin: 0,
    });

    const tracks = [
      { label: 'АГРОГЕНЕТИКА', active: false, y: 2.48 },
      { label: 'АГРОХИМИЯ', active: false, y: 2.86 },
      { label: 'АГРОТЕХ', active: true, y: 3.24 },
    ];
    for (const tr of tracks) {
      s.addText(tr.label, {
        x: 0.65,
        y: tr.y,
        w: 3.2,
        h: 0.3,
        fontFace: FONT,
        fontSize: 13,
        bold: tr.active,
        color: tr.active ? MAGENTA : NAVY,
        margin: 0,
      });
    }

    s.addShape(pres.ShapeType.rect, {
      x: 0.65,
      y: 4.18,
      w: 4.8,
      h: 0.05,
      fill: { color: MAGENTA },
      line: { color: MAGENTA, width: 0 },
    });

    s.addText(
      [
        { text: 'Команда: ', options: { bold: true, color: NAVY, fontSize: 15.5 } },
        { text: 'Assembler\n', options: { bold: true, color: MAGENTA, fontSize: 17.5 } },
        { text: 'Класс: ', options: { bold: true, color: NAVY, fontSize: 13 } },
        { text: '9–11 · Профиль «Агротех»\n', options: { color: DARK_TEXT, fontSize: 13 } },
        { text: 'Этап: ', options: { bold: true, color: NAVY, fontSize: 13 } },
        { text: 'Полуфинал · Цифровой проект стенда', options: { color: DARK_TEXT, fontSize: 13 } },
      ],
      {
        x: 0.65,
        y: 4.38,
        w: 5.3,
        h: 1.3,
        fontFace: FONT,
        valign: 'top',
        margin: 0,
      }
    );

    s.addText('Кейс AT9-3 · Цифровой проект', {
      x: 6.78,
      y: 2.15,
      w: 5.9,
      h: 0.34,
      fontFace: FONT,
      fontSize: 12.5,
      bold: true,
      color: 'F69AC3',
      margin: 0,
    });
    s.addText('Разработка сменного диска\nдля поштучной подачи семян', {
      x: 6.78,
      y: 2.54,
      w: 6.0,
      h: 1.65,
      fontFace: FONT,
      fontSize: 29,
      bold: true,
      color: WHITE,
      margin: 0,
    });
    s.addShape(pres.ShapeType.rect, {
      x: 6.78,
      y: 4.3,
      w: 3.1,
      h: 0.05,
      fill: { color: MAGENTA },
      line: { color: MAGENTA, width: 0 },
    });
    s.addText(
      'Параметрический CAD/STL (N = 12, PETG) · 3D-симулятор\nСхема 12 В DC · Прошивка с защитой С6 · План финала',
      {
        x: 6.78,
        y: 4.5,
        w: 5.9,
        h: 0.9,
        fontFace: FONT,
        fontSize: 13.5,
        color: LAVENDER,
        margin: 0,
      }
    );
  }

  // ===========================================================================
  // SLIDE 2 — ПРОБЛЕМАТИКА
  // ===========================================================================
  {
    const s = pres.addSlide();
    addContentChrome(s, pres, {
      section: 'Проблематика',
      title: 'Обозначим проблематику',
      subtitle: 'Инженерные вызовы дозирования гороха и почему нужен цифровой проект до печати',
      slideNum: 2,
      smiley: true,
    });

    s.addShape(pres.ShapeType.rect, {
      x: 0.92,
      y: 1.6,
      w: 6.38,
      h: 4.76,
      fill: { color: WHITE },
      line: { color: BORDER_BLUE, width: 1 },
    });
    s.addShape(pres.ShapeType.rect, {
      x: 0.92,
      y: 1.6,
      w: 0.12,
      h: 4.76,
      fill: { color: MAGENTA },
      line: { color: MAGENTA, width: 0 },
    });
    if (cycleImg) {
      s.addImage({ data: cycleImg, x: 1.18, y: 1.72, w: 5.95, h: 3.31 });
    }
    s.addText(
      'Цифровая модель стенда «Assembler»: бункер 48° → отсекатель 1.2 мм → сопло Ø17 мм → лазер KY-008 + заслонка SG90 → 8 стаканов под камерой 60 fps.',
      {
        x: 1.18,
        y: 5.14,
        w: 5.95,
        h: 1.05,
        fontFace: FONT,
        fontSize: 11,
        color: DARK_TEXT,
        margin: 0,
      }
    );

    const aspects = [
      {
        t: '1. Точность поштучной выдачи (6.2–8.4 мм)',
        b: 'Требуется стабильно подавать по 1 семени со скоростью 2.0 сем/с (1 200 сем/10 мин) без дробления и застревания.',
        a: NAVY,
      },
      {
        t: '2. Затраты и риск брака при слепой печати',
        b: 'Покупные диски дороги (2 500 ₽/шт.), а 3D-печать без CAD-проверок и расчёта допусков приводит к переделкам.',
        a: MAGENTA,
      },
      {
        t: '3. Ошибка учёта по массе и числу оборотов',
        b: '5 пропусков (0) и 5 дублей (2+) на 100 циклов дают сумму «100 семян», маскируя реальные 10% брака высева.',
        a: NAVY,
      },
      {
        t: '4. Задача полуфинала: полный цифровой двойник',
        b: 'Спроектировать и проверить в CAD, электронике и коде стенд со сменой диска <45 с для быстрого старта на финале.',
        a: MAGENTA,
      },
    ];
    aspects.forEach((item, idx) => {
      addCard(s, pres, {
        x: 7.52,
        y: 1.6 + idx * 1.21,
        w: 5.34,
        h: 1.1,
        title: item.t,
        body: item.b,
        accent: item.a,
        fill: idx % 2 === 0 ? LAVENDER_SOFT : WHITE,
        titleSize: 12,
        bodySize: 10.2,
      });
    });
  }

  // ===========================================================================
  // SLIDE 3 — РЕШЕНИЕ «ASSEMBLER» (Схема дисков + Скриншот 3D-модели)
  // ===========================================================================
  {
    const s = pres.addSlide();
    addContentChrome(s, pres, {
      section: 'Решение',
      title: 'Решение «Assembler»: цифровая модель дисков и стенда',
      subtitle: 'Варьируем только заходную фаску (Вариант A vs B) при полной унификации корпуса и электроники',
      slideNum: 3,
      pinkSection: true,
    });

    s.addShape(pres.ShapeType.rect, {
      x: 0.92,
      y: 1.6,
      w: 0.2,
      h: 4.76,
      fill: { color: MAGENTA },
      line: { color: MAGENTA, width: 0 },
    });
    s.addShape(pres.ShapeType.rect, {
      x: 7.36,
      y: 1.6,
      w: 0.2,
      h: 4.76,
      fill: { color: MAGENTA },
      line: { color: MAGENTA, width: 0 },
    });
    s.addShape(pres.ShapeType.rect, {
      x: 1.12,
      y: 1.6,
      w: 6.24,
      h: 4.76,
      fill: { color: WHITE },
      line: { color: BORDER_BLUE, width: 1 },
    });
    if (geomImg) {
      s.addImage({ data: geomImg, x: 1.24, y: 1.72, w: 6.0, h: 3.26 });
    }
    s.addText(
      `Два готовых STL-исполнения (N = 12, D1 = 120 мм, D_яч = 9.2 мм, h = 7.8 мм, PETG):\n` +
        `• Вариант A: прямая ячейка (c = 0 мм, перемычка ${invA.webThicknessMm} мм, ${invA.estimatedMassGrams} г)\n` +
        `• Вариант B: с входной фаской 1.8×45° (вход Ø12.8 мм, ${invB.webThicknessMm} мм, ${invB.estimatedMassGrams} г)`,
      {
        x: 1.24,
        y: 5.08,
        w: 6.0,
        h: 1.15,
        fontFace: FONT,
        fontSize: 10.5,
        color: DARK_TEXT,
        margin: 0,
      }
    );

    addCard(s, pres, {
      x: 7.78,
      y: 1.6,
      w: 5.08,
      h: 2.32,
      title: 'Что заложено в цифровой проект',
      body:
        '• Быстрая смена диска за 24 с (<45 с) на 4 барашках М4 и гайке М5.\n' +
        '• Сквозное сопло Ø17.0 мм (> 2·d_max) и защитный кожух муфты.\n' +
        '• Автоматика 12 В DC: TMC2209, энкодер LM393 (анти-клин −15°),\n' +
        '  лазерный С-мост KY-008 + заслонка SG90 в урну на Z = 60.',
      fill: LAVENDER_SOFT,
      accent: NAVY,
      titleSize: 12.5,
      bodySize: 10.5,
    });

    addVisualSlot(s, pres, {
      x: 7.78,
      y: 4.06,
      w: 5.08,
      h: 2.3,
      label: 'СКРИНШОТ №1: 3D-МОДЕЛЬ СТЕНДА',
      hint: 'Вставьте снимок из вкладки «3D САПР и STL»\n(кнопка камеры 📷 в окне 3D-вида)',
      accent: MAGENTA,
    });
  }

  // ===========================================================================
  // SLIDE 4 — ЗАДАНИЕ 1.1: ЭКОНОМИКА СМЕННОГО ДИСКА
  // ===========================================================================
  {
    const s = pres.addSlide();
    addContentChrome(s, pres, {
      section: '1 Задание',
      title: '1.1. Экономика сменного диска: расчёт и риски',
      subtitle: 'Сравнение покупки готовых дисков (2 500 ₽/шт.) и 3D-печати (6 000 + 510·k ₽) по условной модели',
      slideNum: 4,
    });

    s.addShape(pres.ShapeType.rect, {
      x: 0.92,
      y: 1.6,
      w: 6.32,
      h: 3.55,
      fill: { color: WHITE },
      line: { color: BORDER_BLUE, width: 1 },
    });
    if (econImg) {
      s.addImage({ data: econImg, x: 1.02, y: 1.68, w: 6.12, h: 3.12 });
    }
    s.addText('Точка равенства: 2 500·N = 6 000 + 510·N → N = 3.015 (выгодно с 4-го диска)', {
      x: 1.02,
      y: 4.84,
      w: 6.12,
      h: 0.25,
      fontFace: FONT,
      fontSize: 9.8,
      bold: true,
      color: NAVY,
      align: 'center',
      margin: 0,
    });

    addCard(s, pres, {
      x: 0.92,
      y: 5.26,
      w: 6.32,
      h: 1.12,
      title: 'Границы условной модели',
      body:
        'Модель сравнивает только изготовление дисков: амортизация уже в 120 ₽/ч (без двойного учёта). ' +
        'Она НЕ доказывает взаимозаменяемость с заводским диском и НЕ оценивает урожайность.',
      fill: PINK_SOFT,
      accent: MAGENTA,
      titleSize: 11.5,
      bodySize: 9.8,
    });

    const kpis = [
      { label: 'Партия 4 шт.', val: '8 040 vs 10 000 ₽', sub: 'Выгода 1 960 ₽ (−19.6%)', col: NAVY },
      { label: 'Партия 20 шт.', val: '16 200 vs 50 000 ₽', sub: 'Дешевле в 3.09 раза', col: MAGENTA },
      { label: 'Переменные V', val: '510 ₽/шт.', sub: '120 мат + 240 печ + 150 ОТК', col: NAVY },
    ];
    kpis.forEach((k, idx) => {
      const kx = 7.42 + idx * 1.84;
      s.addShape(pres.ShapeType.roundRect, {
        x: kx,
        y: 1.6,
        w: 1.75,
        h: 1.0,
        rectRadius: 0.08,
        fill: { color: idx === 1 ? PINK_SOFT : LAVENDER_SOFT },
        line: { color: k.col, width: 1.1 },
      });
      s.addText(k.label, {
        x: kx + 0.08,
        y: 1.66,
        w: 1.59,
        h: 0.22,
        fontFace: FONT,
        fontSize: 9.5,
        bold: true,
        color: MUTED,
        margin: 0,
      });
      s.addText(k.val, {
        x: kx + 0.08,
        y: 1.9,
        w: 1.59,
        h: 0.32,
        fontFace: FONT,
        fontSize: 11,
        bold: true,
        color: k.col,
        margin: 0,
      });
      s.addText(k.sub, {
        x: kx + 0.08,
        y: 2.26,
        w: 1.59,
        h: 0.26,
        fontFace: FONT,
        fontSize: 8.8,
        color: DARK_TEXT,
        margin: 0,
      });
    });

    addCard(s, pres, {
      x: 7.42,
      y: 2.76,
      w: 5.44,
      h: 3.62,
      title: '5 факторов, способных изменить выбор на практике',
      body:
        '1. Процент брака печати (15–20%) — повышает реальный расход времени и филамента.\n' +
        '2. Ресурс PETG — абразивный износ пылью может быть выше, чем у литого полиамида.\n' +
        '3. Срыв поставки (7–14 дней) — простой посевного агрегата дороже цены диска.\n' +
        '4. Доработки под новую фракцию семян — увеличивают базу F = 6 000 ₽.\n' +
        '5. Термостойкость — PLA плывёт на солнце (>55 °C), поэтому в проекте принят PETG.',
      fill: LAVENDER_SOFT,
      accent: NAVY,
      titleSize: 12.5,
      bodySize: 10.5,
    });
  }

  // ===========================================================================
  // SLIDE 5 — ЗАДАНИЕ 1.2: СПОСОБЫ ПОДАЧИ И ФИЗИКА 4 ФАЗ
  // ===========================================================================
  {
    const s = pres.addSlide();
    addContentChrome(s, pres, {
      section: '1 Задание',
      title: '1.2. Способы поштучной подачи и физика ячейки',
      subtitle: 'Сопоставление механического (A и B) и вакуумного аппаратов и обоснование одиночного захвата',
      slideNum: 5,
    });

    const t2Rows: PptxGenJS.TableRow[] = [
      [
        { text: 'Вариант дозатора', options: { bold: true, fill: { color: NAVY }, color: WHITE } },
        { text: 'Принцип захвата', options: { bold: true, fill: { color: NAVY }, color: WHITE } },
        { text: 'Риски пропуска (0) / дубля (2+)', options: { bold: true, fill: { color: NAVY }, color: WHITE } },
        { text: 'Требования к семенам', options: { bold: true, fill: { color: NAVY }, color: WHITE } },
      ],
      [
        { text: 'Прямая ячейка\n(Вариант A, c = 0)', options: { bold: true } },
        'Гравитационное западание из бункера (скат 48°) в карман Ø9.2×7.8 мм',
        'Риск пропуска (0) выше на высокой скорости; дубли (2+) счищаются отсекателем 1.2 мм',
        'Калиброванный чистый горох 6.2–8.4 мм без крупного сора',
      ],
      [
        { text: 'Ячейка с фаской\n(Вариант B, 1.8×45°)', options: { bold: true } },
        'Западание по конусной фаске (вход Ø12.8 мм), центрирующей семя в карман',
        'Существенно меньше пропусков (0); мелкий двойник в фаске снимается отсекателем',
        'Калиброванный горох 6.2–8.4 мм; выше терпимость к овальности',
      ],
      [
        { text: 'Вакуумный аппарат\n(для сравнения)', options: { bold: true } },
        'Присос к отверстиям Ø4 мм разрежением 3–6 кПа и сброс перекрытием вакуума',
        'Высокое P₁, но требует сбрасыватель и теряет подачу при подсосе воздуха',
        'Менее критичен к форме, но чувствителен к пыли и шелухе',
      ],
    ].map((row, rIdx) =>
      row.map((cell) =>
        typeof cell === 'string'
          ? { text: cell, options: { fill: { color: rIdx % 2 === 0 ? WHITE : LAVENDER_SOFT }, color: DARK_TEXT } }
          : cell
      )
    );

    s.addTable(t2Rows, {
      x: 0.92,
      y: 1.6,
      w: 11.95,
      colW: [2.35, 3.2, 3.55, 2.85],
      rowH: [0.36, 0.74, 0.74, 0.74],
      fontFace: FONT,
      fontSize: 10.2,
      border: { type: 'solid', pt: 0.5, color: BORDER_BLUE },
      valign: 'middle',
    });

    const phases = [
      { t: '1. Захват', b: 'Бункер (скат 48° > угла трения 30°) подаёт зерно в карман Ø9.2 мм.', c: NAVY },
      { t: '2. Перенос', b: 'Дуга направляющей (зазор 0.45 мм < 6.2 мм) запирает семя на дуге.', c: NAVY },
      { t: '3. Почему 2-е не держится', b: 'h_яч = 7.8 мм. Два семени (2×6.2 = 12.4 мм) выступают >4.6 мм и сбиваются отсекателем.', c: MAGENTA },
      { t: '4. Освобождение', b: 'На −90° направляющая обрывается над соплом Ø17 мм — свободный сброс.', c: NAVY },
    ];
    phases.forEach((ph, idx) => {
      addCard(s, pres, {
        x: 0.92 + idx * 3.03,
        y: 4.38,
        w: 2.88,
        h: 1.72,
        title: ph.t,
        body: ph.b,
        accent: ph.c,
        fill: ph.c === MAGENTA ? PINK_SOFT : LAVENDER_SOFT,
        titleSize: 12.2,
        bodySize: 10.2,
      });
    });

    s.addText('Источники (17.11.2026): ГОСТ 31345-2007 · Кленин Н.И., Егоров В.Г. «С/х машины» · Беляев Е.А. «Посевные машины».', {
      x: 0.92,
      y: 6.18,
      w: 11.95,
      h: 0.25,
      fontFace: FONT,
      fontSize: 9.5,
      italic: true,
      color: MUTED,
      margin: 0,
    });
  }

  // ===========================================================================
  // SLIDE 6 — ЗАДАНИЕ 1.3 И 1.4: КИНЕМАТИКА N=12 И ТЗ
  // ===========================================================================
  {
    const s = pres.addSlide();
    addContentChrome(s, pres, {
      section: '1 Задание',
      title: '1.3–1.4. Расчёт привода (N = 8/12/16) и требования ТЗ',
      subtitle: 'Обоснование оптимальной геометрии под горох 6.2–8.4 мм и перечень ограничений цифрового этапа',
      slideNum: 6,
    });

    const nRows: PptxGenJS.TableRow[] = [
      [
        { text: 'Число ячеек', options: { bold: true, fill: { color: NAVY }, color: WHITE } },
        { text: 'Перемычка B', options: { bold: true, fill: { color: NAVY }, color: WHITE } },
        { text: 'n при 2 сем/с', options: { bold: true, fill: { color: NAVY }, color: WHITE } },
        { text: 'Время заполн. t_зап', options: { bold: true, fill: { color: NAVY }, color: WHITE } },
      ],
      ['N = 8', '23.17 мм', '15.0 об/мин', '1.00 с (риск 0 при разгоне)'],
      [{ text: 'N = 12 (выбор)', options: { bold: true, color: MAGENTA } }, '11.53 мм', '10.0 об/мин', '1.50 с (оптимум)'],
      ['N = 16', '5.54 мм', '7.5 об/мин', '2.00 с (тесные пазы LM393)'],
    ].map((row, rIdx) =>
      row.map((cell) =>
        typeof cell === 'string'
          ? { text: cell, options: { fill: { color: rIdx === 2 ? PINK_SOFT : rIdx % 2 === 0 ? WHITE : LAVENDER_SOFT }, color: DARK_TEXT } }
          : { ...cell, options: { ...cell.options, fill: { color: rIdx === 2 ? PINK_SOFT : WHITE } } }
      )
    );
    s.addTable(nRows, {
      x: 0.92,
      y: 1.6,
      w: 6.25,
      colW: [1.45, 1.25, 1.45, 2.1],
      rowH: [0.34, 0.36, 0.36, 0.36],
      fontFace: FONT,
      fontSize: 9.8,
      border: { type: 'solid', pt: 0.5, color: BORDER_BLUE },
      valign: 'middle',
    });

    addCard(s, pres, {
      x: 0.92,
      y: 3.16,
      w: 6.25,
      h: 1.56,
      title: 'Выведенные формулы (10 мин = 1 200 семян)',
      body:
        '• Производительность Q = (n·N)/60 = 2.0 сем/с; интервал Δt = 0.50 с.\n' +
        '• Время заполнения на дуге 90°: t_зап = N/(4·Q) = 1.50 с (при N=12).\n' +
        '• Габариты ячейки: D_яч = 8.4 + 0.8 = 9.2 (+0.2/−0.1) мм; h_яч = 7.8 мм; дно 2.2 мм.',
      fill: LAVENDER_SOFT,
      accent: NAVY,
      titleSize: 12,
      bodySize: 10.2,
    });

    addCard(s, pres, {
      x: 0.92,
      y: 4.86,
      w: 6.25,
      h: 1.52,
      title: 'Почему расчёт проверяется только натурным стендом',
      body:
        '• Расчёт считает семена сферами, не учитывая овальность, пыль и упругий отскок от слоёв PETG.\n' +
        '• На конкурсе также не проверить долгий абразивный износ и полевую всхожесть в почве.',
      fill: PINK_SOFT,
      accent: MAGENTA,
      titleSize: 12,
      bodySize: 10.2,
    });

    addCard(s, pres, {
      x: 7.38,
      y: 1.6,
      w: 5.48,
      h: 2.34,
      title: 'Техническое задание (1.4) и смета',
      body:
        '• Подача: ном. 2.0 сем/с (диапазон 0.5–6.0), быстрая замена <45 с.\n' +
        '• Безопасность: питание 12 В (≤24 В), кожух муфты, EN=HIGH (IDLE).\n' +
        '• Контроль: ≥100 событий × 3, 60 fps + мишень А4 + 8 стаканов.\n' +
        `• Ориентировочная смета стенда (BOM, 18 поз.): ${bomTotal.toLocaleString('ru-RU')} ₽.`,
      fill: LAVENDER_SOFT,
      accent: NAVY,
      titleSize: 12.5,
      bodySize: 10.4,
    });

    addVisualSlot(s, pres, {
      x: 7.38,
      y: 4.08,
      w: 5.48,
      h: 2.3,
      label: 'СКРИНШОТ №2: ЧЕРТЁЖ ИЛИ 3D-ВИД ЯЧЕЙКИ',
      hint: 'Вставьте чертёж с допусками D1–D6 (вкладка «Чертежи и Печать»)\nили крупный план ячейки в 3D-симуляторе',
      accent: NAVY,
    });
  }

  // ===========================================================================
  // SLIDE 7 — ЗАДАНИЕ 2 · А1–А2: CAD И ТЕХНОЛОГИЯ ПЕЧАТИ PETG
  // ===========================================================================
  {
    const s = pres.addSlide();
    addContentChrome(s, pres, {
      section: '2 Задание',
      title: '2.А1–А2. Цифровой CAD-проект, STL и профиль PETG',
      subtitle: 'Модели готовы к печати без доработки кода: проверены OpenSCAD assert() и подготовлены в слайсере',
      slideNum: 7,
    });

    addCard(s, pres, {
      x: 0.92,
      y: 1.6,
      w: 5.75,
      h: 2.32,
      title: 'Параметрический CAD и настройка слайсера PETG',
      body:
        `• OpenSCAD (assert): D1 = 120 мм, H = 10 мм, D-вал Ø8.0 мм; перемычки ${invA.webThicknessMm} / ${invB.webThicknessMm} мм.\n` +
        '• Материал PETG (термостойче PLA): сопло 0.4 мм, слой 0.20 мм, 4 периметра, 30% гироид.\n' +
        '• Ориентация плашмя +Z вверх, 0 поддержек внутри ячеек и пазов LM393.\n' +
        '• Расчётная масса комплекта (5 деталей): 356 г; время печати ~4 ч 45 мин на 2 принтерах.',
      fill: LAVENDER_SOFT,
      accent: NAVY,
      titleSize: 12.5,
      bodySize: 10.2,
    });

    addCard(s, pres, {
      x: 0.92,
      y: 4.06,
      w: 5.75,
      h: 2.3,
      title: 'Конструктивные улучшения в 3D-сборке',
      body:
        '1. Выпускное сопло Ø17.0 мм (> 2·d_max) — гарантированный пролёт без застревания.\n' +
        '2. Задняя калибровочная мишень А4 (шаг 1 мм) для масштабной привязки кадров.\n' +
        '3. Разнесена ветка отбраковки: урна мусора вынесена на Z = 60 мимо лотка стаканов.',
      fill: PINK_SOFT,
      accent: MAGENTA,
      titleSize: 12.5,
      bodySize: 10.4,
    });

    addVisualSlot(s, pres, {
      x: 6.88,
      y: 1.6,
      w: 5.98,
      h: 2.32,
      label: 'СКРИНШОТ №3: STL-ДИСКИ В СЛАЙСЕРЕ (+Z)',
      hint: 'Откройте disk_variant_B_chamfer.stl в слайсере (PrusaSlicer / Cura)\nи вставьте скриншот нарезки слоёв PETG 0.20 мм без поддержек',
      accent: NAVY,
    });

    addVisualSlot(s, pres, {
      x: 6.88,
      y: 4.06,
      w: 5.98,
      h: 2.3,
      label: 'СКРИНШОТ №4: РАЗРЕЗ 3D-СБОРКИ (А-А)',
      hint: 'Сделайте снимок в «3D САПР и STL» в режиме «Разрез / Сбоку»\nили вставьте сечение из «Чертежи и Печать»',
      accent: MAGENTA,
    });
  }

  // ===========================================================================
  // SLIDE 8 — ЗАДАНИЕ 2 · А3–А4: ЭЛЕКТРОНИКА 12 В, ПРОШИВКА И УЧЁТ 60 FPS
  // ===========================================================================
  {
    const s = pres.addSlide();
    addContentChrome(s, pres, {
      section: '2 Задание',
      title: '2.А3–А4. Электрическая схема 12 В, прошивка и учёт 60 fps',
      subtitle: 'Полный комплект: принципиальная схема, скетч Arduino, автотесты логики и методика видеорегистрации',
      slideNum: 8,
    });

    addCard(s, pres, {
      x: 0.92,
      y: 1.6,
      w: 5.95,
      h: 2.32,
      title: 'Схема управления (12 В ≤ 24 В) и алгоритмы С6',
      body:
        '• Контроллер: Arduino Nano + 2× TMC2209 (привод диска NEMA 17 + каретка SC8UU).\n' +
        '• Запрет самозапуска (С6): аппаратный pull-up R1 = 10 кОм на EN + переход в IDLE.\n' +
        '• Энкодер LM393 (INT0): 12 имп/об; при таймауте >1 100 мс — 2 реверса −15° → SAFE STOP.\n' +
        '• Детектор примесей KY-008 + заслонка SG90 переводят мусор в отводной канал.',
      fill: LAVENDER_SOFT,
      accent: NAVY,
      titleSize: 12.5,
      bodySize: 10.2,
    });

    addCard(s, pres, {
      x: 0.92,
      y: 4.06,
      w: 5.95,
      h: 2.3,
      title: 'Методика видеорегистрации 60 fps и расчёта P₁',
      body:
        '• Вспышка синхро-LED (50 мс) от LM393 задаёт на кадрах границы каждого окна события.\n' +
        '• Каждый цикл классифицируется в журнал CSV как 0 / 1 / 2+ / U (брак серии при P_U > 2%).\n' +
        '• Каретка раскладывает семена в 8 стаканчиков для сверки с покадровым разбором.\n' +
        '• Главная метрика — P₁ = E₁/E · 100%, а Q_один рассчитывается отдельно от качества.',
      fill: PINK_SOFT,
      accent: MAGENTA,
      titleSize: 12.5,
      bodySize: 10.2,
    });

    addVisualSlot(s, pres, {
      x: 7.08,
      y: 1.6,
      w: 5.78,
      h: 2.32,
      label: 'СКРИНШОТ №5: ЭЛЕКТРОСХЕМА 12 В DC',
      hint: 'Вставьте схему из вкладки «Схема и Прошивка»\n(electrical_schematic.svg)',
      accent: MAGENTA,
    });

    addVisualSlot(s, pres, {
      x: 7.08,
      y: 4.06,
      w: 5.78,
      h: 2.3,
      label: 'СКРИНШОТ №6: ОКНО КАМЕРЫ И ПУЛЬТ ПК',
      hint: 'Сделайте снимок виртуальной камеры 60 fps и нижней\nпрограммы управления во время работы 3D-стенда',
      accent: NAVY,
    });
  }

  // ===========================================================================
  // SLIDE 9 — ЗАДАНИЕ 2 · Б1–Б3: ВЕРИФИКАЦИЯ С1–С6 И ПЛАН НА ФИНАЛ
  // ===========================================================================
  {
    const s = pres.addSlide();
    addContentChrome(s, pres, {
      section: '2 Задание',
      title: '2.Б1–Б3. Верификация проекта С1–С6 и план финала',
      subtitle: 'Все проверки выполнены на цифровой модели и автотестах ПО — стенд готов к физической печати',
      slideNum: 9,
    });

    const cRows: PptxGenJS.TableRow[] = [
      [
        { text: 'Сценарий', options: { bold: true, fill: { color: NAVY }, color: WHITE } },
        { text: 'Дефект в проекте → Внесённое исправление → Цифровой итог', options: { bold: true, fill: { color: NAVY }, color: WHITE } },
      ],
      ['С1 CAD', 'Добавлены проверки assert() и сопло Ø17.0 мм → геометрия валидна'],
      ['С2 Слайсер', 'Опора +Z, 0 поддержек в карманах, юбка 4 мм → нарезка без ошибок'],
      ['С3 Сборка', 'Увеличен вынос кожуха муфты на +4 мм по сечению → зазоры чистые'],
      ['С4 Смена', 'Винты крышки заменены на 4 барашка М4 + М5 → расчётно 24 с (<45 с)'],
      ['С5 ПО', 'Введён гистерезис скорости + автотесты pytest (4/4 OK)'],
      ['С6 Защита', 'Подтяжка EN=HIGH (нет самозапуска) + анти-клин 2×−15° → подтверждено'],
    ].map((row, rIdx) =>
      row.map((cell) =>
        typeof cell === 'string'
          ? { text: cell, options: { fill: { color: rIdx % 2 === 0 ? WHITE : LAVENDER_SOFT }, color: DARK_TEXT } }
          : cell
      )
    );

    s.addTable(cRows, {
      x: 0.92,
      y: 1.6,
      w: 7.05,
      colW: [1.32, 5.73],
      rowH: [0.36, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72],
      fontFace: FONT,
      fontSize: 10,
      border: { type: 'solid', pt: 0.5, color: BORDER_BLUE },
      valign: 'middle',
    });

    addCard(s, pres, {
      x: 8.16,
      y: 1.6,
      w: 4.7,
      h: 2.34,
      title: `План на финал (~5 ч 20 мин · ${bomTotal.toLocaleString('ru-RU')} ₽)`,
      body:
        '• Печать 5 деталей (2 принтера: ~4 ч 45 мин) параллельно\n  со сборкой электроники и калибровкой зазоров.\n' +
        '• Серии сравнения на финале: A1→B1→A2→B2→A3→B3\n  по ≥100 событий при 10 об/мин, отсекатель 1.2 мм.\n' +
        `• Бюджет комплектующих (18 позиций): ${bomTotal.toLocaleString('ru-RU')} ₽.`,
      fill: LAVENDER_SOFT,
      accent: NAVY,
      titleSize: 12,
      bodySize: 10.1,
    });

    addVisualSlot(s, pres, {
      x: 8.16,
      y: 4.08,
      w: 4.7,
      h: 2.28,
      label: 'СКРИНШОТ №7: ТЕСТ ЗАКЛИНИВАНИЯ / КОДА',
      hint: 'Сделайте снимок 3D-стенда в режиме «Заклинивание»\nили вывод автотестов test_controller_logic.py',
      accent: MAGENTA,
    });
  }

  // ===========================================================================
  // SLIDE 10 — ВЫВОДЫ
  // ===========================================================================
  {
    const s = pres.addSlide();
    addContentChrome(s, pres, {
      section: 'Выводы',
      title: 'Выводы и готовность к финалу',
      subtitle: 'Что полностью решено в полуфинале и подготовлено к немедленной реализации на финале',
      slideNum: 10,
      pinkSection: true,
      smiley: true,
    });

    const hooks = [
      {
        num: '1.',
        title: 'Экономика и технология печати полностью обоснованы',
        body:
          '3D-печать экономически оправдана с 4-го диска (8 040 vs 10 000 ₽; −67.6% на 20 шт.).\n' +
          'Профиль PETG (+Z, 0.20 мм, без поддержек) подготовлен под 2 принтера (~4 ч 45 мин, 356 г).',
      },
      {
        num: '2.',
        title: 'Разработан полный цифровой двойник стенда и дисков A/B',
        body:
          'Оптимум N = 12 (10 об/мин, t_зап = 1.50 с), быстрая смена <45 с, сопло Ø17 мм, защитный кожух.\n' +
          'Схема 12 В DC, прошивка (EN=HIGH без самозапуска, анти-клин −15°, KY-008 + SG90) проверены тестами.',
      },
      {
        num: '3.',
        title: 'Сформирован готовый комплект передачи на финал (23 файла)',
        body:
          'STL-модели, чертежи с допусками, электросхема, прошивка, CSV-журнал и регламент испытаний С1–С6\n' +
          'позволяют приступить к печати, сборке и видеозаписи 60 fps на финале за 5 ч 20 мин.',
      },
    ];

    hooks.forEach((hk, idx) => {
      const hy = 1.72 + idx * 1.56;
      s.addShape(pres.ShapeType.roundRect, {
        x: 0.98,
        y: hy + 0.04,
        w: 0.85,
        h: 1.18,
        rectRadius: 0.16,
        fill: { color: idx === 1 ? MAGENTA : NAVY },
        line: { color: idx === 1 ? MAGENTA : NAVY, width: 0 },
      });
      s.addText(hk.num, {
        x: 0.98,
        y: hy + 0.04,
        w: 0.85,
        h: 1.18,
        fontFace: FONT,
        fontSize: 30,
        bold: true,
        color: WHITE,
        align: 'center',
        valign: 'middle',
        margin: 0,
      });

      s.addShape(pres.ShapeType.roundRect, {
        x: 1.98,
        y: hy,
        w: 9.85,
        h: 1.26,
        rectRadius: 0.1,
        fill: { color: idx === 1 ? PINK_SOFT : LAVENDER_SOFT },
        line: { color: BORDER_BLUE, width: 0.8 },
      });
      s.addText(hk.title, {
        x: 2.18,
        y: hy + 0.1,
        w: 9.5,
        h: 0.34,
        fontFace: FONT,
        fontSize: 14.5,
        bold: true,
        color: idx === 1 ? MAGENTA : NAVY,
        margin: 0,
      });
      s.addText(hk.body, {
        x: 2.18,
        y: hy + 0.46,
        w: 9.5,
        h: 0.74,
        fontFace: FONT,
        fontSize: 11,
        color: DARK_TEXT,
        margin: 0,
      });
    });
  }

  // ===========================================================================
  // SLIDE 11 — КОМАНДА ASSEMBLER
  // ===========================================================================
  {
    const s = pres.addSlide();
    addContentChrome(s, pres, {
      section: 'Команда',
      title: 'Команда «Assembler»',
      subtitle: 'Распределение инженерных ролей при разработке цифрового проекта кейса AT9-3',
      slideNum: 11,
      smiley: true,
    });

    const members = [
      { role: 'Капитан / Системный инженер', resp: 'Расчёты 1.1–1.4, ТЗ и защита проекта' },
      { role: 'Инженер-конструктор CAD', resp: 'OpenSCAD, диски A/B, 3D-сборка и STL' },
      { role: 'Технолог 3D-печати', resp: 'Профиль PETG, чертежи и контроль допусков' },
      { role: 'Инженер-электроник', resp: 'Схема 12 В, TMC2209, LM393, KY-008 + SG90' },
      { role: 'Разработчик ПО и учёта', resp: 'Прошивка, автотесты, методика 60 fps' },
    ];

    members.forEach((mb, idx) => {
      const mx = 0.92 + idx * 2.41;
      s.addShape(pres.ShapeType.roundRect, {
        x: mx,
        y: 1.68,
        w: 2.26,
        h: 3.5,
        rectRadius: 0.1,
        fill: { color: LAVENDER_SOFT },
        line: { color: BORDER_BLUE, width: 0.9 },
      });

      // Stylized camera avatar badge (looks clean as-is, or can be replaced with member photo)
      s.addShape(pres.ShapeType.roundRect, {
        x: mx + 0.56,
        y: 1.96,
        w: 1.14,
        h: 0.88,
        rectRadius: 0.14,
        fill: { color: NAVY },
        line: { color: NAVY, width: 0 },
      });
      s.addShape(pres.ShapeType.ellipse, {
        x: mx + 0.84,
        y: 2.11,
        w: 0.58,
        h: 0.58,
        fill: { color: WHITE },
        line: { color: MAGENTA, width: 3 },
      });
      s.addShape(pres.ShapeType.ellipse, {
        x: mx + 1.0,
        y: 2.27,
        w: 0.26,
        h: 0.26,
        fill: { color: NAVY },
        line: { color: NAVY, width: 0 },
      });

      s.addText(`Участник ${idx + 1}\n[Имя Фамилия]`, {
        x: mx + 0.1,
        y: 3.04,
        w: 2.06,
        h: 0.5,
        fontFace: FONT,
        fontSize: 12,
        bold: true,
        color: NAVY,
        align: 'center',
        margin: 0,
      });
      s.addText(mb.role, {
        x: mx + 0.1,
        y: 3.6,
        w: 2.06,
        h: 0.44,
        fontFace: FONT,
        fontSize: 10.5,
        bold: true,
        color: MAGENTA,
        align: 'center',
        margin: 0,
      });
      s.addText(mb.resp, {
        x: mx + 0.12,
        y: 4.12,
        w: 2.02,
        h: 0.92,
        fontFace: FONT,
        fontSize: 9.8,
        color: DARK_TEXT,
        align: 'center',
        margin: 0,
      });
    });

    s.addShape(pres.ShapeType.roundRect, {
      x: 0.92,
      y: 5.38,
      w: 11.95,
      h: 0.9,
      rectRadius: 0.08,
      fill: { color: WHITE },
      line: { color: MAGENTA, width: 1 },
    });
    s.addText(
      [
        { text: 'Наставник: ', options: { bold: true, color: NAVY, fontSize: 12.5 } },
        { text: '[ФИО наставника]     |     ', options: { color: DARK_TEXT, fontSize: 12.5 } },
        { text: 'Готовы ответить на вопросы экспертного жюри!', options: { bold: true, color: MAGENTA, fontSize: 13.5 } },
      ],
      {
        x: 1.1,
        y: 5.44,
        w: 11.6,
        h: 0.78,
        fontFace: FONT,
        align: 'center',
        valign: 'middle',
        margin: 0,
      }
    );
  }

  // ===========================================================================
  // SLIDE 12 — ФИНАЛЬНЫЙ СЛАЙД
  // ===========================================================================
  {
    const s = pres.addSlide();
    s.background = { color: NAVY };
    addWaves(s, pres, true);
    addInnagrikaLogo(s, pres, true);

    s.addText('Спасибо за внимание!', {
      x: 1.2,
      y: 2.7,
      w: 10.933,
      h: 1.2,
      fontFace: FONT,
      fontSize: 48,
      bold: true,
      color: WHITE,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });

    s.addShape(pres.ShapeType.rect, {
      x: 4.85,
      y: 4.05,
      w: 3.633,
      h: 0.06,
      fill: { color: MAGENTA },
      line: { color: MAGENTA, width: 0 },
    });

    s.addText('Команда «Assembler» · Кейс AT9-3 · Профиль «Агротех» · Иннагрика 2026', {
      x: 1.2,
      y: 4.3,
      w: 10.933,
      h: 0.5,
      fontFace: FONT,
      fontSize: 16,
      color: LAVENDER,
      align: 'center',
      margin: 0,
    });
  }

  const out = await pres.write({ outputType: 'uint8array' });
  return out as Uint8Array;
}
