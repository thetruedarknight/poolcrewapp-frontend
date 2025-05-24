import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";

// --------- TYPES ----------
type Player = {
  playerId: string;
  name: string;
  nickname?: string;
  avatarUrl?: string;
};

type Drill = {
  drillId: string;
  name: string;
  maxScore: number;
  skillTested?: string;
};

type TrainingLog = {
  date: string;
  sessionId: string;
  drillId: string;
  playerId: string;
  setNumber: number;
  score: number;
  notes?: string;
};

type Props = {
  onBackToMenu: () => void;
};

// --------- COMPONENT ---------
const ViewTrainingPage: React.FC<Props> = ({ onBackToMenu }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [viewMode, setViewMode] = useState<"drill" | "player">("drill");
  const [selectedDrill, setSelectedDrill] = useState<string>("");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // --------- DATA LOAD ---------
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/getPlayers").then(r => r.json()) as Promise<Player[]>,
      fetch("/api/getDrills").then(r => r.json()) as Promise<Drill[]>,
      fetch("/api/getTrainingLogs").then(r => r.json()) as Promise<TrainingLog[]>
    ]).then(([p, d, l]) => {
      setPlayers(p || []);
      setDrills(d || []);
      setLogs(l || []);
      setLoading(false);
    });
  }, []);

  // --------- UTILS ----------
  function getPlayerName(player?: Player) {
    return player?.nickname ? player.nickname : player?.name || "";
  }
  function getDrillName(drill?: Drill) {
    return drill?.name || "";
  }

  // --------- GROUP & FILTER ----------
  function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
    return arr.reduce((acc, x) => {
      const groupKey = x[key] as string;
      (acc[groupKey] = acc[groupKey] || []).push(x);
      return acc;
    }, {} as Record<string, T[]>);
  }

  // Filter logs
  let filteredLogs = logs;
  if (viewMode === "drill" && selectedDrill)
    filteredLogs = filteredLogs.filter(l => l.drillId === selectedDrill);
  if (viewMode === "player" && selectedPlayer)
    filteredLogs = filteredLogs.filter(l => l.playerId === selectedPlayer);

  // Dates for grouping
  const allDates = Array.from(new Set(filteredLogs.map(l => l.date))).sort();

  // --------- DATA FOR CHART ----------
  let group: Record<string, TrainingLog[]> = {};
let xAxisKey: string = "date";
let linesData: any[] = [];

if (viewMode === "drill") {
  group = groupBy(filteredLogs, "playerId");
  xAxisKey = "date";
  linesData = allDates.map(date => {
    let row: any = { date };
    for (const playerId in group) {
      const maxScore = drills.find(d => d.drillId === selectedDrill)?.maxScore || 1;
      const setScores = group[playerId].filter(l => l.date === date).map(l => Number(l.score));
      if (setScores.length)
        row[playerId] = Math.round((setScores.reduce((a, b) => a + b, 0) / (setScores.length * maxScore)) * 100);
    }
    return row;
  });
} else if (viewMode === "player") {
  group = groupBy(filteredLogs, "drillId");
  xAxisKey = "date";
  linesData = allDates.map(date => {
    let row: any = { date };
    for (const drillId in group) {
      const maxScore = drills.find(d => d.drillId === drillId)?.maxScore || 1;
      const setScores = group[drillId].filter(l => l.date === date).map(l => Number(l.score));
      if (setScores.length)
        row[drillId] = Math.round((setScores.reduce((a, b) => a + b, 0) / (setScores.length * maxScore)) * 100);
    }
    return row;
  });
}


  function getColor(idx: number) {
    const colors = ["#20e878", "#39ecb5", "#43AA8B", "#1A8FE3", "#F94144", "#F3722C", "#F8961E", "#F9C74F"];
    return colors[idx % colors.length];
  }

  // --------- RENDER ---------
  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg-gradient)" }}>
      <div className="page-container" style={{ width: "100%", maxWidth: 700, marginTop: 0, marginBottom: 30 }}>
        <h1 style={{ color: "var(--accent)", textAlign: "center" }}>Training Data</h1>
        <div style={{ display: "flex", gap: 18, justifyContent: "center", marginBottom: 22 }}>
          <button
            className={`btn ${viewMode === "drill" ? "bg-[#273036]" : ""}`}
            onClick={() => setViewMode("drill")}
            style={{ borderRadius: 10, width: 120, background: viewMode === "drill" ? "#273036" : undefined }}
          >
            By Drill
          </button>
          <button
            className={`btn ${viewMode === "player" ? "bg-[#273036]" : ""}`}
            onClick={() => setViewMode("player")}
            style={{ borderRadius: 10, width: 120, background: viewMode === "player" ? "#273036" : undefined }}
          >
            By Player
          </button>
        </div>
        {loading ? (
          <div style={{ color: "#aaffc6", textAlign: "center", margin: 22 }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
              {viewMode === "drill" && (
                <label>
                  Drill:<br />
                  <select
                    value={selectedDrill}
                    onChange={e => setSelectedDrill(e.target.value)}
                    style={{ width: 170, marginBottom: 0 }}
                  >
                    <option value="">All Drills</option>
                    {drills.map(d =>
                      <option key={d.drillId} value={d.drillId}>{getDrillName(d)}</option>
                    )}
                  </select>
                </label>
              )}
              {viewMode === "player" && (
                <label>
                  Player:<br />
                  <select
                    value={selectedPlayer}
                    onChange={e => setSelectedPlayer(e.target.value)}
                    style={{ width: 170, marginBottom: 0 }}
                  >
                    <option value="">All Players</option>
                    {players.map(p =>
                      <option key={p.playerId} value={p.playerId}>{getPlayerName(p)}</option>
                    )}
                  </select>
                </label>
              )}
            </div>
            {/* Chart */}
            <div style={{ width: "100%", height: 260, marginBottom: 22 }}>
              <ResponsiveContainer>
                <LineChart data={linesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={xAxisKey} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={v => `${v}%`} />
                  <Legend />
                  {Object.keys(group || {}).map((key, idx) => {
                    let label: string;
                    if (viewMode === "drill") {
                      const player = players.find(p => p.playerId === key);
                      label = getPlayerName(player);
                    } else {
                      const drill = drills.find(d => d.drillId === key);
                      label = getDrillName(drill);
                    }
                    return (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={label}
                        stroke={getColor(idx)}
                        dot={false}
                        strokeWidth={3}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Table */}
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table style={{ width: "100%", background: "#172227", borderRadius: 10, overflow: "hidden" }}>
                <thead>
                  <tr style={{ color: "#39ecb5", background: "#1a2227" }}>
                    <th>Date</th>
                    {viewMode === "drill" ?
                      <th>Player</th> :
                      <th>Drill</th>
                    }
                    <th>Set</th>
                    <th>Score</th>
                    <th>Percent</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length ? filteredLogs.map((l, i) => {
                    const player = players.find(p => p.playerId === l.playerId);
                    const drill = drills.find(d => d.drillId === l.drillId);
                    const percent = Math.round((Number(l.score) / (drill?.maxScore || 1)) * 100);
                    return (
                      <tr key={i} style={{ color: "#e7ffe0" }}>
                        <td>{l.date}</td>
                        <td>{viewMode === "drill" ? getPlayerName(player) : getDrillName(drill)}</td>
                        <td>{l.setNumber}</td>
                        <td>{l.score}</td>
                        <td>{percent}%</td>
                        <td>{l.notes || ""}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} style={{ color: "#fcb0b0", textAlign: "center" }}>
                        No training data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
        <button
          className="btn"
          style={{ width: "100%", marginTop: 20, background: "#273036", color: "#fff" }}
          onClick={onBackToMenu}
        >Return to Main Menu</button>
      </div>
    </div>
  );
};

export default ViewTrainingPage;
