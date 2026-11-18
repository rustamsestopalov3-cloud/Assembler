#!/usr/bin/env python3
"""Render crisp, high-resolution Russian technical diagrams to public/assets/diagrams/*.png via ImageMagick."""

import math
import os
import subprocess

OUT_DIR = os.path.join(os.getcwd(), "public", "assets", "diagrams")
os.makedirs(OUT_DIR, exist_ok=True)

FONT_REG = "DejaVu-Sans"
FONT_BOLD = "DejaVu-Sans-Bold"
FONT_MONO = "DejaVu-Sans-Mono-Bold"


def run_mvg(filename: str, width: int, height: int, commands: list[str]) -> None:
    mvg_path = os.path.join("/tmp", filename + ".mvg")
    out_path = os.path.join(OUT_DIR, filename)
    with open(mvg_path, "w", encoding="utf-8") as f:
        f.write("\n".join(commands))
    subprocess.run(
        ["convert", "-size", f"{width}x{height}", "xc:#FFFFFF", "-draw", f"@{mvg_path}", out_path],
        check=True,
    )
    os.remove(mvg_path)


def esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace("'", "\\'")


def txt_tl(x: float, top_y: float, text: str, size: int = 16, fill: str = "#1F243D", font: str = FONT_REG) -> list[str]:
    """Top-left anchored text (top_y is exact top edge of text box)."""
    return [
        "gravity NorthWest",
        f"font '{font}'",
        f"font-size {size}",
        f"fill '{fill}'",
        "stroke none",
        f"text {x:.1f},{top_y:.1f} '{esc(text)}'",
    ]


def txt_center(cx: float, cy: float, W: int, H: int, text: str, size: int = 16, fill: str = "#1F243D", font: str = FONT_BOLD) -> list[str]:
    """Center-anchored text around (cx, cy)."""
    dx = cx - W / 2.0
    dy = cy - H / 2.0
    return [
        "gravity Center",
        f"font '{font}'",
        f"font-size {size}",
        f"fill '{fill}'",
        "stroke none",
        f"text {dx:.1f},{dy:.1f} '{esc(text)}'",
    ]


def rect(x1: float, y1: float, x2: float, y2: float, fill: str = "none", stroke: str = "none", sw: float = 2, rx: float = 0) -> list[str]:
    cmds = [f"fill '{fill}'", f"stroke '{stroke}'", f"stroke-width {sw}"]
    if rx > 0:
        cmds.append(f"roundrectangle {x1:.1f},{y1:.1f} {x2:.1f},{y2:.1f} {rx:.1f},{rx:.1f}")
    else:
        cmds.append(f"rectangle {x1:.1f},{y1:.1f} {x2:.1f},{y2:.1f}")
    return cmds


def line(x1: float, y1: float, x2: float, y2: float, stroke: str = "#2B3B7F", sw: float = 2, dash: str = "") -> list[str]:
    cmds = ["fill none", f"stroke '{stroke}'", f"stroke-width {sw}"]
    if dash:
        cmds.append(f"stroke-dasharray {dash}")
    cmds.append(f"line {x1:.1f},{y1:.1f} {x2:.1f},{y2:.1f}")
    if dash:
        cmds.append("stroke-dasharray none")
    return cmds


def arrow(x1: float, y1: float, x2: float, y2: float, stroke: str = "#2B3B7F", sw: float = 2.2, head: float = 9.0) -> list[str]:
    cmds = line(x1, y1, x2, y2, stroke, sw)
    ang = math.atan2(y2 - y1, x2 - x1)
    a1 = ang + math.pi * 0.82
    a2 = ang - math.pi * 0.82
    p1 = (x2 + head * math.cos(a1), y2 + head * math.sin(a1))
    p2 = (x2 + head * math.cos(a2), y2 + head * math.sin(a2))
    cmds += [
        f"fill '{stroke}'",
        f"stroke '{stroke}'",
        "stroke-width 1",
        f"polygon {x2:.1f},{y2:.1f} {p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}",
    ]
    return cmds


def circle(cx: float, cy: float, r: float, fill: str = "none", stroke: str = "none", sw: float = 2) -> list[str]:
    return [
        f"fill '{fill}'",
        f"stroke '{stroke}'",
        f"stroke-width {sw}",
        f"circle {cx:.1f},{cy:.1f} {cx + r:.1f},{cy:.1f}",
    ]


def render_economics_chart():
    W, H = 1140, 580
    cmds: list[str] = []
    cmds += rect(8, 8, W - 8, H - 8, "#FFFFFF", "#CBD5E1", 2, 12)
    cmds += txt_tl(36, 24, "Сравнение затрат: готовый диск (2 500 ₽/шт.) vs 3D-печать PETG (6 000 + 510·N ₽)", 19, "#2B3B7F", FONT_BOLD)
    cmds += txt_tl(36, 54, "Условная расчётная модель (Таблица 1): N = 1..22 шт. · Точка безубыточности N ≈ 3.02 → выгодно с N = 4 шт.", 14, "#64748B", FONT_REG)

    px0, py0, px1, py1 = 110, 96, 1070, 488
    max_n = 22
    max_rub = 56000

    def map_x(n: float) -> float:
        return px0 + (n / max_n) * (px1 - px0)

    def map_y(rub: float) -> float:
        return py1 - (rub / max_rub) * (py1 - py0)

    for rub in range(0, 55001, 10000):
        y = map_y(rub)
        cmds += line(px0, y, px1, y, "#E2E8F0", 1.2)
        cmds += txt_tl(22, y - 9, f"{rub // 1000} тыс.", 13, "#475569", FONT_MONO)

    for n in [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]:
        x = map_x(n)
        cmds += line(x, py0, x, py1, "#F1F5F9", 1.2)
        cmds += txt_center(x, py1 + 20, W, H, str(n), 13, "#475569", FONT_MONO)

    cmds += line(px0, py0, px0, py1, "#334155", 2.4)
    cmds += line(px0, py1, px1, py1, "#334155", 2.4)
    cmds += txt_center((px0 + px1) / 2, py1 + 48, W, H, "Количество дисков в партии, N (шт.)", 15, "#1F243D", FONT_BOLD)

    cmds += line(map_x(0), map_y(0), map_x(22), map_y(2500 * 22), "#2B3B7F", 4.5)
    cmds += line(map_x(0), map_y(6000), map_x(22), map_y(6000 + 510 * 22), "#DF2F7D", 4.5)

    # Legend box (plenty of top/bottom clearance)
    cmds += rect(138, 108, 575, 192, "#F8FAFC", "#CBD5E1", 1.6, 10)
    cmds += line(158, 134, 205, 134, "#2B3B7F", 4.5)
    cmds += txt_tl(220, 124, "Готовые диски (2 500 ₽/шт.)", 14, "#2B3B7F", FONT_BOLD)
    cmds += line(158, 166, 205, 166, "#DF2F7D", 4.5)
    cmds += txt_tl(220, 156, "3D-печать PETG (6 000 + 510·N ₽)", 14, "#DF2F7D", FONT_BOLD)

    # Break-even highlight at N = 3.015
    bx, by = map_x(3.015), map_y(7538)
    cmds += line(bx, by, bx, py1, "#0F766E", 2.0, "6,4")
    cmds += circle(bx, by, 7, "#0F766E", "#FFFFFF", 2.2)
    cmds += line(bx, by, bx + 20, by - 115, "#0F766E", 1.6)
    cmds += rect(138, 224, 468, 304, "#ECFDF5", "#0F766E", 1.8, 10)
    cmds += txt_tl(156, 238, "Точка выравнивания ≈ 3.02 шт.", 14, "#065F46", FONT_BOLD)
    cmds += txt_tl(156, 266, "С 4 дисков 3D-печать стабильно выгоднее", 13, "#0F766E", FONT_REG)

    # N=4 highlight (to the right, below magenta line)
    x4, yr4, yp4 = map_x(4), map_y(10000), map_y(8040)
    cmds += line(x4, yr4, x4, yp4, "#64748B", 1.6, "4,4")
    cmds += circle(x4, yr4, 6.5, "#2B3B7F", "#FFFFFF", 2)
    cmds += circle(x4, yp4, 6.5, "#DF2F7D", "#FFFFFF", 2)
    cmds += line(x4, yp4, x4 + 34, yp4 + 4, "#CBD5E1", 1.6)
    cmds += rect(x4 + 34, yp4 - 16, x4 + 318, yp4 + 62, "#F8FAFC", "#94A3B8", 1.6, 10)
    cmds += txt_tl(x4 + 50, yp4 - 2, "N = 4: 10 000 vs 8 040 ₽", 13.5, "#2B3B7F", FONT_BOLD)
    cmds += txt_tl(x4 + 50, yp4 + 26, "Экономия: 1 960 ₽ (−19.6%)", 13.5, "#DF2F7D", FONT_BOLD)

    # N=20 highlight
    x20, yr20, yp20 = map_x(20), map_y(50000), map_y(16200)
    cmds += line(x20, yr20, x20, yp20, "#64748B", 1.8, "4,4")
    cmds += circle(x20, yr20, 7, "#2B3B7F", "#FFFFFF", 2)
    cmds += circle(x20, yp20, 7, "#DF2F7D", "#FFFFFF", 2)

    cmds += rect(x20 - 305, yr20 - 32, x20 - 18, yr20 + 26, "#EEF2FF", "#2B3B7F", 1.8, 10)
    cmds += txt_center(x20 - 161.5, yr20 - 3, W, H, "N = 20: 50 000 ₽ (готовые)", 13.5, "#2B3B7F", FONT_BOLD)

    cmds += rect(x20 - 325, yp20 - 52, x20 - 18, yp20 + 30, "#FDF2F8", "#DF2F7D", 1.8, 10)
    cmds += txt_tl(x20 - 308, yp20 - 40, "N = 20: 16 200 ₽ (3D-печать)", 13.5, "#DF2F7D", FONT_BOLD)
    cmds += txt_tl(x20 - 308, yp20 - 12, "Экономия: 33 800 ₽ (в 3.09×)", 13.5, "#0F766E", FONT_BOLD)

    run_mvg("economics_breakeven.png", W, H, cmds)


def render_disc_geometry():
    W, H = 1400, 760
    cmds: list[str] = []
    cmds += rect(8, 8, W - 8, H - 8, "#FFFFFF", "#CBD5E1", 2, 14)

    # Header bar
    cmds += txt_tl(36, 24, "Конструкция сменного диска AT9-3 (N = 12 · Ø120 мм · PETG): Вариант A и Вариант B", 22, "#2B3B7F", FONT_BOLD)
    cmds += txt_tl(36, 56, "Единый варьируемый параметр сравнения — входная заборная фаска с = 0.0 мм (Вариант A) против с = 1.8×45° (Вариант B)", 14, "#64748B", FONT_REG)

    # Vertical divider
    cmds += line(625, 88, 625, 725, "#CBD5E1", 2)

    # ---------------- LEFT: FRONT VIEW ----------------
    cx, cy = 315, 385
    scale = 2.15
    R = 60 * scale          # 129 px (D1 = 120 мм)
    Rp = 47 * scale         # 101.05 px (D2 = 94 мм)
    Renc = 27 * scale       # 58.05 px (R_паз = 27 мм)
    rc = 4.6 * scale        # 9.89 px (D_яч = 9.2 мм)
    r_chamfer = (4.6 + 1.8) * scale  # 13.76 px (Ø12.8 мм вход фаски)

    cmds += txt_center(cx, 114, W, H, "Вид спереди: 12 ячеек и 12 прорезей энкодера LM393", 17, "#1F243D", FONT_BOLD)

    # Outer disc + pitch circle + encoder circle
    cmds += circle(cx, cy, R, "#F0FDFA", "#0F766E", 3.2)
    cmds += circle(cx, cy, Rp, "none", "#2B3B7F", 1.5)
    cmds += circle(cx, cy, Renc, "none", "#94A3B8", 1.0)

    # 12 cells + 12 rectangular radial encoder slots (3.2 x 6 mm)
    for i in range(12):
        a = i * math.pi / 6 - math.pi / 2
        ca, sa = math.cos(a), math.sin(a)
        px, py = -sa, ca

        # Cell + chamfer halo
        x = cx + ca * Rp
        y = cy + sa * Rp
        cmds += circle(x, y, r_chamfer, "#FDF2F8", "#DF2F7D", 1.4)
        cmds += circle(x, y, rc, "#FFFFFF", "#0F766E", 2.2)

        # Actual radial slot (6 mm radial x 3.2 mm tangential)
        r_in = (27 - 3.0) * scale
        r_out = (27 + 3.0) * scale
        hw = 1.6 * scale
        p1 = (cx + ca * r_in - px * hw, cy + sa * r_in - py * hw)
        p2 = (cx + ca * r_out - px * hw, cy + sa * r_out - py * hw)
        p3 = (cx + ca * r_out + px * hw, cy + sa * r_out + py * hw)
        p4 = (cx + ca * r_in + px * hw, cy + sa * r_in + py * hw)
        cmds += [
            "fill '#1E293B'",
            "stroke '#0F172A'",
            "stroke-width 1",
            f"polygon {p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f} {p3[0]:.1f},{p3[1]:.1f} {p4[0]:.1f},{p4[1]:.1f}",
        ]

    # Central D-shaft bore Ø8.0 мм (flat on top/right)
    r_bore = 11.5
    cmds += circle(cx, cy, r_bore, "#FFFFFF", "#1F243D", 2.8)
    cmds += rect(cx - r_bore, cy - r_bore - 1, cx + r_bore, cy - r_bore + 4.5, "#0F766E", "#1F243D", 1.5)

    # Dimension lines & clean external callouts (never crossing encoder slots!)
    # Outer D1 = 120 mm dimension on top
    cmds += line(cx - R, cy - R - 28, cx - R, cy, "#2B3B7F", 1.2, "4,4")
    cmds += line(cx + R, cy - R - 28, cx + R, cy, "#2B3B7F", 1.2, "4,4")
    cmds += arrow(cx, cy - R - 24, cx - R, cy - R - 24, "#2B3B7F", 1.6, 8)
    cmds += arrow(cx, cy - R - 24, cx + R, cy - R - 24, "#2B3B7F", 1.6, 8)
    cmds += rect(cx - 56, cy - R - 38, cx + 56, cy - R - 12, "#FFFFFF", "none", 0)
    cmds += txt_center(cx, cy - R - 25, W, H, "D1 = 120.0 мм", 13.5, "#2B3B7F", FONT_BOLD)

    # D-shaft callout arrow to lower-left outside disc
    cmds += arrow(cx - 10, cy + 8, cx - R - 22, cy + 68, "#1F243D", 1.6, 8)
    cmds += rect(28, cy + 56, 174, cy + 104, "#F8FAFC", "#334155", 1.4, 6)
    cmds += txt_center(101, cy + 72, W, H, "D-вал Ø8.0 мм", 12.5, "#1F243D", FONT_BOLD)
    cmds += txt_center(101, cy + 91, W, H, "(посадка +0.20)", 11, "#475569", FONT_REG)

    # Encoder slots callout arrow to upper-right outside disc
    cmds += arrow(cx + 42, cy - 42, cx + R + 16, cy - 86, "#0F766E", 1.6, 8)
    cmds += rect(cx + R + 12, cy - 118, 608, cy - 66, "#ECFDF5", "#0F766E", 1.4, 6)
    cmds += txt_center(526, cy - 101, W, H, "12 прорезей LM393", 12, "#065F46", FONT_BOLD)
    cmds += txt_center(526, cy - 81, W, H, "3.2×6 мм на R=27 мм", 11, "#0F766E", FONT_REG)

    # Bottom summary box on left
    cmds += rect(36, 560, 594, 710, "#F8FAFC", "#CBD5E1", 1.6, 10)
    cmds += txt_tl(56, 578, "Базовые геометрические параметры (общие для A и B):", 14, "#2B3B7F", FONT_BOLD)
    cmds += txt_tl(56, 608, "• Наружный диаметр D1 = 120.0 мм · Толщина H = 10.0 мм", 13.5, "#1F243D", FONT_REG)
    cmds += txt_tl(56, 634, "• Делительная окружность ячеек D2 = 94.0 мм (N = 12)", 13.5, "#1F243D", FONT_REG)
    cmds += txt_tl(56, 660, "• Хордовый шаг ячеек L = 94·sin(π/12) = 24.33 мм", 13.5, "#1F243D", FONT_REG)
    cmds += txt_tl(56, 686, "• Выпускное окно корпуса: сквозное Ø17.0 мм (> 2·d_max)", 13.5, "#0F766E", FONT_BOLD)

    # ---------------- TOP RIGHT: VARIANT A ----------------
    cmds += rect(655, 96, 1368, 404, "#F8FAFC", "#2B3B7F", 2.2, 12)
    cmds += txt_tl(682, 114, "Вариант A — прямая цилиндрическая ячейка (c = 0.0 мм)", 17, "#2B3B7F", FONT_BOLD)
    cmds += txt_tl(682, 142, "Перемычка: 15.13 мм · Дно t = 2.2 мм · Жёсткое отсечение дубля", 13.5, "#475569", FONT_REG)

    # Cutoff blade clearly ABOVE pocket with generous padding
    cmds += rect(690, 182, 845, 224, "#D97706", "#78350F", 2, 5)
    cmds += txt_center(767.5, 203, W, H, "Отсекатель (1.2 мм)", 12.5, "#FFFFFF", FONT_BOLD)

    # 2nd seed being knocked away
    cmds += circle(916, 204, 24, "#FDE047", "#B45309", 2.2)
    cmds += txt_center(916, 204, W, H, "2-е", 11.5, "#78350F", FONT_BOLD)
    cmds += arrow(946, 204, 982, 204, "#B45309", 2.2, 8)
    cmds += txt_tl(990, 194, "2-е семя сбивается отсекателем", 13, "#B45309", FONT_BOLD)

    # Cross-section of Variant A disc (y=244..374, height=130px for 10mm)
    cmds += rect(700, 244, 836, 374, "#CBD5E1", "#334155", 2)
    cmds += rect(836, 345, 964, 374, "#CBD5E1", "#334155", 2)
    cmds += rect(964, 244, 1100, 374, "#CBD5E1", "#334155", 2)
    cmds += rect(836, 244, 964, 345, "#FFFFFF", "#0F766E", 2.2)

    # Gap 1.2 mm indicator between blade bottom (224) and disc top (244)
    cmds += line(845, 224, 845, 244, "#D97706", 1.8)

    # Main seed centered inside pocket
    cmds += circle(900, 295, 36, "#A3E635", "#3F6212", 2.2)
    cmds += txt_center(900, 295, W, H, "d = 7.2 мм", 13, "#1F243D", FONT_BOLD)

    # Dimension table right of cross-section
    cmds += rect(1124, 244, 1344, 374, "#FFFFFF", "#CBD5E1", 1.5, 8)
    cmds += txt_tl(1142, 258, "D_яч = 9.2 мм", 15, "#2B3B7F", FONT_MONO)
    cmds += txt_tl(1142, 288, "h_яч = 7.8 мм", 15, "#2B3B7F", FONT_MONO)
    cmds += txt_tl(1142, 318, "H = 10.0 мм", 15, "#0F766E", FONT_MONO)
    cmds += txt_tl(1142, 346, "Дно t = 2.2 мм", 13.5, "#475569", FONT_REG)

    # ---------------- BOTTOM RIGHT: VARIANT B ----------------
    cmds += rect(655, 424, 1368, 728, "#FDF2F8", "#DF2F7D", 2.2, 12)
    cmds += txt_tl(682, 442, "Вариант B — ячейка с входной фаской c = 1.8 × 45°", 17, "#DF2F7D", FONT_BOLD)
    cmds += txt_tl(682, 470, "Перемычка: 11.53 мм (≥ 3 мм) · Уверенный захват при 10–15 об/мин", 13.5, "#475569", FONT_REG)

    # Entrance width callout above chamfer
    cmds += arrow(900, 514, 814, 514, "#DF2F7D", 1.8, 7)
    cmds += arrow(900, 514, 986, 514, "#DF2F7D", 1.8, 7)
    cmds += rect(842, 498, 958, 526, "#FDF2F8", "none", 0)
    cmds += txt_center(900, 512, W, H, "Вход Ø12.8 мм", 13, "#DF2F7D", FONT_BOLD)

    # Cross-section of Variant B disc (y=536..666)
    cmds += rect(700, 536, 814, 666, "#CBD5E1", "#334155", 2)
    cmds += rect(814, 637, 986, 666, "#CBD5E1", "#334155", 2)
    cmds += rect(986, 536, 1100, 666, "#CBD5E1", "#334155", 2)
    cmds += [
        "fill '#FFFFFF'",
        "stroke '#DF2F7D'",
        "stroke-width 2.5",
        "polygon 814,536 986,536 964,562 964,637 836,637 836,562",
    ]
    cmds += circle(900, 594, 36, "#A3E635", "#3F6212", 2.2)
    cmds += txt_center(900, 594, W, H, "d = 7.2 мм", 13, "#1F243D", FONT_BOLD)

    # Dimension table right of Variant B
    cmds += rect(1124, 536, 1344, 666, "#FFFFFF", "#FBCFE8", 1.5, 8)
    cmds += txt_tl(1142, 550, "Фаска 1.8×45°", 15, "#DF2F7D", FONT_BOLD)
    cmds += txt_tl(1142, 580, "D_яч = 9.2 мм", 15, "#2B3B7F", FONT_MONO)
    cmds += txt_tl(1142, 610, "h_яч = 7.8 мм", 15, "#2B3B7F", FONT_MONO)
    cmds += txt_tl(1142, 638, "H = 10.0 мм", 15, "#0F766E", FONT_MONO)

    cmds += txt_tl(682, 686, "Итог: обе модели печатаются из PETG без поддержек (+Z вверх), масса ~38 г/диск.", 13.5, "#1F243D", FONT_BOLD)

    run_mvg("disc_variants_ab.png", W, H, cmds)


def render_seeder_cycle():
    W, H = 1400, 780
    cmds: list[str] = []
    cmds += rect(8, 8, W - 8, H - 8, "#FFFFFF", "#CBD5E1", 2, 14)
    cmds += txt_tl(36, 24, "Кинематическая схема стенда «Assembler»: 4 фазы дозирования + контроль KY-008 и 60 fps", 21, "#2B3B7F", FONT_BOLD)

    # Top 4 phase cards with tall 42px headers & perfectly centered titles
    phases = [
        ("1. ЗАХВАТ", "Бункер (скат 48°) подаёт", "семена в ячейку с фаской", "#2B3B7F"),
        ("2. ПЕРЕНОС", "Диск N=12 (10 об/мин) ведёт", "семя вдоль дуги 0.45 мм", "#0F766E"),
        ("3. УДАЛЕНИЕ ЛИШНЕГО", "Отсекатель 1.2 мм сбрасывает", "2-е семя; анти-клин −15°", "#D97706"),
        ("4. ОСВОБОЖДЕНИЕ", "Сопло Ø17 мм → лазер KY-008 →", "стаканы #1..#8 или урна Z=60", "#DF2F7D"),
    ]
    for idx, (t, l1, l2, col) in enumerate(phases):
        x0 = 36 + idx * 336
        x1 = x0 + 318
        cmds += rect(x0, 68, x1, 172, "#F8FAFC", col, 2.2, 10)
        cmds += rect(x0, 68, x1, 110, col, col, 1, 8)
        cmds += txt_center((x0 + x1) / 2, 89, W, H, t, 15, "#FFFFFF", FONT_BOLD)
        cmds += txt_tl(x0 + 16, 120, l1, 13, "#1F243D", FONT_REG)
        cmds += txt_tl(x0 + 16, 144, l2, 13, "#475569", FONT_REG)
        if idx < 3:
            cmds += arrow(x1 + 2, 120, x1 + 16, 120, "#DF2F7D", 3, 7)

    # ---------------- LEFT/CENTER KINEMATIC DIAGRAM ----------------
    # Motor NEMA 17 + Guard
    cmds += rect(36, 265, 230, 395, "#E2E8F0", "#334155", 2.2, 10)
    cmds += txt_center(133, 298, W, H, "NEMA 17 (12 В DC)", 15.5, "#1F243D", FONT_BOLD)
    cmds += txt_center(133, 328, W, H, "Муфта 5→8 + 608ZZ", 13.5, "#475569", FONT_REG)
    cmds += txt_center(133, 358, W, H, "Кожух защиты PRT-04", 13.5, "#0F766E", FONT_BOLD)

    # Shaft line & bearing block
    cmds += line(230, 330, 385, 330, "#334155", 9)
    cmds += rect(272, 314, 306, 346, "#94A3B8", "#1E293B", 2, 3)
    cmds += txt_center(289, 294, W, H, "Вал Ø8", 12, "#334155", FONT_BOLD)

    # Disc N=12
    dcx, dcy = 490, 330
    cmds += circle(dcx, dcy, 104, "#F0FDFA", "#0F766E", 3.5)
    cmds += circle(dcx, dcy, 79, "none", "#2B3B7F", 1.6)
    for k in range(12):
        ang = k * math.pi / 6 - math.pi / 2
        cmds += circle(dcx + math.cos(ang) * 79, dcy + math.sin(ang) * 79, 8.5, "#FFFFFF", "#DF2F7D", 1.8)
    cmds += circle(dcx, dcy, 13, "#FFFFFF", "#1F243D", 2.6)
    cmds += txt_center(dcx, dcy + 26, W, H, "N=12", 12, "#2B3B7F", FONT_BOLD)

    # Hopper (top right of disc)
    cmds += ["fill '#E0F2FE'", "stroke '#0284C7'", "stroke-width 2.4", "polygon 545,196 692,196 634,274 568,274"]
    cmds += txt_center(618, 224, W, H, "Бункер", 15, "#0369A1", FONT_BOLD)
    cmds += txt_center(618, 248, W, H, "скат 48°", 13, "#0369A1", FONT_REG)

    # Cutoff blade (top left of disc)
    cmds += rect(392, 240, 444, 264, "#D97706", "#78350F", 2, 4)
    cmds += arrow(366, 232, 390, 246, "#92400E", 1.8, 7)
    cmds += rect(238, 200, 366, 248, "#FEF3C7", "#D97706", 1.5, 6)
    cmds += txt_center(302, 214, W, H, "Отсекатель", 13, "#92400E", FONT_BOLD)
    cmds += txt_center(302, 234, W, H, "зазор 1.2 мм", 12, "#B45309", FONT_REG)

    # LM393 Optical encoder below-left of disc (generous height, centered text)
    cmds += rect(278, 404, 412, 448, "#ECFDF5", "#0F766E", 2, 6)
    cmds += txt_center(345, 426, W, H, "LM393 (D2 INT0)", 13.5, "#065F46", FONT_BOLD)
    cmds += line(412, 420, 444, 396, "#0F766E", 1.6, "4,3")

    # Discharge nozzle Ø17 mm directly under disc
    cmds += rect(464, 434, 516, 466, "#FFFFFF", "#0F766E", 2.6, 3)
    cmds += arrow(490, 468, 490, 492, "#16A34A", 2.4, 7)
    cmds += txt_tl(254, 462, "Отв. сброса Ø17.0 мм", 14, "#0F766E", FONT_BOLD)

    # Laser C-bridge KY-008 (emitter + red laser beam + receiver)
    cmds += rect(410, 498, 458, 524, "#F59E0B", "#78350F", 1.8, 4)
    cmds += rect(522, 498, 570, 524, "#1E293B", "#0F172A", 1.8, 4)
    cmds += line(458, 511, 522, 511, "#EF4444", 4.2)
    cmds += txt_tl(212, 502, "С-мост KY-008 (D3 / A0)", 14, "#DC2626", FONT_BOLD)

    # SG90 diverter gate -> Trash bin (well separated!)
    cmds += line(498, 536, 650, 610, "#D97706", 5.5)
    cmds += circle(498, 536, 6, "#B45309", "#78350F", 2)
    cmds += rect(566, 522, 742, 560, "#FEF3C7", "#D97706", 1.5, 6)
    cmds += txt_center(654, 541, W, H, "Заслонка SG90 (D11)", 13, "#92400E", FONT_BOLD)

    cmds += rect(658, 594, 845, 696, "#FEE2E2", "#DC2626", 2.4, 10)
    cmds += txt_center(751.5, 628, W, H, "УРНА МУСОР", 15, "#991B1B", FONT_BOLD)
    cmds += txt_center(751.5, 658, W, H, "вынесена на Z = 60", 13, "#B91C1C", FONT_REG)

    # 8-Cup Carriage (tall box so #1..#8 and bottom title NEVER collide)
    cmds += rect(182, 628, 608, 746, "#EEF2FF", "#2B3B7F", 2.2, 10)
    for c in range(8):
        cx0 = 200 + c * 49
        cmds += rect(cx0, 580, cx0 + 34, 630, "#E0F2FE", "#0F766E", 1.8, 4)
        cmds += circle(cx0 + 17, 610, 6.5, "#84CC16", "#3F6212", 1.5)
        cmds += txt_center(cx0 + 17, 662, W, H, f"#{c+1}", 13, "#2B3B7F", FONT_MONO)
    cmds += txt_center(395, 714, W, H, "Каретка SC8UU + ремень GT2 + NEMA 14", 14.5, "#2B3B7F", FONT_BOLD)

    # ---------------- RIGHT PANELS ----------------
    # Panel 1: 60 fps camera
    cmds += rect(882, 198, 1364, 444, "#F8FAFC", "#0284C7", 2.2, 12)
    cmds += rect(882, 198, 1364, 240, "#0284C7", "#0284C7", 1, 10)
    cmds += txt_center(1123, 219, W, H, "Независимая регистрация 60 fps", 16, "#FFFFFF", FONT_BOLD)
    cmds += txt_tl(904, 258, "• Камера жёстко на правом профиле 2020", 14, "#1F243D", FONT_REG)
    cmds += txt_tl(904, 290, "• Сзади калибровочная мишень А4", 14, "#1F243D", FONT_REG)
    cmds += txt_tl(920, 316, "(сетка 1 мм — масштаб скорости)", 13.5, "#475569", FONT_REG)
    cmds += txt_tl(904, 350, "• Синхро-LED (D12): вспышка 50 мс/событие", 14, "#0F766E", FONT_BOLD)
    cmds += txt_tl(904, 384, "• Классификация видеокадра: 0 / 1 / 2+ / U", 14, "#DF2F7D", FONT_BOLD)
    cmds += txt_tl(904, 412, "• Перекрёстная проверка в 8 стаканчиков", 13.5, "#2B3B7F", FONT_REG)

    # Panel 2: Operator PC console
    cmds += rect(882, 466, 1364, 746, "#0F172A", "#2B3B7F", 2.2, 12)
    cmds += rect(882, 466, 1364, 508, "#1E293B", "#334155", 1, 10)
    cmds += txt_center(1123, 487, W, H, "ПК оператора (USB COM3 · 115200 бод)", 16, "#34D399", FONT_BOLD)
    cmds += txt_tl(904, 526, "• Живой трекер стаканов #1..#8 и расчёт P₁ (%)", 14, "#E2E8F0", FONT_REG)
    cmds += txt_tl(904, 560, "• Управление: ПУСК / СТОП / E-STOP / RATE±", 14, "#E2E8F0", FONT_REG)
    cmds += txt_tl(904, 594, "• Тест заклинивания → 2× реверс −15° → SAFE STOP", 14, "#FBBF24", FONT_BOLD)
    cmds += txt_tl(904, 628, "• Отбраковка примесей: KY-008 + серво SG90", 14, "#F472B6", FONT_BOLD)
    cmds += txt_tl(904, 662, "• Защита С6: EN = HIGH, AUTOSTART = DISABLED", 14, "#38BDF8", FONT_BOLD)
    cmds += txt_tl(904, 696, "• Лог в CSV (UTF-8 BOM, разделитель «;»)", 13.5, "#94A3B8", FONT_REG)

    run_mvg("seeder_stand_cycle.png", W, H, cmds)


if __name__ == "__main__":
    render_economics_chart()
    render_disc_geometry()
    render_seeder_cycle()
    print("Generated diagrams in:", OUT_DIR)
