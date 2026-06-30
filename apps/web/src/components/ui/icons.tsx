"use client";

import React from "react";

/**
 * Пиксельные глифы вместо phosphor-иконок (тонкие вектора ломали PC-98-вайб).
 * Экспортируются под теми же именами, что и phosphor - поэтому импорты на
 * страницах меняют только путь модуля. Все глифы рисуются на сетке 7×7
 * прямоугольниками (crispEdges), цвет наследуется через currentColor.
 */

type Rect = [number, number, number, number]; // x, y, w, h

interface IconProps {
  size?: number;
  weight?: string; // наследие phosphor API, игнорируется
  className?: string;
  style?: React.CSSProperties;
}

function make(rects: Rect[]) {
  const Glyph: React.FC<IconProps> = ({ size = 16, className, style }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 7 7"
      shapeRendering="crispEdges"
      className={className}
      style={style}
      fill="currentColor"
      aria-hidden
    >
      {rects.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} />
      ))}
    </svg>
  );
  return Glyph;
}

// базовые глифы
const G_CHECK = make([[1, 4, 1, 1], [2, 5, 1, 1], [3, 4, 1, 1], [4, 3, 1, 1], [5, 2, 1, 1], [6, 1, 1, 1]]);
const G_PLUS = make([[3, 1, 1, 5], [1, 3, 5, 1]]);
const G_X = make([[1, 1, 1, 1], [2, 2, 1, 1], [3, 3, 1, 1], [4, 4, 1, 1], [5, 5, 1, 1], [5, 1, 1, 1], [4, 2, 1, 1], [2, 4, 1, 1], [1, 5, 1, 1]]);
const G_ARROW_LEFT = make([[3, 3, 1, 1], [4, 2, 1, 3], [5, 1, 1, 5]]);
const G_PLAY = make([[2, 1, 1, 5], [3, 2, 1, 3], [4, 3, 1, 1]]);
const G_USER = make([[2, 1, 3, 2], [1, 4, 5, 2]]);
const G_USERS = make([[1, 1, 2, 1], [4, 1, 2, 1], [0, 3, 3, 2], [4, 3, 3, 2]]);
const G_TROPHY = make([[1, 1, 5, 1], [2, 2, 3, 1], [3, 3, 1, 1], [2, 4, 3, 1], [1, 5, 5, 1]]);
const G_STAR = make([[3, 0, 1, 6], [1, 2, 5, 1], [2, 3, 3, 1], [1, 5, 1, 1], [5, 5, 1, 1]]);
const G_DOWN = make([[3, 0, 1, 4], [1, 2, 1, 1], [5, 2, 1, 1], [2, 3, 1, 1], [4, 3, 1, 1], [0, 5, 7, 1]]);
const G_UP = make([[3, 2, 1, 4], [1, 3, 1, 1], [5, 3, 1, 1], [2, 2, 1, 1], [4, 2, 1, 1], [3, 1, 1, 1], [0, 0, 7, 1]]);
const G_PENCIL = make([[5, 0, 1, 1], [4, 1, 1, 1], [3, 2, 1, 1], [2, 3, 1, 1], [1, 4, 1, 1], [0, 5, 1, 1], [0, 6, 2, 1]]);
const G_TRASH = make([[1, 0, 5, 1], [0, 1, 7, 1], [1, 2, 5, 4], [2, 2, 1, 4], [4, 2, 1, 4]]);
const G_LOCK = make([[2, 0, 3, 1], [2, 1, 1, 2], [4, 1, 1, 2], [1, 3, 5, 4]]);
const G_BOX = make([[0, 0, 7, 1], [0, 6, 7, 1], [0, 0, 1, 7], [6, 0, 1, 7]]);
const G_CAL = make([[0, 0, 7, 1], [0, 1, 1, 6], [6, 1, 1, 6], [0, 6, 7, 1], [0, 2, 7, 1]]);
const G_DOTS = make([[1, 1, 1, 1], [3, 1, 1, 1], [5, 1, 1, 1], [1, 3, 1, 1], [3, 3, 1, 1], [5, 3, 1, 1], [1, 5, 1, 1], [3, 5, 1, 1], [5, 5, 1, 1]]);
const G_INFO = make([[3, 0, 1, 1], [3, 2, 1, 4]]);
const G_LINK = make([[1, 2, 2, 1], [4, 2, 2, 1], [1, 2, 1, 3], [5, 2, 1, 3], [1, 4, 2, 1], [4, 4, 2, 1]]);
const G_REFRESH = make([[1, 1, 4, 1], [1, 1, 1, 3], [1, 4, 2, 1], [4, 0, 1, 2], [3, 1, 1, 1]]);
const G_TV = make([[0, 1, 7, 1], [0, 1, 1, 5], [6, 1, 1, 5], [0, 5, 7, 1], [2, 0, 1, 1], [4, 0, 1, 1]]);
const G_ARROW_RIGHT = make([[3, 3, 1, 1], [2, 2, 1, 3], [1, 1, 1, 5]]);
const G_LIST = make([[0, 1, 7, 1], [0, 3, 7, 1], [0, 5, 7, 1]]);
const G_SEARCH = make([[1, 1, 3, 1], [1, 1, 1, 3], [4, 1, 1, 3], [1, 4, 3, 1], [5, 5, 1, 1], [6, 6, 1, 1]]);
const G_PULSE = make([[0, 3, 2, 1], [2, 2, 1, 1], [3, 4, 1, 1], [4, 1, 1, 1], [5, 3, 2, 1]]);
const G_FLAME = make([[3, 0, 1, 2], [2, 2, 1, 2], [4, 2, 1, 2], [2, 4, 3, 2], [3, 2, 1, 4]]);
const G_GLOBE = make([[0, 0, 7, 1], [0, 6, 7, 1], [0, 0, 1, 7], [6, 0, 1, 7], [0, 3, 7, 1], [3, 0, 1, 7]]);
const G_CLOCK = make([[1, 0, 5, 1], [0, 1, 1, 5], [6, 1, 1, 5], [1, 6, 5, 1], [3, 2, 1, 2], [4, 3, 1, 1]]);
const G_STACK = make([[1, 1, 5, 1], [0, 3, 7, 1], [1, 5, 5, 1]]);
const G_DOT = make([[2, 2, 3, 3]]);
const G_SWORD = make([[5, 0, 1, 1], [4, 1, 1, 1], [3, 2, 1, 1], [2, 3, 1, 1], [1, 4, 1, 1], [0, 5, 2, 2], [2, 4, 1, 1]]);

// экспорт под именами phosphor
export const Check = G_CHECK;
export const CheckCircle = G_CHECK;
export const SealCheck = G_CHECK;
export const UserCheck = G_CHECK;
export const Shield = G_CHECK;
export const Plus = G_PLUS;
export const X = G_X;
export const XCircle = G_X;
export const WarningCircle = G_INFO;
export const Info = G_INFO;
export const ArrowLeft = G_ARROW_LEFT;
export const Play = G_PLAY;
export const User = G_USER;
export const UserCircle = G_USER;
export const UserPlus = G_USER;
export const Users = G_USERS;
export const Trophy = G_TROPHY;
export const Star = G_STAR;
export const Download = G_DOWN;
export const FileXls = G_DOWN;
export const UploadSimple = G_UP;
export const PencilSimple = G_PENCIL;
export const Trash = G_TRASH;
export const Lock = G_LOCK;
export const Calendar = G_CAL;
export const DotsSix = G_DOTS;
export const LinkSimple = G_LINK;
export const ArrowSquareOut = G_LINK;
export const ArrowsClockwise = G_REFRESH;
export const TrendUp = G_UP;
export const Television = G_TV;
export const DiscordLogo = G_BOX;
export const ArrowRight = G_ARROW_RIGHT;
export const SignOut = G_ARROW_RIGHT;
export const List = G_LIST;
export const MagnifyingGlass = G_SEARCH;
export const Medal = G_TROPHY;
export const Pulse = G_PULSE;
export const Radio = G_DOT;
export const Flame = G_FLAME;
export const Globe = G_GLOBE;
export const Clock = G_CLOCK;
export const Stack = G_STACK;
export const Sword = G_SWORD;
