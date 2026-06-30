"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FractalMedallion } from "./Fractal";

interface MatchData {
  id: string;
  round: number;
  position: number;
  participant1Id: string | null;
  participant2Id: string | null;
  score1: number | null;
  score2: number | null;
  winnerId: string | null;
  isTechDefeat: boolean;
  nextMatchId?: string | null;
}

interface ParticipantData {
  id: string;
  nicknameSnapshot: string;
  teamSnapshot: string | null;
}

interface BracketCanvasProps {
  matches: MatchData[];
  participants: ParticipantData[];
  bracketType?: string;
}

const FRAME =
  "w-full h-[600px] border border-border bg-surface rounded-win overflow-hidden relative";

// узел матча для ReactFlow
const MatchNode: React.FC<NodeProps> = ({ data }) => {
  const m = data.match as MatchData;
  const p1 = data.p1 as ParticipantData | null;
  const p2 = data.p2 as ParticipantData | null;

  const isCompleted = !!m.winnerId;
  const isActive = !isCompleted && m.participant1Id && m.participant2Id;

  const p1Winner = isCompleted && m.winnerId === m.participant1Id;
  const p2Winner = isCompleted && m.winnerId === m.participant2Id;

  return (
    <div
      className="w-[220px] text-xs rounded-card overflow-hidden window-shell frost"
      style={
        isActive
          ? {
              borderColor: "color-mix(in srgb, var(--status-live) 55%, var(--border))",
              boxShadow:
                "0 0 0 1px color-mix(in srgb, var(--status-live) 45%, transparent), 0 8px 26px var(--shadow)",
            }
          : undefined
      }
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />

      {/* Round label header */}
      <div className="flex justify-between items-center border-b border-hairline px-2.5 py-1.5">
        <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted">
          Raund {m.round}
        </span>
        {m.isTechDefeat && (
          <span className="text-[8px] bg-danger/20 text-danger border border-danger/40 px-1 rounded uppercase font-bold">
            Tech def.
          </span>
        )}
        {isActive && (
          <span className="flex h-2 w-2 relative">
            <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-live" />
          </span>
        )}
      </div>

      {/* Seat 1 */}
      <div
        className={`flex items-center gap-2.5 py-1.5 px-2.5 ${
          p1Winner ? "font-bold" : ""
        }`}
        style={
          p1Winner
            ? { boxShadow: "inset 3px 0 0 var(--status-done)" }
            : undefined
        }
      >
        <FractalMedallion
          seed={m.participant1Id || "empty-1"}
          size={26}
        />
        <span className="truncate max-w-[120px] text-text">
          {p1 ? p1.teamSnapshot || p1.nicknameSnapshot : "Waiting..."}
        </span>
        <span className="ml-auto font-mono font-bold" style={{ color: p1Winner ? "var(--status-win)" : "var(--text-muted)" }}>
          {m.score1 !== null ? m.score1 : "-"}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-hairline" />

      {/* Seat 2 */}
      <div
        className={`flex items-center gap-2.5 py-1.5 px-2.5 ${
          p2Winner ? "font-bold" : ""
        }`}
        style={
          p2Winner
            ? { boxShadow: "inset 3px 0 0 var(--status-done)" }
            : undefined
        }
      >
        <FractalMedallion
          seed={m.participant2Id || "empty-2"}
          size={26}
        />
        <span className="truncate max-w-[120px] text-text">
          {p2 ? p2.teamSnapshot || p2.nicknameSnapshot : "Waiting..."}
        </span>
        <span className="ml-auto font-mono font-bold" style={{ color: p2Winner ? "var(--status-win)" : "var(--text-muted)" }}>
          {m.score2 !== null ? m.score2 : "-"}
        </span>
      </div>
    </div>
  );
};

const nodeTypes = { matchNode: MatchNode };

// граф сетки (олимпийская система)
const FlowBracket: React.FC<BracketCanvasProps> = ({
  matches,
  participants,
  bracketType,
}) => {
  const { nodes, edges } = useMemo(() => {
    const pMap = new Map<string, ParticipantData>();
    participants.forEach((p) => pMap.set(p.id, p));

    const nodesList: Node[] = [];
    const edgesList: Edge[] = [];
    const valid = matches.filter((m) => m.round > 0);

    const mkNode = (m: MatchData, x: number, y: number) =>
      nodesList.push({
        id: m.id,
        type: "matchNode",
        position: { x, y },
        data: {
          match: m,
          p1: m.participant1Id ? pMap.get(m.participant1Id) || null : null,
          p2: m.participant2Id ? pMap.get(m.participant2Id) || null : null,
        },
      });

    const COL = 300;
    const ROW = 120;

    // стиль рёбер: пройденный путь, активный матч и неактивный (тонкая линия)
    const edgeStyle = (m: MatchData, isLoser = false) => ({
      stroke: isLoser
        ? "var(--status-danger)"
        : m.winnerId
          ? "var(--status-done)"
          : "var(--hairline)",
      strokeWidth: m.winnerId && !isLoser ? 2.5 : 1.2,
      ...(isLoser ? { strokeDasharray: "5 4" } : {}),
    });

      valid.forEach((m) => {
        const x = (m.round - 1) * COL;
        const spacing = ROW * Math.pow(2, m.round - 1);
        const offset = (Math.pow(2, m.round - 1) - 1) * (ROW / 2);
        mkNode(m, x, m.position * spacing + offset);
        if (m.nextMatchId) {
          edgesList.push({
            id: `n-${m.id}`,
            source: m.id,
            target: m.nextMatchId,
            type: "smoothstep",
            animated: !!m.winnerId,
            style: edgeStyle(m),
          });
        }
      });

    return { nodes: nodesList, edges: edgesList };
  }, [matches, participants, bracketType]);

  return (
    <div className={FRAME}>
      <div className="w-full h-full relative z-10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={(instance) => instance.fitView({ duration: 0 })}
          className="bg-transparent"
        >
          <Background color="var(--hairline)" gap={16} size={1} />
          <Controls className="bg-panel border border-border text-text fill-current" />
        </ReactFlow>
      </div>
    </div>
  );
};

// таблица результатов (круговая система)
const RoundRobinMatrix: React.FC<BracketCanvasProps> = ({ matches, participants }) => {
  const nameOf = (p: ParticipantData) => p.teamSnapshot || p.nicknameSnapshot;

  type CellType = "win" | "loss" | "draw" | "pending" | "self";
  type Cell = { score: string; type: CellType };

  const getCell = (rowId: string, colId: string): Cell => {
    if (rowId === colId) return { score: "", type: "self" };
    const m = matches.find(
      (x) =>
        (x.participant1Id === rowId && x.participant2Id === colId) ||
        (x.participant1Id === colId && x.participant2Id === rowId),
    );
    if (!m || m.score1 === null || m.score2 === null)
      return { score: "-", type: "pending" };
    const rowIsP1 = m.participant1Id === rowId;
    const s = rowIsP1 ? m.score1 : m.score2;
    const o = rowIsP1 ? m.score2 : m.score1;
    if (!m.winnerId) return { score: `${s}:${o}`, type: "draw" };
    return m.winnerId === rowId
      ? { score: `${s}:${o}`, type: "win" }
      : { score: `${s}:${o}`, type: "loss" };
  };

  const pts = (pid: string) => {
    let p = 0;
    matches.forEach((m) => {
      if (m.participant1Id !== pid && m.participant2Id !== pid) return;
      if (m.score1 === null || m.score2 === null) return;
      if (m.winnerId === pid) p += 1;
      else if (!m.winnerId) p += 0.5;
    });
    return p;
  };

  const wins = (pid: string) => matches.filter((m) => m.winnerId === pid).length;

  const ranked = [...participants].sort((a, b) => {
    const d = pts(b.id) - pts(a.id);
    return d !== 0 ? d : wins(b.id) - wins(a.id);
  });

  const n       = ranked.length;
  const ROW     = 56;
  const NAME_W  = 220;
  const PTS_W   = 88;
  const HEAD_H  = 62;
  const LEG_H   = 38;
  const cols    = `${NAME_W}px repeat(${n}, minmax(64px, 1fr)) ${PTS_W}px`;

  const contentH    = HEAD_H + n * ROW + LEG_H;
  const needsScroll = contentH > 600;

  return (
    <div
      className="window-shell w-full flex flex-col"
      style={{ height: needsScroll ? 600 : contentH }}
    >
      {/* ── HEADER - brushed metal bar ── */}
      <div
        className="brushed border-b border-border shrink-0"
        style={{ display: "grid", gridTemplateColumns: cols }}
      >
        {/* Corner */}
        <div className="flex items-end pb-3 px-4 border-r border-border" style={{ height: HEAD_H }}>
          <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Участник</span>
        </div>

        {/* Column avatar + number */}
        {ranked.map((p, i) => (
          <div
            key={p.id}
            className="pinstripe flex flex-col items-center justify-center gap-1 border-r border-border"
            style={{ height: HEAD_H }}
            title={nameOf(p)}
          >
            <FractalMedallion seed={p.id} size={24} />
            <span className="text-[9px] font-mono font-bold" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
          </div>
        ))}

        {/* Points label */}
        <div className="flex items-end pb-3 justify-center" style={{ height: HEAD_H }}>
          <span
            className="text-[10px] font-mono uppercase tracking-widest font-bold"
            style={{ color: "var(--status-done)" }}
          >
            Очки
          </span>
        </div>
      </div>

      {/* ── BODY - scrollable when tall ── */}
      <div className="flex-1" style={{ overflowY: needsScroll ? "auto" : "hidden", overflowX: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, width: "100%" }}>
          {ranked.map((row, ri) => {
            const p        = pts(row.id);
            const isLeader = ri === 0 && p > 0;
            const evenRow  = ri % 2 === 0;
            const nameBg   = isLeader
              ? "color-mix(in srgb, var(--status-win) 8%, var(--panel))"
              : evenRow ? "var(--panel)" : "var(--panel-sunken)";
            const rowBg    = evenRow ? "var(--panel)" : "var(--panel-sunken)";

            return (
              <React.Fragment key={row.id}>
                {/* Name + rank + avatar */}
                <div
                  className="flex items-center gap-2.5 px-3 border-b border-r border-border"
                  style={{
                    height: ROW,
                    background: nameBg,
                    boxShadow: isLeader ? "inset 3px 0 0 var(--status-win)" : undefined,
                  }}
                >
                  <span
                    className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-mono font-bold shrink-0"
                    style={{
                      background: isLeader
                        ? "color-mix(in srgb, var(--status-win) 22%, transparent)"
                        : "color-mix(in srgb, var(--text-muted) 12%, transparent)",
                      color: isLeader ? "var(--status-win)" : "var(--text-muted)",
                    }}
                  >
                    {ri + 1}
                  </span>
                  <FractalMedallion seed={row.id} size={28} />
                  <span className="text-xs font-semibold truncate" style={{ color: "var(--text)", maxWidth: 104 }}>
                    {nameOf(row)}
                  </span>
                </div>

                {/* Result cells */}
                {ranked.map((col) => {
                  const c = getCell(row.id, col.id);

                  if (c.type === "self") {
                    return (
                      <div
                        key={col.id}
                        className="pinstripe border-b border-r border-border flex items-center justify-center"
                        style={{ height: ROW }}
                      >
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{
                            background: "linear-gradient(180deg, var(--chrome-top) 0%, var(--chrome-bot) 100%)",
                            boxShadow: "inset 0 1px 0 var(--gloss), inset 0 -2px 4px rgba(0,0,0,0.18), 0 1px 3px var(--shadow)",
                          }}
                        />
                      </div>
                    );
                  }

                  type T = "win" | "loss" | "draw" | "pending";
                  const cell: Record<T, { bg: string; text: string; border: string; shadow: string }> = {
                    win:     {
                      bg:     "color-mix(in srgb, var(--status-win) 13%, var(--panel))",
                      text:   "var(--status-win)",
                      border: "var(--status-win)",
                      shadow: "inset 0 1px 0 rgba(40,200,64,0.22), inset 0 -1px 0 rgba(0,0,0,0.08)",
                    },
                    loss:    {
                      bg:     rowBg,
                      text:   "var(--text-muted)",
                      border: "var(--status-danger)",
                      shadow: "none",
                    },
                    draw:    {
                      bg:     "color-mix(in srgb, var(--accent) 9%, var(--panel))",
                      text:   "var(--accent)",
                      border: "var(--accent)",
                      shadow: "inset 0 1px 0 rgba(46,134,240,0.18)",
                    },
                    pending: {
                      bg:     rowBg,
                      text:   "color-mix(in srgb, var(--text-muted) 55%, transparent)",
                      border: "transparent",
                      shadow: "none",
                    },
                  };
                  const { bg, text, border, shadow } = cell[c.type as T];

                  return (
                    <div
                      key={col.id}
                      className="border-b border-r border-border flex items-center justify-center"
                      style={{
                        height: ROW,
                        background: bg,
                        borderLeft: `2.5px solid ${border}`,
                        boxShadow: shadow,
                      }}
                    >
                      <span className="text-[12px] font-mono font-bold" style={{ color: text }}>
                        {c.score}
                      </span>
                    </div>
                  );
                })}

                {/* Points */}
                <div
                  className="border-b border-border flex items-center justify-center"
                  style={{ height: ROW, background: nameBg }}
                >
                  <span
                    className="font-mono font-bold"
                    style={{
                      fontSize: 15,
                      color: isLeader ? "var(--status-win)" : "var(--status-done)",
                      textShadow: isLeader ? "0 0 12px color-mix(in srgb, var(--status-win) 60%, transparent)" : undefined,
                    }}
                  >
                    {p % 1 === 0 ? p : p.toFixed(1)}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── LEGEND - brushed footer ── */}
      <div
        className="brushed border-t border-border shrink-0 px-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[9px] font-mono"
        style={{ height: LEG_H, color: "var(--text-muted)" }}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px] inline-block shrink-0" style={{ background: "color-mix(in srgb, var(--status-win) 30%, var(--panel))", borderLeft: "2px solid var(--status-win)", boxShadow: "inset 0 1px 0 rgba(40,200,64,0.3)" }} />
          победа (+1)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px] inline-block shrink-0" style={{ background: "color-mix(in srgb, var(--status-danger) 20%, var(--panel))", borderLeft: "2px solid var(--status-danger)" }} />
          поражение
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px] inline-block shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 22%, var(--panel))", borderLeft: "2px solid var(--accent)", boxShadow: "inset 0 1px 0 rgba(46,134,240,0.25)" }} />
          ничья (+0.5)
        </span>
        <span className="ml-auto opacity-50">строка × столбец</span>
      </div>
    </div>
  );
};


// диспетчер
export const BracketCanvas: React.FC<BracketCanvasProps> = (props) => {
  const { bracketType } = props;
  if (bracketType === "ROUND_ROBIN") return <RoundRobinMatrix {...props} />;
  return <FlowBracket {...props} />;
};
