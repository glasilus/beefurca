# -*- coding: utf-8 -*-
"""
Генерация SADT/IDEF0-диаграмм для ПЗ Beefurca средствами Pillow.
Выход: diagrams/sadt_context.png (A-0) и diagrams/sadt_decomposition.png (A0).
Это редактируемый исходник диаграмм (правится код — перерисовывается картинка).
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..")
FONT_DIR = r"C:\Windows\Fonts"
SCALE = 2  # рисуем в 2x и ужимаем для сглаживания

def font(sz, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(os.path.join(FONT_DIR, name), sz * SCALE)

INK = (20, 20, 28)
BOX_FILL = (236, 240, 248)
BOX_LINE = (40, 55, 90)
ARROW = (45, 55, 75)
LABEL = (35, 40, 55)

def new_canvas(w, h, bg=(255, 255, 255)):
    return Image.new("RGB", (w * SCALE, h * SCALE), bg)

def S(v):
    return v * SCALE

def measure(draw, text, fnt):
    b = draw.textbbox((0, 0), text, font=fnt)
    return b[2] - b[0], b[3] - b[1]

def wrap(draw, text, fnt, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if measure(draw, t, fnt)[0] <= max_w * SCALE or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines

def draw_multiline_center(draw, cx, cy, text, fnt, fill=INK, max_w=None, lh=1.25):
    if max_w:
        lines = []
        for part in text.split("\n"):
            lines += wrap(draw, part, fnt, max_w)
    else:
        lines = text.split("\n")
    hs = [measure(draw, ln, fnt)[1] for ln in lines]
    line_h = max(hs) * lh
    total = line_h * len(lines)
    y = cy - total / 2
    for ln in lines:
        wln = measure(draw, ln, fnt)[0]
        draw.text((cx - wln / 2, y), ln, font=fnt, fill=fill)
        y += line_h

def arrowhead(draw, x, y, direction, size=9, fill=ARROW):
    s = S(size)
    if direction == "right":
        draw.polygon([(x, y), (x - s, y - s * 0.6), (x - s, y + s * 0.6)], fill=fill)
    elif direction == "left":
        draw.polygon([(x, y), (x + s, y - s * 0.6), (x + s, y + s * 0.6)], fill=fill)
    elif direction == "down":
        draw.polygon([(x, y), (x - s * 0.6, y - s), (x + s * 0.6, y - s)], fill=fill)
    elif direction == "up":
        draw.polygon([(x, y), (x - s * 0.6, y + s), (x + s * 0.6, y + s)], fill=fill)

def line(draw, pts, width=2):
    draw.line([(p[0], p[1]) for p in pts], fill=ARROW, width=S(width), joint="curve")

def box(draw, x, y, w, h, title, sub=None):
    draw.rectangle([x, y, x + w, y + h], fill=BOX_FILL, outline=BOX_LINE, width=S(2))
    f_title = font(15, bold=True)
    if sub:
        draw_multiline_center(draw, x + w / 2, y + h * 0.36, title, f_title, INK, max_w=(w/SCALE) - 24)
        draw_multiline_center(draw, x + w / 2, y + h * 0.7, sub, font(11), (70, 80, 100), max_w=(w/SCALE) - 24)
    else:
        draw_multiline_center(draw, x + w / 2, y + h / 2, title, f_title, INK, max_w=(w/SCALE) - 24)

def save(img, name):
    final = img.resize((img.width // SCALE, img.height // SCALE), Image.LANCZOS)
    p = os.path.join(OUT, name)
    final.save(p, "PNG")
    print("saved", p, final.size)


# ============================ A-0 КОНТЕКСТНАЯ ============================
def draw_context():
    W, H = 1500, 1000
    img = new_canvas(W, H)
    d = ImageDraw.Draw(img)
    flbl = font(12)
    fsmall = font(11)

    bw, bh = 560, 230
    bx = (W - bw) // 2
    by = (H - bh) // 2 + 20
    BX, BY, BW, BH = S(bx), S(by), S(bw), S(bh)
    box(d, BX, BY, BW, BH, "Организовать и учесть\nпроведение соревнования", sub="A0")

    # --- Управление (сверху, вниз) ---
    controls = [
        "Правила дисциплины",
        "Регламент турнира\n(режим, тип сетки)",
        "Роли и права\nдоступа (JWT)",
    ]
    n = len(controls)
    for i, c in enumerate(controls):
        x = bx + bw * (i + 1) / (n + 1)
        line(d, [(S(x), S(by - 170)), (S(x), BY)])
        arrowhead(d, S(x), BY, "down")
        draw_multiline_center(d, S(x), S(by - 195), c, fsmall, LABEL, max_w=150)
    draw_multiline_center(d, S(bx + bw + 95), S(by - 150), "Управление", font(12, bold=True), (110, 90, 40), max_w=120)

    # --- Вход (слева, вправо) ---
    inputs = [
        "Данные регистрации\nпользователей",
        "Заявки на участие;\nимена участников (песочница)",
        "Счёт матчей\n(вводит судья)",
    ]
    n = len(inputs)
    for i, c in enumerate(inputs):
        y = by + bh * (i + 1) / (n + 1)
        line(d, [(S(bx - 300), S(y)), (BX, S(y))])
        arrowhead(d, BX, S(y), "right")
        draw_multiline_center(d, S(bx - 195), S(y - 22), c, fsmall, LABEL, max_w=210)
    draw_multiline_center(d, S(bx - 250), S(by - 40), "Вход", font(12, bold=True), (40, 90, 60), max_w=160)

    # --- Выход (справа, вправо) ---
    outputs = [
        "Турнирная сетка\nс результатами",
        "Рейтинг ELO;\nстатистика игроков и команд",
        "Excel-отчёты",
    ]
    n = len(outputs)
    for i, c in enumerate(outputs):
        y = by + bh * (i + 1) / (n + 1)
        line(d, [(BX + BW, S(y)), (S(bx + bw + 300), S(y))])
        arrowhead(d, S(bx + bw + 300), S(y), "right")
        draw_multiline_center(d, S(bx + bw + 195), S(y - 22), c, fsmall, LABEL, max_w=210)
    draw_multiline_center(d, S(bx + bw + 250), S(by - 40), "Выход", font(12, bold=True), (40, 60, 100), max_w=160)

    # --- Механизм (снизу, вверх) ---
    mechs = [
        "Пользователи (Игрок,\nОрганизатор, Судья,\nАдминистратор)",
        "Веб-приложение\n(клиент Next.js +\nAPI Elysia)",
        "СУБД PostgreSQL,\nRedis",
        "Модули bracket-engine,\nelo-calculator,\nexcel-generator",
    ]
    n = len(mechs)
    # точки входа стрелок прижаты к нижней грани блока, подписи разнесены шире блока
    label_x = [bx - 110, bx + bw * 0.34, bx + bw * 0.66, bx + bw + 110]
    for i, c in enumerate(mechs):
        x = bx + bw * (i + 1) / (n + 1)
        line(d, [(S(x), S(by + bh + 60)), (S(x), BY + BH)])
        arrowhead(d, S(x), BY + BH, "up")
        # вертикальный «отвод» от стрелки к разнесённой подписи
        lx = label_x[i]
        line(d, [(S(x), S(by + bh + 60)), (S(lx), S(by + bh + 60)), (S(lx), S(by + bh + 80))])
        draw_multiline_center(d, S(lx), S(by + bh + 120), c, fsmall, LABEL, max_w=200)
    draw_multiline_center(d, S(bx + bw / 2), S(by + bh + 210), "Механизм", font(12, bold=True), (90, 50, 90), max_w=130)

    save(img, "sadt_context.png")


# ============================ A0 ДЕКОМПОЗИЦИЯ ============================
def draw_decomposition():
    W, H = 1700, 1180
    img = new_canvas(W, H)
    d = ImageDraw.Draw(img)
    fsmall = font(10)

    bw, bh = 360, 150
    # Лестничное размещение (IDEF0)
    boxes = {
        "A1": (90, 150),
        "A2": (470, 360),
        "A3": (850, 570),
        "A4": (1230, 800),
    }
    titles = {
        "A1": ("Управление учётными\nзаписями и дисциплинами", "A1"),
        "A2": ("Создание турнира\nи формирование сетки", "A2"),
        "A3": ("Проведение матчей,\nсудейство и пересчёт ELO", "A3"),
        "A4": ("Формирование статистики\nи отчётности", "A4"),
    }
    for k, (x, y) in boxes.items():
        box(d, S(x), S(y), S(bw), S(bh), titles[k][0], sub=titles[k][1])

    def right(k): x, y = boxes[k]; return (x + bw, y + bh / 2)
    def left(k): x, y = boxes[k]; return (x, y + bh / 2)
    def top(k, fr=0.5): x, y = boxes[k]; return (x + bw * fr, y)
    def bottom(k, fr=0.5): x, y = boxes[k]; return (x + bw * fr, y + bh)

    def conn(p1, p2, label, label_dy=-26, midx=None):
        x1, y1 = p1; x2, y2 = p2
        mx = midx if midx is not None else (x1 + x2) / 2
        pts = [(S(x1), S(y1)), (S(mx), S(y1)), (S(mx), S(y2)), (S(x2), S(y2))]
        line(d, pts)
        arrowhead(d, S(x2), S(y2), "right")
        draw_multiline_center(d, S((x1 + x2) / 2 + 6), S(min(y1, y2) + label_dy), label, fsmall, LABEL, max_w=170)

    # A1 -> A2 (аккаунты + дисциплины) — управление сверху для A2
    p = top("A2", 0.3)
    line(d, [(S(right("A1")[0]), S(right("A1")[1])), (S(p[0]), S(right("A1")[1])), (S(p[0]), S(p[1]))])
    arrowhead(d, S(p[0]), S(p[1]), "down")
    draw_multiline_center(d, S(right("A1")[0] + 95), S(right("A1")[1] - 24), "Учётные записи,\nсправочник дисциплин", fsmall, LABEL, max_w=180)

    # A2 -> A3 (структура сетки)
    conn(right("A2"), left("A3"), "Структура\nтурнирной сетки")
    # A3 -> A4 (результаты + история рейтинга)
    conn(right("A3"), left("A4"), "Результаты матчей,\nистория рейтинга")

    # Обратная связь A3 -> A1 (новый ELO в учётную запись) — длинная петля сверху
    pa3 = top("A3", 0.5)
    pa1 = top("A1", 0.7)
    loop_y = 95
    line(d, [(S(pa3[0]), S(pa3[1])), (S(pa3[0]), S(loop_y)), (S(pa1[0]), S(loop_y)), (S(pa1[0]), S(pa1[1]))])
    arrowhead(d, S(pa1[0]), S(pa1[1]), "down")
    draw_multiline_center(d, S((pa1[0] + pa3[0]) / 2), S(loop_y - 22), "Обратная связь: новый рейтинг ELO записывается в учётную запись (users.elo)", fsmall, (150, 60, 60), max_w=520)

    # Внешние ICOM (кратко)
    # Вход в A1 слева
    la1 = left("A1")
    line(d, [(S(la1[0] - 70), S(la1[1])), (S(la1[0]), S(la1[1]))]); arrowhead(d, S(la1[0]), S(la1[1]), "right")
    draw_multiline_center(d, S(la1[0] - 55), S(la1[1] - 40), "Данные\nрегистрации", fsmall, (40,90,60), max_w=90)
    # Вход в A2 (заявки) снизу-слева
    la2 = left("A2")
    line(d, [(S(la2[0] - 70), S(la2[1])), (S(la2[0]), S(la2[1]))]); arrowhead(d, S(la2[0]), S(la2[1]), "right")
    draw_multiline_center(d, S(la2[0] - 55), S(la2[1] - 40), "Заявки,\nимена", fsmall, (40,90,60), max_w=90)
    # Вход в A3 (счёт) снизу
    ba3 = bottom("A3", 0.25)
    line(d, [(S(ba3[0]), S(ba3[1] + 70)), (S(ba3[0]), S(ba3[1]))]); arrowhead(d, S(ba3[0]), S(ba3[1]), "up")
    draw_multiline_center(d, S(ba3[0]), S(ba3[1] + 86), "Счёт матча\n(судья)", fsmall, (40,90,60), max_w=110)
    # Выход A4 (отчёты)
    ra4 = right("A4")
    line(d, [(S(ra4[0]), S(ra4[1])), (S(ra4[0] + 70), S(ra4[1]))]); arrowhead(d, S(ra4[0] + 70), S(ra4[1]), "right")
    draw_multiline_center(d, S(ra4[0] + 55), S(ra4[1] - 40), "Рейтинг,\nExcel-отчёты", fsmall, (40,60,100), max_w=110)

    save(img, "sadt_decomposition.png")


if __name__ == "__main__":
    draw_context()
    draw_decomposition()
