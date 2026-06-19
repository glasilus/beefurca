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
  "w-full h-[600px] border border-obsidian-border bg-obsidian-base rounded overflow-hidden relative";

// ---------- Узел матча для ReactFlow (дерево / двойная сетка) ----------
const MatchNode: React.FC<NodeProps> = ({ data }) => {
  const m = data.match as MatchData;
  const p1 = data.p1 as ParticipantData | null;
  const p2 = data.p2 as ParticipantData | null;

  const isCompleted = !!m.winnerId;
  const isActive = !isCompleted && m.participant1Id && m.participant2Id;

  const cardClass = isActive
    ? "border-activeGrad-start shadow-[0_0_15px_rgba(255,31,68,0.2)] bg-gradient-to-br from-[#241217] to-[#12090C]"
    : "border-obsidian-border bg-gradient-to-br from-[#12171E] to-[#0E1218]";

  const p1Winner = isCompleted && m.winnerId === m.participant1Id;
  const p2Winner = isCompleted && m.winnerId === m.participant2Id;

  return (
    <div className={`w-[220px] text-xs border rounded p-3 text-white ${cardClass} relative`}>
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <div className="flex justify-between items-center border-b border-obsidian-border pb-1.5 mb-2">
        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
          Раунд {m.round}
        </span>
        {m.isTechDefeat && (
          <span className="text-[8px] bg-red-900/60 text-red-200 border border-red-800 px-1 rounded uppercase font-bold">Тех. пор.</span>
        )}
        {isActive && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </div>
      <div className={`flex justify-between items-center py-1 px-1.5 rounded ${p1Winner ? "bg-completeGrad-start/20 font-bold" : ""}`}>
        <span className="truncate max-w-[140px] text-slate-100">{p1 ? p1.teamSnapshot || p1.nicknameSnapshot : "Ожидание..."}</span>
        <span className="font-mono font-bold text-slate-200">{m.score1 !== null ? m.score1 : "-"}</span>
      </div>
      <div className={`flex justify-between items-center py-1 px-1.5 rounded mt-1 ${p2Winner ? "bg-completeGrad-start/20 font-bold" : ""}`}>
        <span className="truncate max-w-[140px] text-slate-100">{p2 ? p2.teamSnapshot || p2.nicknameSnapshot : "Ожидание..."}</span>
        <span className="font-mono font-bold text-slate-200">{m.score2 !== null ? m.score2 : "-"}</span>
      </div>
    </div>
  );
};

// Узел-подпись дорожки (для double elimination)
const LaneLabel: React.FC<NodeProps> = ({ data }) => (
  <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 font-bold pointer-events-none">
    {(data as any).label}
  </div>
);

const nodeTypes = { matchNode: MatchNode, laneLabel: LaneLabel };

// ---------- Граф на ReactFlow (Single / Double Elim) ----------
const FlowBracket: React.FC<BracketCanvasProps> = ({ matches, participants, bracketType }) => {
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

    if (bracketType === "DOUBLE_ELIM") {
      const winners = valid.filter((m) => m.bracketSection === "winners");
      const losers = valid.filter((m) => m.bracketSection === "losers");
      const finals = valid.filter((m) => m.bracketSection === "grand_final" || m.bracketSection === "grand_final_reset");
      const untagged = valid.filter((m) => !m.bracketSection); // на случай старых данных

      const winnersR1 = Math.max(1, winners.filter((m) => m.round === 1).length);
      const topHeight = winnersR1 * ROW + 80;
      const maxWinnersRound = Math.max(1, ...winners.map((m) => m.round), ...untagged.map((m) => m.round));

      if (winners.length || untagged.length) {
        nodesList.push({ id: "lbl-w", type: "laneLabel", position: { x: 0, y: -40 }, data: { label: "Winners Bracket" }, draggable: false, selectable: false });
      }
      [...winners, ...untagged].forEach((m) => mkNode(m, (m.round - 1) * COL, m.position * ROW));

      if (losers.length) {
        nodesList.push({ id: "lbl-l", type: "laneLabel", position: { x: 0, y: topHeight - 40 }, data: { label: "Losers Bracket" }, draggable: false, selectable: false });
        losers.forEach((m) => mkNode(m, (m.round - 1) * (COL - 40), topHeight + m.position * ROW));
      }

      finals.forEach((m, i) => mkNode(m, maxWinnersRound * COL + 40, topHeight / 2 + i * ROW));

      valid.forEach((m) => {
        if (m.nextMatchId) {
          edgesList.push({
            id: `n-${m.id}`,
            source: m.id,
            target: m.nextMatchId,
            type: "smoothstep",
            animated: !!m.winnerId,
            style: { stroke: m.winnerId ? "#00E5FF" : "#1B232D", strokeWidth: m.winnerId ? 2.5 : 1.2 },
          });
        }
        if (m.loserNextMatchId) {
          edgesList.push({
            id: `l-${m.id}`,
            source: m.id,
            target: m.loserNextMatchId,
            type: "smoothstep",
            animated: false,
            style: { stroke: "#7f1d1d", strokeWidth: 1.2, strokeDasharray: "5 4" },
          });
        }
      });
    } else {
      // SINGLE ELIM — бинарное дерево
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
            style: { stroke: m.winnerId ? "#00E5FF" : "#1B232D", strokeWidth: m.winnerId ? 2.5 : 1.2 },
          });
        }
      });
    }

    return { nodes: nodesList, edges: edgesList };
  }, [matches, participants, bracketType]);

  return (
    <div className={FRAME}>
      <div className="absolute inset-0 dither-overlay z-0" />
      <div className="w-full h-full relative z-10">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView className="bg-transparent">
          <Background color="#334155" gap={16} size={1} />
          <Controls className="bg-obsidian-panel border border-obsidian-border text-white fill-current" />
        </ReactFlow>
      </div>
    </div>
  );
};

// ---------- Кросс-таблица (Round Robin) ----------
const RoundRobinMatrix: React.FC<BracketCanvasProps> = ({ matches, participants }) => {
  const nameOf = (p: ParticipantData) => p.teamSnapshot || p.nicknameSnapshot;

  const cell = (rowId: string, colId: string) => {
    const m = matches.find(
      (x) =>
        (x.participant1Id === rowId && x.participant2Id === colId) ||
        (x.participant1Id === colId && x.participant2Id === rowId)
    );
    if (!m || m.score1 === null || m.score2 === null) return { text: "—", cls: "text-slate-600" };
    const rowIsP1 = m.participant1Id === rowId;
    const self = rowIsP1 ? m.score1 : m.score2;
    const opp = rowIsP1 ? m.score2 : m.score1;
    let cls = "text-slate-300";
    if (m.winnerId === rowId) cls = "text-green-400 font-bold";
    else if (m.winnerId && m.winnerId !== rowId) cls = "text-red-400";
    return { text: `${self}:${opp}`, cls };
  };

  // Очки: победа 1, ничья 0.5
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
      <div className="absolute inset-0 dither-overlay z-0 pointer-events-none" />
      <div className="relative z-10 p-4 min-w-max">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-obsidian-panel p-2 text-left text-[10px] font-mono uppercase text-slate-400 border border-obsidian-border">Участник</th>
              {ranked.map((p, i) => (
                <th key={p.id} className="p-2 w-12 text-center text-[10px] font-mono text-slate-500 border border-obsidian-border" title={nameOf(p)}>
                  {i + 1}
                </th>
              ))}
              <th className="p-2 text-center text-[10px] font-mono uppercase text-completeGrad-mid border border-obsidian-border">Очки</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, ri) => (
              <tr key={row.id}>
                <td className="sticky left-0 bg-obsidian-panel p-2 text-slate-200 font-semibold border border-obsidian-border whitespace-nowrap">
                  <span className="text-slate-500 font-mono mr-2">{ri + 1}</span>
                  {nameOf(row)}
                </td>
                {ranked.map((col) => {
                  if (col.id === row.id)
                    return <td key={col.id} className="bg-obsidian-border/40 border border-obsidian-border" />;
                  const c = cell(row.id, col.id);
                  return (
                    <td key={col.id} className={`p-2 text-center font-mono border border-obsidian-border ${c.cls}`}>{c.text}</td>
                  );
                })}
                <td className="p-2 text-center font-mono font-bold text-completeGrad-mid border border-obsidian-border">{points(row.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-slate-500 font-mono mt-3">
          Ячейка — счёт строки против столбца. <span className="text-green-400">Зелёный</span> — победа, <span className="text-red-400">красный</span> — поражение.
        </p>
      </div>
    </div>
  );
};

// ---------- Колонки по турам (Swiss) ----------
const SwissColumns: React.FC<BracketCanvasProps> = ({ matches, participants }) => {
  const pMap = new Map<string, ParticipantData>();
  participants.forEach((p) => pMap.set(p.id, p));
  const nameOf = (id: string | null) => {
    if (!id) return null;
    const p = pMap.get(id);
    return p ? p.teamSnapshot || p.nicknameSnapshot : "?";
  };

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);

  return (
    <div className={`${FRAME} overflow-auto`}>
      <div className="absolute inset-0 dither-overlay z-0 pointer-events-none" />
      <div className="relative z-10 p-4 flex gap-4 min-w-max h-full">
        {rounds.map((r) => {
          const roundMatches = matches.filter((m) => m.round === r).sort((a, b) => a.position - b.position);
          return (
            <div key={r} className="flex flex-col gap-3 w-[230px]">
              <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold text-center pb-2 border-b border-obsidian-border">
                Тур {r}
              </div>
              {roundMatches.map((m) => {
                const isBye = !m.participant2Id;
                const w1 = m.winnerId && m.winnerId === m.participant1Id;
                const w2 = m.winnerId && m.winnerId === m.participant2Id;
                return (
                  <div key={m.id} className="component-card-dark p-2.5 text-xs">
                    {isBye ? (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-200 truncate max-w-[150px]">{nameOf(m.participant1Id)}</span>
                        <span className="text-[8px] font-mono uppercase text-green-400 border border-green-900 bg-green-950/20 px-1 rounded">BYE</span>
                      </div>
                    ) : (
                      <>
                        <div className={`flex justify-between items-center py-0.5 ${w1 ? "text-green-400 font-bold" : "text-slate-200"}`}>
                          <span className="truncate max-w-[150px]">{nameOf(m.participant1Id)}</span>
                          <span className="font-mono">{m.score1 !== null ? m.score1 : "-"}</span>
                        </div>
                        <div className={`flex justify-between items-center py-0.5 ${w2 ? "text-green-400 font-bold" : "text-slate-200"}`}>
                          <span className="truncate max-w-[150px]">{nameOf(m.participant2Id)}</span>
                          <span className="font-mono">{m.score2 !== null ? m.score2 : "-"}</span>
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

// ---------- Диспетчер ----------
export const BracketCanvas: React.FC<BracketCanvasProps> = (props) => {
  const { bracketType } = props;
  if (bracketType === "ROUND_ROBIN") return <RoundRobinMatrix {...props} />;
  if (bracketType === "SWISS") return <SwissColumns {...props} />;
  return <FlowBracket {...props} />;
};
