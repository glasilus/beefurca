# Beefurca Web UI — переработка «Aqua × Fractal» · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Полностью переработать визуальный язык `apps/web` в стиле «Aqua × Fractal» (старый Mac OS X Aqua + фрактальная графика), на грамотной дизайн-системе.

**Architecture:** Слой семантических токенов (CSS-переменные + Tailwind) → набор UI-примитивов в `components/ui/` → оптимизированный генеративный фрактал-слой (чистый модуль + Web Worker + кэш + ленивый рендер) → прогон всех страниц на примитивы. Тёмная и светлая темы — обе first-class, фон Aqua Aurora на чистом CSS.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind 3.4, next-themes, `next/font/google` (self-host шрифтов), Web Worker + OffscreenCanvas, `@phosphor-icons/react`, `@xyflow/react`.

**Источники:** spec `docs/superpowers/specs/2026-06-19-web-ui-redesign-aqua-fractal-design.md`; утверждённая витрина `docs/design-preview.html` (эталон палитры, типографики, фрактального генератора, gel-кнопок, окон, сетки).

## Global Constraints

- НЕ трогать `apps/mobile`. Менять только `apps/web` (+ при необходимости общие пакеты, но логику бэка/схему БД не трогать).
- **Эмодзи запрещены** нигде в UI/коде (заменять на phosphor-иконки/SVG/текст). Убрать существующие `🔒`, `★`.
- **Запрещённые шрифты:** Inter, JetBrains Mono и прочие «AI-дефолты». Использовать: Unbounded (дисплей), Fira Sans + Fira Sans Condensed (текст/узкий), IBM Plex Mono (данные).
- Bun не установлен — только Node + pnpm. Python не использовать.
- Верификация каждой задачи: `pnpm --filter web exec tsc --noEmit` (типы) и/или `pnpm --filter web build` (сборка) — должны быть зелёными; для визуальных задач — скриншот через dev-сервер (Playwright MCP) и глазами.
- Палитра (light → dark), точные значения:
  `--surface` `#EDF1F6`→`#0A1320`; `--panel` `#FBFCFE`→`#161D26`; `--panel-sunken` `#E7ECF2`→`#0E141B`; `--chrome-top/bot` `#EEF3FA`/`#CFD9E6`→`#28333F`/`#161D26`; `--border` `#B7C4D6`→`#2E3A47`; `--hairline` `#D7DEE6`→`#1B232C`; `--text` `#16202B`→`#EAF1F8`; `--text-muted` `#54657A`→`#8FA0B2`.
  Акцент: `--accent-hi`#8FC0FF `--accent`#2E86F0 `--accent-lo`#0A5BD0. Статусы: live `#F5A623`, done `#18B5C7`, win `#28C840`, danger `#FF5F57`.
- Радиусы: контролы 6px, карточки 10px, окна 12px (верхние углы), главная кнопка — pill. Скевоморфные тени (верхний внутренний блик + нижняя тень); поля — inset.
- `prefers-reduced-motion` уважать везде (aurora, пульс, спин пломбы, анимации появления — выключать).
- Хедер/панели читаемые: хедер плотный (не «прозрачный в ноль»), панели полупрозрачные с blur, но контент контрастный (≥ WCAG AA 4.5:1).
- Фрактал-генератор — как в витрине: Julia из хэша, `cre=-0.8+(h&0xffff)/0xffff*1.2-0.6`, `cim=-0.2+((h>>16)&0xffff)/0xffff*0.8-0.4`, `maxIter=60`, окрашивание `hue=(hueBase+t*330)%360, hsl(hue,0.95,min(lift+t*0.58,0.82))`, ядро тёмное `rgb(8,10,18)`; поддержать override `cre/cim/hue/span/lift`. Лого: `cre=0.285, cim=0.01, hue=0, span=360, lift=0.4`. Без дизеринга.

---

## Файловая структура

**Создать:**
- `apps/web/src/lib/fractal.ts` — чистый детерминированный генератор (хэш, параметры, рендер в `Uint8ClampedArray`/`ImageData`). Без DOM.
- `apps/web/src/lib/fractal.test.mjs` — юнит-тесты генератора (node:test).
- `apps/web/src/lib/fractalClient.ts` — клиентский менеджер: Web Worker пул, in-memory + sessionStorage кэш, `useFractal()` хук с IntersectionObserver.
- `apps/web/src/workers/fractal.worker.ts` — воркер поверх `fractal.ts` (OffscreenCanvas → dataURL/bitmap).
- `apps/web/src/components/Fractal.tsx` — `<Fractal>` (img из фрактала) и `<FractalMedallion>` (gel-линза).
- `apps/web/src/components/Aurora.tsx` — фон Aqua Aurora.
- `apps/web/src/components/ui/Button.tsx`, `Window.tsx`, `Field.tsx`, `Badge.tsx`, `Modal.tsx`, `Table.tsx`, `Tabs.tsx`, `PageHeader.tsx`, `EmptyState.tsx`, `index.ts` (barrel).

**Изменить:**
- `apps/web/tailwind.config.ts`, `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`.
- `apps/web/src/components/Nav.tsx`, `ThemeToggle.tsx`, `Toast.tsx`, `ConfirmDialog.tsx`, `FractalAvatar.tsx`, `FractalSeal.tsx`, `BracketCanvas.tsx`, `EloChart.tsx`.
- Все страницы: `app/page.tsx`, `login/page.tsx`, `dashboard/page.tsx`, `tournaments/page.tsx`, `tournaments/[id]/page.tsx`, `tournaments/[id]/scoreboard/page.tsx`, `tournaments/create/page.tsx`, `admin/page.tsx`, `disciplines/page.tsx`.

---

## ФАЗА 0 — Фундамент темы

### Task 1: Семантические токены + типографика

**Files:**
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx`

**Interfaces:**
- Produces: Tailwind-цвета `surface, panel, panel-sunken, chrome-top, chrome-bot, border, hairline, text, text-muted, accent, accent-hi, accent-lo, live, done, win, danger`; `fontFamily.display/sans/cond/mono`; utility-классы `.frost, .brushed, .pinstripe, .gel, .window-shell, .titlebar`.

- [ ] **Step 1: Шрифты через next/font/google в layout.tsx.** В начале `layout.tsx`:
```tsx
import { Unbounded, Fira_Sans, Fira_Sans_Condensed, IBM_Plex_Mono } from "next/font/google";
const display = Unbounded({ subsets: ["latin","cyrillic"], weight: ["700","800","900"], variable: "--font-display", display: "swap" });
const sans = Fira_Sans({ subsets: ["latin","cyrillic"], weight: ["300","400","500","700"], variable: "--font-sans", display: "swap" });
const cond = Fira_Sans_Condensed({ subsets: ["latin","cyrillic"], weight: ["500","600"], variable: "--font-cond", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin","cyrillic"], weight: ["400","500","600"], variable: "--font-mono", display: "swap" });
```
Навесить `className={`${display.variable} ${sans.variable} ${cond.variable} ${mono.variable}`}` на `<html>`.

- [ ] **Step 2: tailwind.config.ts — заменить colors и fontFamily.** Заменить блок `colors` на семантические токены через `var(--…)` (значения из Global Constraints), убрать `activeGrad/completeGrad/obsidian/clinical`. `fontFamily`: `display:["var(--font-display)"], sans:["var(--font-sans)"], cond:["var(--font-cond)"], mono:["var(--font-mono)"]`. Добавить `borderRadius: { ctl:"6px", card:"10px", win:"12px" }`.

- [ ] **Step 3: globals.css — переписать токены и утилиты.** Удалить `@font-face` (Beast/Grafmassa/Unifix), мост `html:not(.dark) .text-slate-*`, `.bg-slate-800/900`, `.component-card-*`, `.dither-overlay`. Прописать `:root` (light) и `.dark` (dark) переменные из Global Constraints. `body{ font-family: var(--font-sans); }`. Добавить утилиты: `.brushed` (brushed-metal градиент из витрины), `.pinstripe`, `.frost` (`background: rgb(var(--panel-rgb)/var(--panel-alpha)); backdrop-filter: blur(22px) saturate(1.3)`), gel-кнопка, window-shell/titlebar, keyframes `aurora-drift`/`aurora-drift2`/`toast-in` (скопировать значения из `docs/design-preview.html`). Добавить `--panel-rgb` и `--panel-alpha` в обе темы (light `251 252 254`/`0.80`, dark `22 29 38`/`0.62`).

- [ ] **Step 4: tsc + build.** Run: `pnpm --filter web exec tsc --noEmit` → нет ошибок. Run: `pnpm --filter web build` → 11/11. (На этом шаге часть старых классов `activeGrad/*`, `font-pixel`, `text-slate-*` ещё используются в разметке — они станут «неизвестными» Tailwind-классами и просто не применятся; это нормально, страницы чинятся в Фазе 3. Если build падает из-за отсутствующих токенов в `tailwind.config`, оставить временные алиасы и удалить их в Task 22.)

- [ ] **Step 5: Визуальная проверка.** `pnpm --filter web dev`, открыть `/login`, скриншот: фон/панель/текст берут новые токены, шрифт — Fira Sans. Переключить тему — токены меняются.

- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat(web): семантические токены темы и типографика Aqua×Fractal"` (если репозиторий не инициализирован — пропустить коммиты во всём плане).

### Task 2: Фон Aqua Aurora

**Files:**
- Create: `apps/web/src/components/Aurora.tsx`
- Modify: `apps/web/src/app/globals.css` (классы `.aurora`)
- Modify: `apps/web/src/app/layout.tsx`

**Interfaces:**
- Produces: `<Aurora />` — `position:fixed; inset:-20%; z-index:-2; pointer-events:none`.

- [ ] **Step 1: globals.css — классы `.aurora`.** Скопировать из `docs/design-preview.html` блок `.aurora`, `.aurora::before/::after`, `html.dark .aurora::before/::after`, keyframes `drift/drift2` (переименовать в `aurora-drift`/`aurora-drift2`) и `@media (prefers-reduced-motion: reduce){ .aurora::before,.aurora::after{animation:none} }`.

- [ ] **Step 2: Aurora.tsx.**
```tsx
export function Aurora() { return <div className="aurora" aria-hidden />; }
```

- [ ] **Step 3: layout.tsx — подключить.** Удалить `<div className="dither-overlay">`. Внутри `<body>` первым элементом — `<Aurora />`. `body` оставить `relative min-h-screen`.

- [ ] **Step 4: build + скрин.** `pnpm --filter web build` зелёный; на `/login` виден переливающийся aurora-фон в обеих темах.

- [ ] **Step 5: Commit.** `feat(web): фон Aqua Aurora`.

---

## ФАЗА 1 — Генеративный фрактал-слой (оптимизированный)

### Task 3: Чистый фрактал-генератор + тесты (TDD)

**Files:**
- Create: `apps/web/src/lib/fractal.ts`
- Create: `apps/web/src/lib/fractal.test.mjs`

**Interfaces:**
- Produces:
  `hashSeed(seed: string): number`
  `juliaParams(h: number): { cre:number; cim:number; hueBase:number }`
  `renderFractal(size:number, opts:{ seed?:string; cre?:number; cim?:number; hue?:number; span?:number; lift?:number }): Uint8ClampedArray` (RGBA, длина `size*size*4`).
  `hsl2rgb(h:number,s:number,l:number): [number,number,number]`.

- [ ] **Step 1: Написать падающий тест `fractal.test.mjs`.**
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { hashSeed, juliaParams, renderFractal, hsl2rgb } from "./fractal.ts";

test("hashSeed детерминирован", () => {
  assert.equal(hashSeed("beefurca"), hashSeed("beefurca"));
  assert.notEqual(hashSeed("a"), hashSeed("b"));
});
test("juliaParams в ожидаемых диапазонах", () => {
  const p = juliaParams(hashSeed("chess-pro"));
  assert.ok(p.cre >= -1.4 && p.cre <= -0.2);
  assert.ok(p.cim >= -0.6 && p.cim <= 0.2);
});
test("renderFractal возвращает RGBA нужной длины и не сплошной чёрный", () => {
  const px = renderFractal(32, { seed: "chess-pro" });
  assert.equal(px.length, 32*32*4);
  let bright = 0;
  for (let i=0;i<px.length;i+=4) if (px[i]+px[i+1]+px[i+2] > 120) bright++;
  assert.ok(bright > 50, "должны быть яркие цветные пиксели");
});
test("hsl2rgb базовые цвета", () => {
  assert.deepEqual(hsl2rgb(0,1,0.5), [255,0,0]);
});
```

- [ ] **Step 2: Запуск — падает.** Run: `cd apps/web && node --experimental-strip-types --test src/lib/fractal.test.mjs` (Node ≥ 22.6 умеет `--experimental-strip-types`; если версия старее — временно переименовать импорт на скомпилированный путь, или заменить расширение генератора на `.mjs` без типов для теста). Expected: FAIL «module not found».

- [ ] **Step 3: Реализовать `fractal.ts`.**
```ts
export function hashSeed(seed: string): number {
  let h = 2166136261; const s = seed || "beefurca";
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function hsl2rgb(h: number, s: number, l: number): [number,number,number] {
  h = ((h % 360) + 360) % 360 / 360; const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h * 12) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [f(0), f(8), f(4)];
}
export function juliaParams(h: number) {
  return {
    cre: -0.8 + (h & 0xffff) / 0xffff * 1.2 - 0.6,
    cim: -0.2 + ((h >> 16) & 0xffff) / 0xffff * 0.8 - 0.4,
    hueBase: h % 360,
  };
}
export function renderFractal(size: number, opts: { seed?: string; cre?: number; cim?: number; hue?: number; span?: number; lift?: number } = {}): Uint8ClampedArray {
  const h = hashSeed(opts.seed ?? "beefurca");
  const base = juliaParams(h);
  const cre = opts.cre ?? base.cre, cim = opts.cim ?? base.cim;
  const hueBase = opts.hue ?? base.hueBase, span = opts.span ?? 330, lift = opts.lift ?? 0.2;
  const W = size, H = size, out = new Uint8ClampedArray(W * H * 4);
  const maxIter = 60, zoom = 1.35;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let zx = (x - W/2)/(0.5*zoom*W)*1.6, zy = (y - H/2)/(0.5*zoom*H)*1.6, i = 0;
    while (zx*zx + zy*zy < 4 && i < maxIter) { const xt = zx*zx - zy*zy + cre; zy = 2*zx*zy + cim; zx = xt; i++; }
    const p = (y*W + x)*4;
    if (i === maxIter) { out[p]=8; out[p+1]=10; out[p+2]=18; out[p+3]=255; }
    else { const t = i/maxIter, hue = (hueBase + t*span) % 360, [r,g,b] = hsl2rgb(hue, 0.95, Math.min(lift + t*0.58, 0.82)); out[p]=r; out[p+1]=g; out[p+2]=b; out[p+3]=255; }
  }
  return out;
}
```

- [ ] **Step 4: Запуск — проходит.** Run: тест из Step 2. Expected: PASS (4 теста).

- [ ] **Step 5: Commit.** `feat(web): чистый фрактал-генератор + тесты`.

### Task 4: Web Worker, кэш, ленивый рендер, компонент `<Fractal>`

**Files:**
- Create: `apps/web/src/workers/fractal.worker.ts`
- Create: `apps/web/src/lib/fractalClient.ts`
- Create: `apps/web/src/components/Fractal.tsx`

**Interfaces:**
- Consumes: `renderFractal` из `fractal.ts`.
- Produces: `useFractal(opts): { ref, dataUrl }`; `<Fractal seed size opts className>` (рендерит `<img>`); `<FractalMedallion seed size shape="circle"|"rounded" className>` (gel-линза вокруг `<Fractal>`).

- [ ] **Step 1: Воркер.**
```ts
import { renderFractal } from "../lib/fractal";
self.onmessage = (e: MessageEvent) => {
  const { id, size, opts } = e.data;
  const px = renderFractal(size, opts);
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(new ImageData(px, size, size), 0, 0);
  canvas.convertToBlob().then(b => {
    const reader = new FileReader();
    reader.onload = () => (self as any).postMessage({ id, dataUrl: reader.result });
    reader.readAsDataURL(b);
  });
};
```

- [ ] **Step 2: Клиент-менеджер `fractalClient.ts`.** Один воркер (lazy `new Worker(new URL("../workers/fractal.worker.ts", import.meta.url))`), `Map<string,string>` кэш в памяти + зеркало в `sessionStorage` по ключу `fractal:${size}:${JSON.stringify(opts)}`; промис-реестр по `id`; если нет `OffscreenCanvas`/Worker — fallback на главный поток через `renderFractal` + обычный `<canvas>`→`toDataURL`. Экспорт `getFractal(size, opts): Promise<string>` и хук:
```ts
export function useFractal(opts: FractalOpts, size: number) {
  const ref = useRef<HTMLElement>(null);
  const [dataUrl, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { io.disconnect(); getFractal(size, opts).then(setUrl); }
    }, { rootMargin: "200px" });
    io.observe(el); return () => io.disconnect();
  }, [size, JSON.stringify(opts)]);
  return { ref, dataUrl };
}
```

- [ ] **Step 3: Компонент `Fractal.tsx`.** `<Fractal>`: пока `dataUrl` нет — показывает плейсхолдер (панель цвета `--panel-sunken`); затем `<img alt="" src={dataUrl}>`. `<FractalMedallion>`: оборачивает в `.medallion`-разметку (gel-блик + rim из витрины, классы перенести в globals.css или inline-стиль). Размер canvas = `Math.min(size, 160)` (крупные — не более 160px растра, масштабируются CSS).

- [ ] **Step 4: tsc + build + скрин.** Вставить временно `<FractalMedallion seed="chess-pro" size={120} />` на `/login`, проверить рендер и что повторный показ берёт из кэша (нет повторных Worker-сообщений в консоли). Убрать временную вставку.

- [ ] **Step 5: Commit.** `feat(web): фрактал-воркер, кэш, ленивый рендер, компонент Fractal`.

### Task 5: Перевод FractalAvatar/FractalSeal/BracketCanvas + лого-фрактал

**Files:**
- Modify: `apps/web/src/components/FractalAvatar.tsx`
- Modify: `apps/web/src/components/FractalSeal.tsx`
- Modify: `apps/web/src/components/BracketCanvas.tsx`

**Interfaces:**
- Consumes: `<FractalMedallion>`, `<Fractal>`.
- Produces: `FractalAvatar` сохраняет props `{seed,size}`, рендерит `<FractalMedallion>`; `FractalSeal` props `{hash,size}` — gel-печать с фрактальной серединой и спином (reduced-motion off); `BracketCanvas` — узлы с медальонами и SVG-кривыми связями (стили из витрины раздела «сетка»).

- [ ] **Step 1: FractalAvatar.tsx → обёртка над FractalMedallion** (убрать старый SVG/`activeGrad`). Сохранить сигнатуру, чтобы существующие вызовы не ломались.

- [ ] **Step 2: FractalSeal.tsx** — заменить `activeGrad/completeGrad` классы на токены `accent/done`; центр — `<Fractal>` круг; кольца/гало через статусные цвета; `animate-spin` → CSS-анимация, обёрнутая в проверку reduced-motion (или класс, выключаемый media-query).

- [ ] **Step 3: BracketCanvas.tsx** — узлы матчей сделать окнами с `<FractalMedallion size={26}>` для участников, счёт — `font-mono`; связи — `<path>` bezier с `stroke=var(--done)`/glow (фильтр из витрины), активный матч — рамка/пульс `var(--live)`. Сохранить логику форматов (single/double/RR/swiss).

- [ ] **Step 4: tsc + build + скрин** страницы с сеткой (`/tournaments/[id]`): медальоны и кривые связи видны, цвета корректны в обеих темах.

- [ ] **Step 5: Commit.** `feat(web): генеративные компоненты на новый фрактал-слой`.

---

## ФАЗА 2 — UI-примитивы (`components/ui/`)

Общая верификация для Task 6–12: `pnpm --filter web exec tsc --noEmit` зелёный + скрин примитива на временной демо-врезке (затем убрать) в обеих темах. Все примитивы — `"use client"` если есть состояние/обработчики.

### Task 6: Button

**Files:** Create `apps/web/src/components/ui/Button.tsx`, `apps/web/src/components/ui/index.ts`.
**Interfaces:** Produces `<Button variant="gel"|"secondary"|"ghost"|"danger" size="sm"|"md" loading? disabled? leftIcon? ...props>`.

- [ ] **Step 1:** Реализовать `Button` со стилями из витрины (классы `.gel` и пр. через токены), `loading` → спиннер (phosphor `CircleNotch` с `animate-spin`), `focus-visible` ring `var(--accent)`. Экспортнуть из `index.ts`.
- [ ] **Step 2:** tsc + скрин 4 вариантов.
- [ ] **Step 3:** Commit `feat(web/ui): Button`.

### Task 7: Window / Card + светофор-статус

**Files:** Create `apps/web/src/components/ui/Window.tsx`.
**Interfaces:** Produces `<Window title? status?="live"|"done"|"draft"|null lights?=true frosted?=true ...>{children}</Window>` и `<Card>{children}</Card>`. Светофор: при `status` подсвечивается соответствующая точка (live=янтарь, done=зелёный, draft=серый), остальные `off`.

- [ ] **Step 1:** Реализовать (titlebar `.brushed`, три `.light`, тело; `frosted`→`.frost`; верхние углы `rounded-win`). `Card` — без титлбара, `.frost` + тень.
- [ ] **Step 2:** tsc + скрин окна с каждым статусом.
- [ ] **Step 3:** Commit `feat(web/ui): Window и Card со светофором`.

### Task 8: Field / Input / Select / Checkbox

**Files:** Create `apps/web/src/components/ui/Field.tsx`.
**Interfaces:** Produces `<Field label? error? children>`, `<Input>`, `<Select>`, `<Checkbox label>`. Inset-стиль, focus-ring accent, ошибка — текст `var(--danger)`.

- [ ] **Step 1:** Реализовать (label — `font-cond uppercase`; input — `bg-panel-sunken` inset shadow).
- [ ] **Step 2:** tsc + скрин формы.
- [ ] **Step 3:** Commit `feat(web/ui): поля форм`.

### Task 9: Badge (статус-пилюля)

**Files:** Create `apps/web/src/components/ui/Badge.tsx`.
**Interfaces:** Produces `<Badge tone="live"|"done"|"win"|"danger"|"draft"|"accent" dot? children>`. live-dot пульсирует (reduced-motion off).

- [ ] **Step 1:** Реализовать (классы из витрины `.badge.*`). Также экспорт хелпера `tournamentStatusTone(status: string)` → tone, чтобы страницы мапили статусы единообразно.
- [ ] **Step 2:** tsc + скрин.
- [ ] **Step 3:** Commit `feat(web/ui): Badge + маппинг статусов`.

### Task 10: Modal (fluted glass) + рестайл Toast/ConfirmDialog

**Files:** Create `apps/web/src/components/ui/Modal.tsx`; Modify `apps/web/src/components/ConfirmDialog.tsx`, `apps/web/src/components/Toast.tsx`.
**Interfaces:** Produces `<Modal open title onClose footer>{children}</Modal>` (fluted-glass из витрины, focus-trap, Esc). `ConfirmDialog` использует `Modal` и `Button`. `Toast` — на токенах + `.frost`, иконки phosphor, без эмодзи, анимация `toast-in`.

- [ ] **Step 1:** `Modal.tsx` (оверлей затемнения + `.glass` контейнер, Esc=onClose, фокус в первый элемент).
- [ ] **Step 2:** Переписать `ConfirmDialog` поверх `Modal`+`Button` (сохранить `useConfirm()` API и tone `danger`).
- [ ] **Step 3:** Рестайл `Toast` (сохранить `useToast()` API), варианты success/error/info/warning → токены + phosphor-иконки.
- [ ] **Step 4:** tsc + build + скрин (вызвать confirm и toast).
- [ ] **Step 5:** Commit `feat(web/ui): Modal, рестайл Toast и ConfirmDialog`.

### Task 11: Table, Tabs, PageHeader, EmptyState

**Files:** Create `apps/web/src/components/ui/Table.tsx`, `Tabs.tsx`, `PageHeader.tsx`, `EmptyState.tsx`.
**Interfaces:** `<Table columns rows>` (заголовки `font-cond`, числа `font-mono`, зебра/hover по hairline); `<Tabs items value onChange>`; `<PageHeader title eyebrow? actions?>` (title — `font-display`/H1); `<EmptyState title hint action? seed?>` (фоновый `<Fractal>` как иллюстрация вместо картинки).

- [ ] **Step 1:** Реализовать все четыре + добавить в `index.ts`.
- [ ] **Step 2:** tsc + скрин каждого.
- [ ] **Step 3:** Commit `feat(web/ui): Table, Tabs, PageHeader, EmptyState`.

### Task 12: Nav + ThemeToggle (лого-фрактал, плотный хедер)

**Files:** Modify `apps/web/src/components/Nav.tsx`, `apps/web/src/components/ThemeToggle.tsx`.
**Interfaces:** Nav сохраняет props `{active, profile}`. Лого — `<FractalMedallion>` с параметрами лого (`cre=0.285,cim=0.01,hue=0,span=360,lift=0.4`) + буква «B» поверх; wordmark `font-display`. Хедер — `.brushed.pinstripe`, **непрозрачный** (без `/40`-прозрачности до нуля), нижняя граница + тень. ThemeToggle — SVG sun/moon (без эмодзи).

- [ ] **Step 1:** Переписать `Nav` (ссылки — токены, активная — `text` / accent-подложка; кнопка «Создать турнир» — `Button` gel sm; «Админ-панель» — `Button` secondary). Убрать `font-pixel`, `activeGrad`, `text-slate-*`, `text-white`.
- [ ] **Step 2:** `ThemeToggle` — иконки sun/moon SVG (из витрины), `Button` ghost/secondary обёртка.
- [ ] **Step 3:** build + скрин хедера в обеих темах: плотный, читаемый, лого-фрактал виден.
- [ ] **Step 4:** Commit `feat(web): Nav и ThemeToggle в стиле Aqua`.

---

## ФАЗА 3 — Прогон страниц

Для каждой страницы общий приём: импортировать примитивы из `components/ui`, заменить ad-hoc разметку (`component-card-*`, `activeGrad`, `font-pixel`, `text-slate-*`, `text-white`, `border-red-955` и пр.) на `Window/Card/Button/Field/Badge/Table/PageHeader`, аватары/картинки → `FractalAvatar`/`FractalMedallion`/`Fractal`, статусы → `Badge` через `tournamentStatusTone`. Убрать эмодзи. Верификация каждой: `tsc --noEmit` + `pnpm --filter web build` зелёный + скрин страницы в **обеих** темах (контраст ок, нет «белого на белом»).

### Task 13: Лендинг `app/page.tsx`
- [ ] **Step 1:** Hero на `font-display` (логотип-фрактал, без `font-pixel`/`bg-clip-text` неонов), CTA — `Button`. Демо-блоки (фичи/рейтинг/сетка/пломба) — `Window`/`Card`/`Table` + `FractalMedallion`/`FractalSeal`. Убрать `dither`, `activeGrad`, mock «★/🔒» при наличии.
- [ ] **Step 2:** build + 2 скрина (light/dark).
- [ ] **Step 3:** Commit `feat(web): лендинг в стиле Aqua×Fractal`.

### Task 14: `login/page.tsx`
- [ ] **Step 1:** Карточка входа → `Window`/`Card` `.frost`; поля → `Field/Input`; кнопки → `Button` (Discord — `secondary` с phosphor `DiscordLogo`); сохранить inline-баннеры ошибок/успеха (перевести на токены `danger/win`). Лого-фрактал в шапке формы.
- [ ] **Step 2:** build + 2 скрина.
- [ ] **Step 3:** Commit `feat(web): экран входа`.

### Task 15: `dashboard/page.tsx`
- [ ] **Step 1:** Профиль/команды/турниры → `Window/Card/Table/Badge/Button`; аватары игрока/команд → `FractalAvatar`; модалки (редактирование профиля, disband/leave) → `Modal`; кнопки копирования инвайта — `Button`. Пустые состояния → `EmptyState` с фоновым фракталом. Убрать эмодзи.
- [ ] **Step 2:** build + 2 скрина.
- [ ] **Step 3:** Commit `feat(web): кабинет`.

### Task 16: `tournaments/page.tsx` (список)
- [ ] **Step 1:** Карточки турниров → `Card`/`Window` + `FractalMedallion` обложка + `Badge` статус (+ бейдж «Приватный» через phosphor `Lock`, без эмодзи). Фильтры (история/завершённые/запланированные) → `Tabs`. Пусто → `EmptyState`.
- [ ] **Step 2:** build + 2 скрина.
- [ ] **Step 3:** Commit `feat(web): каталог турниров`.

### Task 17: `tournaments/[id]/page.tsx`
- [ ] **Step 1:** Заголовок → `PageHeader` (обложка-фрактал, статус-`Badge`, приватность через `Lock`). Панели «Участники/Заявки/Состав/Управление» → `Window`/`Table`/`Button`; сетка — `BracketCanvas` (уже обновлён); судейский модал → `Modal`/`Field`/`Button`; пломба → `FractalSeal`. Все `toast/confirm` уже на хуках — не трогать логику, только визуал. Убрать `🔒`.
- [ ] **Step 2:** build + 2 скрина (вкл. сетку и судейский модал).
- [ ] **Step 3:** Commit `feat(web): страница турнира`.

### Task 18: `tournaments/create/page.tsx`
- [ ] **Step 1:** Форма → `Window`/`Field/Input/Select/Checkbox/Button`; inline-создание дисциплины и чекбокс «Приватный»/«Дата окончания» — на примитивах. Превью обложки — `FractalMedallion` по имени.
- [ ] **Step 2:** build + 2 скрина.
- [ ] **Step 3:** Commit `feat(web): создание турнира`.

### Task 19: `admin/page.tsx`
- [ ] **Step 1:** Таблицы пользователей/дисциплин → `Table`/`Badge`/`Button`; тоггл official/роль → `Button`/`Select`; модалки → `Modal`. Убрать `★ официальная`/эмодзи (заменить phosphor `Star`/`SealCheck` + текст).
- [ ] **Step 2:** build + 2 скрина.
- [ ] **Step 3:** Commit `feat(web): админ-панель`.

### Task 20: `disciplines/page.tsx`
- [ ] **Step 1:** Витрина дисциплин → `Card` + `FractalMedallion` + `Badge` («официальная»/«пользовательская» через `Star`/текст). Пусто → `EmptyState`.
- [ ] **Step 2:** build + 2 скрина.
- [ ] **Step 3:** Commit `feat(web): дисциплины`.

### Task 21: `tournaments/[id]/scoreboard/page.tsx` + `EloChart.tsx`
- [ ] **Step 1:** Scoreboard → `Window`/`Table`/`Badge`, живой счёт — `font-display`/`font-mono`. `EloChart` — перекрасить линии/сетку на токены `accent/done/hairline`, убрать `activeGrad/completeGrad`.
- [ ] **Step 2:** build + 2 скрина.
- [ ] **Step 3:** Commit `feat(web): scoreboard и ELO-график`.

### Task 22: Финальный аудит (эмодзи, контраст, остатки, a11y, сборка)
- [ ] **Step 1: Поиск остатков.** `grep -rnE "activeGrad|completeGrad|font-pixel|text-slate-|component-card|dither|border-red-955|obsidian-" apps/web/src` — пусто (или осознанные исключения). Удалить временные алиасы из `tailwind.config.ts` (Task 1 Step 4).
- [ ] **Step 2: Поиск эмодзи.** `grep -rnP "[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}\x{2190}-\x{21FF}\x{2700}-\x{27BF}]" apps/web/src` — пусто (символы `★`, `🔒` и т.п. убраны).
- [ ] **Step 3: Контраст/тема-аудит.** Скрины ключевых страниц в обеих темах; проверить отсутствие «белого на белом», читаемость заголовков, видимый focus, что хедер плотный.
- [ ] **Step 4: reduced-motion.** В DevTools эмулировать reduce — aurora/пульс/спин/появления остановлены.
- [ ] **Step 5: Финальная сборка.** Run: `pnpm --filter web exec tsc --noEmit` и `pnpm --filter web build` → 11/11 зелёный.
- [ ] **Step 6: Обновить документацию.** Дописать в `WEB_REVIEW_FIXES.md` секцию о переработке UI; коммит `feat(web): аудит и завершение переработки Aqua×Fractal`.

---

## Self-Review (выполнено автором плана)

- **Покрытие spec:** тезис/узнаваемость (Task 1–2,12,13), палитра-токены (1), типографика (1), aurora (2), фрактал-генератор+оптимизация (3–4), подпись/медальоны/пломба/лого (4–5,12), сетка-энергодерево (5,17), окна+светофор (7), fluted-glass (10), формы inset (8), badge-статусы (9), снос костылей `text-slate-*`/`component-card` (1,22), эмодзи-запрет (22 + каждая страница), reduced-motion (2,5,9,22), все 11 страниц (13–21). Пробелов нет.
- **Плейсхолдеры:** код приведён для логики (токены, генератор, воркер, хук, примитивы); страницы Фазы 3 — точный приём замены + перечень целей (репетативная механика, не «как в Task N»).
- **Согласованность типов:** `renderFractal/getFractal/useFractal/FractalMedallion/Fractal` сигнатуры совпадают между Task 3–5 и потребителями; `tournamentStatusTone` (Task 9) используется в Task 16–17,19–20.
