import React, { useEffect, useState } from "react";

type Drill = {
  drillId: string;
  name: string;
  maxScore: number;
  skillTested: string;
};

type Player = {
  playerId: string;
  name: string;
  nickname?: string;
};

type TrainingLog = {
  date: string;
  sessionId: string;
  drillId: string;
  playerId: string;
  setNumber: string;
  score: string;
  notes?: string;
};

function getPlayerName(p?: Player) {
  return p ? (p.nickname || p.name) : "";
}
function getDrillName(d?: Drill) {
  return d ? d.name : "";
}
function groupBy<T>(arr: T[], key: keyof T) {
  return arr.reduce((acc, item) => {
    const val = item[key] as string;
    if (!acc[val]) acc[val] = [];
    acc[val].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// Dummy chart for example, replace with your Recharts etc.
function LineChart({ data, lines, xAxisKey }: any) {
  // In your actual app, use the real charting lib!
  return (
    <div style={{ minHeight: 180, margin: "2em 0", color: "#20e878", textAlign: "center" }}>
      <div>
        {lines.length === 0
          ? <span>No chart data.</span>
          : <span style={{ fontWeight: 700 }}>[Chart would render here]</span>
        }
      </div>
    </div>
  );
}

export default function ViewTrainingPage({ onBackToMenu }: { onBackToMenu: () => void }) {
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [viewMode, setViewMode] = useState<"drill" | "player">("drill");
  const [selectedDrill, setSelectedDrill] = useState<string>("");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");

  // Fetch all data on mount
  useEffect(() => {
    (async () => {
      // Replace with your API endpoints!
      const logs = await fetch("/api/getTrainingLogs").then(r => r.json());
      const drills = await fetch("/api/getDrills").then(r => r.json());
      const players = await fetch("/api/getPlayers").then(r => r.json());
      setLogs(logs);
      setDrills(drills);
      setPlayers(players);
    })();
  }, []);

  // For filtering
  let filteredLogs = logs;
  if (viewMode === "drill" && selectedDrill && selectedDrill !== "all") {
    filteredLogs = filteredLogs.filter(l => l.drillId === selectedDrill);
  }
  if (viewMode === "player" && selectedPlayer && selectedPlayer !== "all") {
    filteredLogs = filteredLogs.filter(l => l.playerId === selectedPlayer);
  }

  // Chart Data (lines, xAxis, etc)
  let group: Record<string, TrainingLog[]> = {};
  let xAxisKey: string = "date";
  let linesData: any[] = [];
  let lineKeys: string[] = [];
  let allDates: string[] = Array.from(new Set(filteredLogs.map(l => l.date))).sort();

  if ((viewMode === "drill" && selectedDrill && selectedDrill !== "all") ||
      (viewMode === "player" && selectedPlayer && selectedPlayer !== "all")) {
    if (viewMode === "drill") {
      group = groupBy(filteredLogs, "playerId");
      lineKeys = Object.keys(group);
      linesData = allDates.map(date => {
        let row: any = { date };
        for (const playerId of lineKeys) {
          const maxScore = drills.find(d => d.drillId === selectedDrill)?.maxScore || 1;
          const scores = group[playerId].filter(l => l.date === date).map(l => Number(l.score));
          if (scores.length)
            row[playerId] = Math.round((scores.reduce((a, b) => a + b, 0) / (scores.length * maxScore)) * 100);
        }
        return row;
      });
    } else if (viewMode === "player") {
      group = groupBy(filteredLogs, "drillId");
      lineKeys = Object.keys(group);
      linesData = allDates.map(date => {
        let row: any = { date };
        for (const drillId of lineKeys) {
          const maxScore = drills.find(d => d.drillId === drillId)?.maxScore || 1;
          const scores = group[drillId].filter(l => l.date === date).map(l => Number(l.score));
          if (scores.length)
            row[drillId] = Math.round((scores.reduce((a, b) => a + b, 0) / (scores.length * maxScore)) * 100);
        }
        return row;
      });
    }
  }

  // For dropdowns
  const drillOptions = [{ drillId: "all", name: "All Drills", maxScore: 1, skillTested: "" }, ...drills];
  const playerOptions = [{ playerId: "all", name: "All Players" }, ...players];

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      <h1 style={{ textAlign: "center", color: "var(--accent)" }}>Training Data</h1>
      <div style={{ textAlign: "center", margin: "1.2em 0 1em 0" }}>
        <button
          className="btn"
          style={{
            borderRadius: 14,
            background: viewMode === "drill" ? "var(--accent)" : "#202f24",
            color: viewMode === "drill" ? "#181F25" : "#ebebeb",
            marginRight: 18,
            boxShadow: viewMode === "drill" ? "0 2px 16px #57efb288" : "none"
          }}
          onClick={() => { setViewMode("drill"); setSelectedPlayer(""); }}
        >
          By Drill
        </button>
        <button
          className="btn"
          style={{
            borderRadius: 14,
            background: viewMode === "player" ? "var(--accent)" : "#202f24",
            color: viewMode === "player" ? "#181F25" : "#ebebeb",
            boxShadow: viewMode === "player" ? "0 2px 16px #57efb288" : "none"
          }}
          onClick={() => { setViewMode("player"); setSelectedDrill(""); }}
        >
          By Player
        </button>
      </div>
      <div style={{ marginBottom: 14 }}>
        {viewMode === "drill" ? (
          <label>
            Drill:<br />
            <select
              value={selectedDrill}
              onChange={e => setSelectedDrill(e.target.value)}
              style={{ minWidth: 180, borderRadius: 10, padding: 6, fontSize: 17, marginTop: 3 }}
            >
              {drillOptions.map(d => (
                <option value={d.drillId} key={d.drillId}>{d.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            Player:<br />
            <select
              value={selectedPlayer}
              onChange={e => setSelectedPlayer(e.target.value)}
              style={{ minWidth: 180, borderRadius: 10, padding: 6, fontSize: 17, marginTop: 3 }}
            >
              {playerOptions.map(p => (
                <option value={p.playerId} key={p.playerId}>{getPlayerName(p)}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Chart */}
      <LineChart
        data={linesData}
        lines={lineKeys}
        xAxisKey="date"
      />

      {/* Table */}
      <div style={{
        background: "#181F25",
        borderRadius: 16,
        padding: "1.2em",
        margin: "1.7em auto 0 auto",
        boxShadow: "0 2px 16px #14321544"
      }}>
        <table style={{
          width: "100%", color: "#ebebeb", borderSpacing: 0,
        }}>
          <thead>
            <tr style={{ color: "var(--accent)" }}>
              <th style={{ paddingBottom: 8 }}>Date</th>
              <th>{viewMode === "drill" ? "Player" : "Drill"}</th>
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
              let percent = "";
              if (drill && drill.maxScore && Number(drill.maxScore) > 0) {
                percent = Math.round((Number(l.score) / Number(drill.maxScore)) * 100) + "%";
              }
              return (
                <tr key={i} style={{ color: "#e7ffe0" }}>
                  <td>{l.date}</td>
                  <td>{viewMode === "drill" ? getPlayerName(player) : getDrillName(drill)}</td>
                  <td>{l.setNumber}</td>
                  <td>{l.score}</td>
                  <td>{percent}</td>
                  <td>{l.notes || ""}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={6} style={{ color: "#fcb0b0", textAlign: "center" }}>
                  No training data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button className="btn fixed-bottom-nav" onClick={onBackToMenu}>
        Return to Main Menu
      </button>
    </div>
  );
}
