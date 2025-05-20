import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Helper types
type Player = { playerId: string, name: string, nickname?: string, color?: string };
type Drill = { DrillID: string, Name: string, MaxScore: string, skillTested: string };
type TrainingLog = {
  Date: string,
  SessionID: string,
  DrillID: string,
  PlayerID: string,
  SetNumber: string,
  Score: string,
  Notes?: string
};

// Helper
function getPlayerDisplayName(p: Player) {
  return p.nickname ? `${p.nickname}` : p.name;
}

// Main
const COLORS = [
  "#F94144", "#277DA1", "#F3722C", "#4ECDC4", "#F9C74F",
  "#43AA8B", "#577590", "#FF7F51", "#90BE6D", "#D7263D"
];

export default function ViewTrainingDataPage({ onBackToMenu }: { onBackToMenu: () => void }) {
  // State
  const [drills, setDrills] = useState<Drill[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDrill, setSelectedDrill] = useState<string>("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Data
  const [chartData, setChartData] = useState<any[]>([]);
  const [playerStats, setPlayerStats] = useState<{ [playerId: string]: any }>({});

  // Load everything on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/getDrills").then(r => r.json()),
      fetch("/api/getPlayers").then(r => r.json()),
      fetch("/api/getTrainingLogs").then(r => r.json())
    ]).then(([drillRows, playerRows, logRows]) => {
      setDrills(drillRows || []);
      setPlayers(playerRows || []);
      setLogs(logRows || []);
      setLoading(false);
    });
  }, []);

  // Recalc on filter change
  useEffect(() => {
    if (!selectedDrill) { setChartData([]); setPlayerStats({}); return; }
    const drill = drills.find(d => d.DrillID === selectedDrill);
    if (!drill) return;

    // Filter logs
    let filtered = logs.filter(l => l.DrillID === selectedDrill);
    if (selectedPlayers.length)
      filtered = filtered.filter(l => selectedPlayers.includes(l.PlayerID));
    if (dateFrom)
      filtered = filtered.filter(l => l.Date >= dateFrom);
    if (dateTo)
      filtered = filtered.filter(l => l.Date <= dateTo);

    // Group by player & date (session)
    const group: { [playerId: string]: { [date: string]: number[] } } = {};
    filtered.forEach(l => {
      if (!group[l.PlayerID]) group[l.PlayerID] = {};
      if (!group[l.PlayerID][l.Date]) group[l.PlayerID][l.Date] = [];
      group[l.PlayerID][l.Date].push(Number(l.Score));
    });

    // For chart: Build array of all session dates
    const allDates = Array.from(new Set(filtered.map(l => l.Date))).sort();
    const allPlayerIds = selectedPlayers.length
      ? selectedPlayers
      : Array.from(new Set(filtered.map(l => l.PlayerID)));

    // Build chart rows: each row is { date, [playerId]: % }
    const rows = allDates.map(date => {
      const row: any = { date };
      allPlayerIds.forEach((pid, idx) => {
        if (group[pid] && group[pid][date]) {
          // Average % for this session (sum of all sets / max * count)
          const total = group[pid][date].reduce((a, b) => a + b, 0);
          const max = Number(drill.MaxScore) * group[pid][date].length;
          row[pid] = max > 0 ? Math.round((total / max) * 1000) / 10 : 0;
        } else {
          row[pid] = null;
        }
      });
      return row;
    });

    // Stats per player
    const stats: { [playerId: string]: any } = {};
    allPlayerIds.forEach(pid => {
      const playerSessions = group[pid] || {};
      const percentages: number[] = [];
      Object.values(playerSessions).forEach(scoreArr => {
        const total = scoreArr.reduce((a, b) => a + b, 0);
        const max = Number(drill.MaxScore) * scoreArr.length;
        percentages.push(max > 0 ? (total / max) * 100 : 0);
      });
      if (percentages.length) {
        stats[pid] = {
          attempts: percentages.length,
          avg: Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length * 10) / 10,
          best: Math.round(Math.max(...percentages) * 10) / 10,
          recent: Math.round(percentages[percentages.length - 1] * 10) / 10,
        };
      } else {
        stats[pid] = { attempts: 0, avg: 0, best: 0, recent: 0 };
      }
    });

    setChartData(rows);
    setPlayerStats(stats);

  }, [selectedDrill, selectedPlayers, dateFrom, dateTo, logs, drills]);

  // Player color helper
  function getColor(idx: number) {
    return COLORS[idx % COLORS.length];
  }
  function playerColor(pid: string) {
    const idx = players.findIndex(p => p.playerId === pid);
    return getColor(idx >= 0 ? idx : 0);
  }

  // Get drill options
  const drillOptions = drills.map(d => ({ value: d.DrillID, label: `${d.Name} — ${d.skillTested}` }));

  // Get player options (filtered by drill)
  const drillPlayerIds = Array.from(new Set(logs.filter(l => l.DrillID === selectedDrill).map(l => l.PlayerID)));
  const playerOptions = players
    .filter(p => drillPlayerIds.includes(p.playerId))
    .map(p => ({ value: p.playerId, label: getPlayerDisplayName(p) }));

  // Mobile tip
  const isMobile = window.innerWidth < 600;

  // ---- UI ----
  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg-gradient)" }}>
      <div className="page-container" style={{ width: "100%", maxWidth: 780, marginTop: 0, marginBottom: 32 }}>
        <h1 style={{ color: "var(--accent)", textAlign: "center", marginBottom: 16 }}>View Training Data</h1>
        {loading ? (
          <div style={{ textAlign: "center", color: "#aaffc6", padding: 24 }}>Loading data...</div>
        ) : (
          <>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center",
              marginBottom: 18, justifyContent: "space-between"
            }}>
              <div style={{ flex: 2, minWidth: 210 }}>
                <label>Drill<br />
                  <select
                    value={selectedDrill}
                    onChange={e => { setSelectedDrill(e.target.value); setSelectedPlayers([]); }}
                    style={{ width: "100%", minWidth: 180 }}
                  >
                    <option value="">Select a drill...</option>
                    {drillOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
              <div style={{ flex: 3, minWidth: 180 }}>
                <label>Players<br />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
                    {playerOptions.map((p, idx) => (
                      <label key={p.value} style={{
                        display: "flex", alignItems: "center", padding: "2px 9px",
                        background: selectedPlayers.includes(p.value) ? "var(--accent-glow)" : "transparent",
                        borderRadius: 8, color: selectedPlayers.includes(p.value) ? "#181F25" : "var(--text-light)",
                        fontWeight: selectedPlayers.includes(p.value) ? 700 : 400, cursor: "pointer"
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedPlayers.includes(p.value)}
                          onChange={() => {
                            setSelectedPlayers(selectedPlayers.includes(p.value)
                              ? selectedPlayers.filter(id => id !== p.value)
                              : [...selectedPlayers, p.value]);
                          }}
                          style={{ marginRight: 7 }}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </label>
              </div>
              <div
  style={{
    flex: 2,
    minWidth: 160,
    display: "flex",
    flexDirection: window.innerWidth < 600 ? "column" : "row",
    alignItems: window.innerWidth < 600 ? "flex-start" : "center",
    gap: 6
  }}
>
  <label style={{ width: "100%" }}>
    Date Range
    <div style={{
      display: "flex",
      flexDirection: window.innerWidth < 600 ? "column" : "row",
      gap: window.innerWidth < 600 ? 6 : 4,
      marginTop: 2
    }}>
      <input
        type="date"
        value={dateFrom}
        onChange={e => setDateFrom(e.target.value)}
        style={{ width: "100%", minWidth: 0 }}
      />
      <span style={{
        color: "#91dda1",
        alignSelf: window.innerWidth < 600 ? "center" : "unset",
        margin: window.innerWidth < 600 ? "2px 0" : "0 4px"
      }}>to</span>
      <input
        type="date"
        value={dateTo}
        onChange={e => setDateTo(e.target.value)}
        style={{ width: "100%", minWidth: 0 }}
      />
    </div>
  </label>
</div>

            </div>
            {!selectedDrill && (
              <div style={{ color: "#ffefb5", textAlign: "center", margin: 12 }}>Please select a drill to view data.</div>
            )}
            {selectedDrill && chartData.length === 0 && (
              <div style={{ color: "#fcb0b0", textAlign: "center", margin: 16 }}>No training data for this drill and filter.</div>
            )}
            {selectedDrill && chartData.length > 0 && (
              <>
                <div style={{ width: "100%", height: isMobile ? 240 : 320, marginBottom: 16 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} tickFormatter={v => v + "%"} />
                      <Tooltip formatter={(v: any) => `${v}%`} />
                      <Legend />
                      {playerOptions.map((p, idx) => (
                        <Line
                          key={p.value}
                          type="monotone"
                          dataKey={p.value}
                          name={p.label}
                          stroke={playerColor(p.value)}
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          isAnimationActive={false}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{
  display: "flex",
  flexWrap: "wrap",
  gap: 18,
  marginTop: 10,
  justifyContent: "center",
  width: "100%",
  maxWidth: 400, // Optional: set a max width so it doesn't stretch across the whole page
  marginLeft: "auto",
  marginRight: "auto"
}}>
                  {playerOptions.map((p, idx) => (
                    <div key={p.value} style={{
                      minWidth: 160, background: "#1c292a", borderRadius: 14, padding: "13px 15px",
                      boxShadow: "0 2px 12px #39ecb534", color: playerColor(p.value)
                    }}>
                      <div style={{ fontWeight: 700, fontSize: "1.08em", color: "#d6ffd9" }}>
                        {p.label}
                      </div>
                      <div style={{ fontSize: "1.0em", marginTop: 4 }}>
                        <b>Attempts:</b> <span style={{ color: "#b9ffe0" }}>{playerStats[p.value]?.attempts || 0}</span><br />
                        <b>Average:</b> <span style={{ color: "#aaffb7" }}>{playerStats[p.value]?.avg ?? 0}%</span><br />
                        <b>Best:</b> <span style={{ color: "#fffa9d" }}>{playerStats[p.value]?.best ?? 0}%</span><br />
                        <b>Recent:</b> <span style={{ color: "#ffd4d6" }}>{playerStats[p.value]?.recent ?? 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        <button
          className="btn"
          style={{ width: "100%", marginTop: 26, background: "#273036", color: "#fff" }}
          onClick={onBackToMenu}
        >Return to Main Menu</button>
      </div>
    </div>
  );
}
