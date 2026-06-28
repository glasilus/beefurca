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
  isVoidDraw: boolean;
  bracketSection?: string | null;
  nextMatchId?: string | null;
  loserNextMatchId?: string | null;
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

// ---------- Match node for ReactFlow (tree / double bracket) ----------
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

// Lane label node (for double elimination)
const LaneLabel: React.FC<NodeProps> = ({ data }) => (
  <div className="text-[11px] font-mono uppercase tracking-widest text-text-muted font-bold pointer-events-none">
    {(data as Record<string, unknown>).label as string}
  </div>
);

const nodeTypes = { matchNode: MatchNode, laneLabel: LaneLabel };

// ---------- Flow graph (Single / Double Elim) ----------
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
    const valid = matches.filter((m) => m.round > 0 && !m.isVoidDraw);

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

    // Edge style helper: completed path = done cyan, active = live, inactive = hairline
    const edgeStyle = (m: MatchData, isLoser = false) => ({
      stroke: isLoser
        ? "var(--status-danger)"
        : m.winnerId
          ? "var(--status-done)"
          : "var(--hairline)",
      strokeWidth: m.winnerId && !isLoser ? 2.5 : 1.2,
      ...(isLoser ? { strokeDasharray: "5 4" } : {}),
    });

    if (bracketType === "DOUBLE_ELIM") {
      const winners  = valid.filter((m) => m.bracketSection === "winners");
      const losers   = valid.filter((m) => m.bracketSection === "losers");
      const finals   = valid.filter(
        (m) => m.bracketSection === "grand_final" || m.bracketSection === "grand_final_reset",
      );
      const allW = [...valid.filter((m) => !m.bracketSection), ...winners];

      const wR1count = Math.max(1, allW.filter((m) => m.round === 1).length);
      const maxWR    = allW.length ? Math.max(...allW.map((m) => m.round)) : 1;
      const maxLR    = losers.length ? Math.max(...losers.map((m) => m.round)) : 0;

      // Winners bracket — proper binary-tree vertical centering
      if (allW.length) {
        nodesList.push({
          id: "lbl-w", type: "laneLabel",
          position: { x: 0, y: -40 }, data: { label: "Winners Bracket" },
          draggable: false, selectable: false,
        });
      }
      allW.forEach((m) => {
        const x       = (m.round - 1) * COL;
        const spacing = ROW * Math.pow(2, m.round - 1);
        const offset  = (Math.pow(2, m.round - 1) - 1) * (ROW / 2);
        mkNode(m, x, m.position * spacing + offset);
      });

      // Gap between sections
      const winnersH = wR1count * ROW + 140;

      // Losers bracket — column width scaled so both sections have similar total width
      const LCOL = maxLR > 0 ? Math.round((maxWR * COL) / maxLR) : COL;

      // Group losers by round to center shorter rounds vertically
      const lByRound = new Map<number, MatchData[]>();
      losers.forEach((m) => {
        const arr = lByRound.get(m.round) ?? [];
        arr.push(m);
        lByRound.set(m.round, arr);
      });
      const maxInLR = lByRound.size
        ? Math.max(...Array.from(lByRound.values()).map((a) => a.length))
        : 1;

      if (losers.length) {
        nodesList.push({
          id: "lbl-l", type: "laneLabel",
          position: { x: 0, y: winnersH - 40 }, data: { label: "Losers Bracket" },
          draggable: false, selectable: false,
        });
        losers.forEach((m) => {
          const rLen = lByRound.get(m.round)!.length;
          const x    = (m.round - 1) * LCOL;
          const yOff = Math.floor(((maxInLR - rLen) / 2) * ROW);
          mkNode(m, x, winnersH + yOff + m.position * ROW);
        });
      }

      // Grand Final — to the right of both brackets, centered vertically.
      // grand_final_reset is hidden while neither finalist has been placed yet;
      // it appears as soon as at least one participant or a winner is present.
      const activeFinals = finals.filter(
        (m) =>
          m.bracketSection !== "grand_final_reset" ||
          m.participant1Id ||
          m.participant2Id ||
          m.winnerId,
      );
      const rightEdge = Math.max(maxWR * COL, maxLR * LCOL);
      const gfX       = rightEdge + Math.round(COL * 0.45);
      const totalH    = winnersH + maxInLR * ROW;
      const gfCenterY = totalH / 2 - ROW / 2 - ((activeFinals.length - 1) * (ROW + 16)) / 2;
      activeFinals.forEach((m, i) => mkNode(m, gfX, gfCenterY + i * (ROW + 16)));

      // Edges: winner-path only.
      // loserNextMatchId lines (W→L drop) are intentionally omitted —
      // they cross the entire canvas and make the bracket unreadable.
      valid.forEach((m) => {
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
    } else {
      // SINGLE ELIM -- binary tree
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
    }

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

// ---------- Cross-table (Round Robin) ----------
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
      return { score: "—", type: "pending" };
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

  const cellCls: Record<CellType, string> = {
    win:     "bg-[color-mix(in_srgb,var(--status-win)_18%,transparent)] text-[var(--status-win)] font-bold",
    loss:    "bg-[color-mix(in_srgb,var(--status-danger)_14%,transparent)] text-[var(--text-muted)]",
    draw:    "bg-[color-mix(in_srgb,var(--accent)_13%,transparent)] text-[var(--accent)] font-semibold",
    pending: "text-[var(--text-muted)]",
    self:    "bg-[var(--panel-sunken)]",
  };

  return (
    <div className={`${FRAME} flex flex-col overflow-hidden`}>
      <div className="relative z-10 flex-1 overflow-auto p-4">
        <table className="border-collapse text-xs w-max min-w-full">
          <thead>
            <tr>
              {/* rank + name header */}
              <th className="sticky left-0 z-20 bg-panel min-w-[180px] px-3 py-2.5 text-left text-[10px] font-mono uppercase tracking-widest text-text-muted border border-border">
                Участник
              </th>
              {ranked.map((p, i) => (
                <th
                  key={p.id}
                  className="w-14 min-w-[56px] px-1 py-2.5 text-center border border-border"
                  title={nameOf(p)}
                >
                  <span className="block text-[11px] font-bold font-mono text-text">{i + 1}</span>
                  <span className="block text-[8px] font-mono text-text-muted truncate max-w-[52px] mx-auto mt-0.5">
                    {nameOf(p).split(" ")[0]}
                  </span>
                </th>
              ))}
              <th className="min-w-[56px] px-2 py-2.5 text-center text-[10px] font-mono uppercase tracking-widest text-[var(--status-done)] border border-border font-bold">
                Очки
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, ri) => {
              const p = pts(row.id);
              const isLeader = ri === 0 && p > 0;
              return (
                <tr key={row.id}>
                  {/* sticky name column */}
                  <td
                    className={`sticky left-0 z-10 px-3 py-2.5 border border-border whitespace-nowrap ${
                      isLeader
                        ? "bg-[color-mix(in_srgb,var(--status-win)_9%,var(--panel))]"
                        : "bg-panel"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold text-sm w-5 text-center shrink-0 ${
                          isLeader ? "text-[var(--status-win)]" : "text-text-muted"
                        }`}
                      >
                        {ri + 1}
                      </span>
                      <span className="font-semibold text-text truncate max-w-[130px]">
                        {nameOf(row)}
                      </span>
                    </div>
                  </td>

                  {/* result cells */}
                  {ranked.map((col) => {
                    const c = getCell(row.id, col.id);
                    if (c.type === "self") {
                      return (
                        <td key={col.id} className="border border-border bg-panel-sunken">
                          <div className="w-full h-full flex items-center justify-center text-[var(--hairline)] text-lg select-none">
                            ×
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={col.id}
                        className={`px-1 py-2.5 text-center font-mono border border-border ${cellCls[c.type]}`}
                      >
                        {c.score}
                      </td>
                    );
                  })}

                  {/* points */}
                  <td
                    className={`px-2 py-2.5 text-center font-mono font-bold border border-border ${
                      isLeader ? "text-[var(--status-win)] text-sm" : "text-[var(--status-done)]"
                    }`}
                  >
                    {p % 1 === 0 ? p : p.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* legend */}
      <div className="relative z-10 px-4 py-2 border-t border-hairline flex flex-wrap items-center gap-x-5 gap-y-1 text-[9px] font-mono text-text-muted shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[color-mix(in_srgb,var(--status-win)_35%,transparent)] inline-block shrink-0" />
          победа (+1)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[color-mix(in_srgb,var(--status-danger)_30%,transparent)] inline-block shrink-0" />
          поражение
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[color-mix(in_srgb,var(--accent)_25%,transparent)] inline-block shrink-0" />
          ничья (+0.5)
        </span>
        <span className="ml-auto">строка × столбец = счёт: строка против колонки</span>
      </div>
    </div>
  );
};

// ---------- Columns by round (Swiss) ----------
const SwissColumns: React.FC<BracketCanvasProps> = ({
  matches,
  participants,
}) => {
  const pMap = new Map<string, ParticipantData>();
  participants.forEach((p) => pMap.set(p.id, p));
  const nameOf = (id: string | null) => {
    if (!id) return null;
    const p = pMap.get(id);
    return p ? p.teamSnapshot || p.nicknameSnapshot : "?";
  };

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort(
    (a, b) => a - b,
  );

  return (
    <div className={`${FRAME} overflow-auto`}>
      <div className="relative z-10 p-4 flex gap-4 min-w-max h-full">
        {rounds.map((r) => {
          const roundMatches = matches
            .filter((m) => m.round === r)
            .sort((a, b) => a.position - b.position);
          return (
            <div key={r} className="flex flex-col gap-3 w-[230px]">
              <div className="text-[11px] font-mono uppercase tracking-widest text-text-muted font-bold text-center pb-2 border-b border-border">
                Round {r}
              </div>
              {roundMatches.map((m) => {
                const isBye = !m.participant2Id;
                const w1 = m.winnerId && m.winnerId === m.participant1Id;
                const w2 = m.winnerId && m.winnerId === m.participant2Id;
                return (
                  <div
                    key={m.id}
                    className="frost border border-border rounded-card p-2.5 text-xs"
                  >
                    {isBye ? (
                      <div className="flex justify-between items-center">
                        <span className="text-text truncate max-w-[150px]">
                          {nameOf(m.participant1Id)}
                        </span>
                        <span className="text-[8px] font-mono uppercase text-win border border-win/30 bg-win/10 px-1 rounded">
                          BYE
                        </span>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`flex justify-between items-center py-0.5 ${w1 ? "text-win font-bold" : "text-text"}`}
                        >
                          <span className="truncate max-w-[150px]">
                            {nameOf(m.participant1Id)}
                          </span>
                          <span className="font-mono">
                            {m.score1 !== null ? m.score1 : "-"}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between items-center py-0.5 ${w2 ? "text-win font-bold" : "text-text"}`}
                        >
                          <span className="truncate max-w-[150px]">
                            {nameOf(m.participant2Id)}
                          </span>
                          <span className="font-mono">
                            {m.score2 !== null ? m.score2 : "-"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------- Dispatcher ----------
export const BracketCanvas: React.FC<BracketCanvasProps> = (props) => {
  const { bracketType } = props;
  if (bracketType === "ROUND_ROBIN") return <RoundRobinMatrix {...props} />;
  if (bracketType === "SWISS") return <SwissColumns {...props} />;
  return <FlowBracket {...props} />;
};
