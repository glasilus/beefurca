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
const RoundRobinMatrix: React.FC<BracketCanvasProps> = ({
  matches,
  participants,
}) => {
  const nameOf = (p: ParticipantData) => p.teamSnapshot || p.nicknameSnapshot;

  const cell = (rowId: string, colId: string) => {
    const m = matches.find(
      (x) =>
        (x.participant1Id === rowId && x.participant2Id === colId) ||
        (x.participant1Id === colId && x.participant2Id === rowId),
    );
    if (!m || m.score1 === null || m.score2 === null)
      return { text: "—", cls: "text-text-muted" };
    const rowIsP1 = m.participant1Id === rowId;
    const self = rowIsP1 ? m.score1 : m.score2;
    const opp = rowIsP1 ? m.score2 : m.score1;
    let cls = "text-text";
    if (m.winnerId === rowId) cls = "text-win font-bold";
    else if (m.winnerId && m.winnerId !== rowId) cls = "text-danger";
    return { text: `${self}:${opp}`, cls };
  };

  const points = (pid: string) => {
    let pts = 0;
    matches.forEach((m) => {
      if (m.participant1Id !== pid && m.participant2Id !== pid) return;
      if (m.score1 === null || m.score2 === null) return;
      if (m.winnerId === pid) pts += 1;
      else if (!m.winnerId) pts += 0.5;
    });
    return pts;
  };

  const ranked = [...participants].sort((a, b) => points(b.id) - points(a.id));

  return (
    <div className={`${FRAME} overflow-auto`}>
      <div className="relative z-10 p-4 min-w-max">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-panel p-2 text-left text-[10px] font-mono uppercase text-text-muted border border-border">
                Participant
              </th>
              {ranked.map((p, i) => (
                <th
                  key={p.id}
                  className="p-2 w-12 text-center text-[10px] font-mono text-text-muted border border-border"
                  title={nameOf(p)}
                >
                  {i + 1}
                </th>
              ))}
              <th className="p-2 text-center text-[10px] font-mono uppercase text-done border border-border">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, ri) => (
              <tr key={row.id}>
                <td className="sticky left-0 bg-panel p-2 text-text font-semibold border border-border whitespace-nowrap">
                  <span className="text-text-muted font-mono mr-2">
                    {ri + 1}
                  </span>
                  {nameOf(row)}
                </td>
                {ranked.map((col) => {
                  if (col.id === row.id)
                    return (
                      <td
                        key={col.id}
                        className="bg-panel-sunken border border-border"
                      />
                    );
                  const c = cell(row.id, col.id);
                  return (
                    <td
                      key={col.id}
                      className={`p-2 text-center font-mono border border-border ${c.cls}`}
                    >
                      {c.text}
                    </td>
                  );
                })}
                <td className="p-2 text-center font-mono font-bold text-done border border-border">
                  {points(row.id)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-text-muted font-mono mt-3">
          Cell = row vs column score.{" "}
          <span className="text-win">Green</span> = win,{" "}
          <span className="text-danger">red</span> = loss.
        </p>
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
