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
  const [filterPlayer, setFilterPlayer] = useState<string>("");

  // Data
  const [chartData, setChartData] = useState<any[]>([]);
  const [playerStats, setPlayerStats] = useState<{ [playerId: string]: any }>({});
  const [currentDrillName, setCurrentDrillName] = useState<string>("");

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

  // Utility: lookup drill by ID
  function drillById(id: string): Drill | undefined {
    return drills.find(d => d.DrillID === id);
  }

  // Recalc on filter change
  useEffect(() => {
    // No filters? Show "select filter" prompt
    if (!selectedDrill && !filterPlayer) {
      setChartData([]);
      setPlayerStats({});
      setCurrentDrillName("");
      return;
    }

    // Filter logs by drill (unless all drills) and by player (unless all players)
    let filtered = logs as TrainingLog[];
    if (selectedDrill) filtered = filtered.filter(l => l.DrillID === selectedDrill);
    if (filterPlayer) filtered = filtered.filter(l => l.PlayerID === filterPlayer);
    if (dateFrom) filtered = filtered.filter(l => l.Date >= dateFrom);
    if (dateTo) filtered = filtered.filter(l => l.Date <= dateTo);

    // Group by player & drill & date (session)
    const group: { [playerId: string]: { [drillId: string]: { [date: string]: number[] } } } = {};
    filtered.forEach(l => {
      if (!group[l.PlayerID]) group[l.PlayerID] = {};
      if (!group[l.PlayerID][l.DrillID]) group[l.PlayerID][l.DrillID] = {};
      if (!group[l.PlayerID][l.DrillID][l.Date]) group[l.PlayerID][l.DrillID][l.Date] = [];
      group[l.PlayerID][l.DrillID][l.Date].push(Number(l.Score));
    });

    // What drills/players to show on chart
    const allPlayerIds =
      filterPlayer
        ? [filterPlayer]
        : (selectedPlayers.length
            ? selectedPlayers
            : Array.from(new Set(filtered.map(l => l.PlayerID))));

    const allDrillIds =
      selectedDrill
        ? [selectedDrill]
        : Array.from(new Set(filtered.map(l => l.DrillID)));

    // If "all drills" AND filterPlayer, chart across drills for that player (lines: one per drill)
    // If "all drills" AND no filterPlayer, do nothing (no chart)
    // If drill selected, chart lines are players (or player if filter set)

    let chartRows: any[] = [];
    let stats: { [key: string]: any } = {};

    if (!selectedDrill && filterPlayer) {
      // All drills for one player: lines = drills, x = date
      const drillLines = allDrillIds;
      const dates = Array.from(new Set(filtered.map(l => l.Date))).sort();

      chartRows = dates.map(date => {
        const row: any = { date };
        drillLines.forEach(did => {
          const scores = group[filterPlayer]?.[did]?.[date] || [];
          const max = Number(drillById(did)?.MaxScore || 0) * scores.length;
          const total = scores.reduce((a, b) => a + b, 0);
          row[did] = max > 0 ? Math.round((total / max) * 1000) / 10 : null;
        });
        return row;
      });

      drillLines.forEach(did => {
        const sessions = group[filterPlayer]?.[did] || {};
        const percentages: number[] = [];
        Object.values(sessions).forEach(scoreArr => {
          const max = Number(drillById(did)?.MaxScore || 0) * (scoreArr as number[]).length;
          const total = (scoreArr as number[]).reduce((a, b) => a + b, 0);
          percentages.push(max > 0 ? (total / max) * 100 : 0);
        });
        stats[did] = {
          attempts: percentages.length,
          avg: percentages.length ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length * 10) / 10 : 0,
          best: percentages.length ? Math.round(Math.max(...percentages) * 10) / 10 : 0,
          recent: percentages.length ? Math.round(percentages[percentages.length - 1] * 10) / 10 : 0,
        };
      });

      setCurrentDrillName(""); // Hide heading
    } else if (selectedDrill) {
      // Drill selected: lines = players, x = date
      const playerLines = allPlayerIds;
      const dates = Array.from(new Set(filtered.map(l => l.Date))).sort();

      chartRows = dates.map(date => {
        const row: any = { date };
        playerLines.forEach(pid => {
          const scores = group[pid]?.[selectedDrill]?.[date] || [];
          const max = Number(drillById(selectedDrill)?.MaxScore || 0) * scores.length;
          const total = scores.reduce((a, b) => a + b, 0);
          row[pid] = max > 0 ? Math.round((total / max) * 1000) / 10 : null;
        });
        return row;
      });

      playerLines.forEach(pid => {
        const sessions = group[pid]?.[selectedDrill] || {};
        const percentages: number[] = [];
        Object.values(sessions).forEach(scoreArr => {
          const max = Number(drillById(selectedDrill)?.MaxScore || 0) * (scoreArr as number[]).length;
          const total = (scoreArr as number[]).reduce((a, b) => a + b, 0);
          percentages.push(max > 0 ? (total / max) * 100 : 0);
        });
        stats[pid] = {
          attempts: percentages.length,
          avg: percentages.length ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length * 10) / 10 : 0,
          best: percentages.length ? Math.round(Math.max(...percentages) * 10) / 10 : 0,
          recent: percentages.length ? Math.round(percentages[percentages.length - 1] * 10) / 10 : 0,
        };
      });

      setCurrentDrillName(drillById(selectedDrill)?.Name || "");
    } else {
      // no chart possible
      chartRows = [];
      stats = {};
      setCurrentDrillName("");
    }

    setChartData(chartRows);
    setPlayerStats(stats);
  }, [selectedDrill, selectedPlayers, dateFrom, dateTo, logs, drills, filterPlayer]);

  // Player color helper
  function getColor(idx: number) {
    return COLORS[idx % COLORS.length];
  }
  function playerColor(pid: string) {
    const idx = players.findIndex(p => p.playerId === pid);
    return getColor(idx >= 0 ? idx : 0);
  }
  function drillColor(did: string) {
    const idx = drills.findIndex(d => d.DrillID === did);
    return getColor(idx >= 0 ? idx : 0);
  }

  // Get drill options
  const drillOptions = drills.map(d => ({ value: d.DrillID, label: `${d.Name} — ${d.skillTested}` }));

  // Get player options (filtered by drill)
  const drillPlayerIds = selectedDrill
    ? Array.from(new Set(logs.filter(l => l.DrillID === selectedDrill).map(l => l.PlayerID)))
    : Array.from(new Set(logs.map(l => l.PlayerID)));
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
            {/* FILTERS ROW */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center",
              marginBottom: 18, justifyContent: "flex-start"
            }}>
              {/* Drill Filter */}
              <div style={{ flex: 2, minWidth: 180 }}>
                <label>Drill<br />
                  <select
                    value={selectedDrill}
                    onChange={e => { setSelectedDrill(e.target.value); setSelectedPlayers([]); }}
                    style={{ width: "100%", minWidth: 160 }}
                  >
                    <option value="">All Drills</option>
                    {drillOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
              {/* Player Filter (SINGLE) */}
              <div style={{ flex: 2, minWidth: 160 }}>
                <label>Player<br />
                  <select
                    value={filterPlayer}
                    onChange={e => setFilterPlayer(e.target.value)}
                    style={{ width: "100%", minWidth: 160 }}
                  >
                    <option value="">All Players</option>
                    {players.map(p => (
                      <option key={p.playerId} value={p.playerId}>
                        {getPlayerDisplayName(p)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {/* Multi-select Player (keep for when All Player is chosen) */}
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
                          disabled={!!filterPlayer} // If single-player filter, disable multi
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
              {/* Date range */}
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
            {/* --- CHART & STATS --- */}
            {(!selectedDrill && !filterPlayer) && (
              <div style={{ color: "#ffefb5", textAlign: "center", margin: 12 }}>
                Please select a drill or player to view data.
              </div>
            )}
            {(selectedDrill || filterPlayer) && chartData.length === 0 && (
              <div style={{ color: "#fcb0b0", textAlign: "center", margin: 16 }}>
                No training data for this drill/player/filter.
              </div>
            )}
            {(selectedDrill || filterPlayer) && chartData.length > 0 && (
              <>
                <div style={{ width: "100%", height: isMobile ? 240 : 320, marginBottom: 16 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} tickFormatter={v => v + "%"} />
                      <Tooltip formatter={(v: any) => `${v}%`} />
                      <Legend />
                      {/* CHART LINES */}
                      {selectedDrill
                        ? ( // Drill selected: players as lines
                          players
                            .filter(p => !filterPlayer || p.playerId === filterPlayer)
                            .filter(p => chartData.some(row => row[p.playerId] !== null))
                            .map((p, idx) => (
                              <Line
                                key={p.playerId}
                                type="monotone"
                                dataKey={p.playerId}
                                name={getPlayerDisplayName(p)}
                                stroke={playerColor(p.playerId)}
                                strokeWidth={2}
                                dot={{ r: 2 }}
                                isAnimationActive={false}
                                connectNulls
                              />
                            ))
                        )
                        : ( // All drills for player: lines = drills
                          drills
                            .filter(d => chartData.some(row => row[d.DrillID] !== null))
                            .map((d, idx) => (
                              <Line
                                key={d.DrillID}
                                type="monotone"
                                dataKey={d.DrillID}
                                name={`${d.Name}`}
                                stroke={drillColor(d.DrillID)}
                                strokeWidth={2}
                                dot={{ r: 2 }}
                                isAnimationActive={false}
                                connectNulls
                              />
                            ))
                        )
                      }
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
                  maxWidth: 400,
                  marginLeft: "auto",
                  marginRight: "auto"
                }}>
                  {/* STATS: show per-player for drill, or per-drill for player */}
                  {selectedDrill
                    ? (players
                        .filter(p => !filterPlayer || p.playerId === filterPlayer)
                        .filter(p => playerStats[p.playerId])
                        .map((p, idx) => (
                          <div key={p.playerId} style={{
                            minWidth: 160, background: "#1c292a", borderRadius: 14, padding: "13px 15px",
                            boxShadow: "0 2px 12px #39ecb534", color: playerColor(p.playerId)
                          }}>
                            <div style={{ fontWeight: 700, fontSize: "1.08em", color: "#d6ffd9" }}>
                              {getPlayerDisplayName(p)}
                            </div>
                            <div style={{ fontSize: "1.0em", marginTop: 4 }}>
                              <b>Attempts:</b> <span style={{ color: "#b9ffe0" }}>{playerStats[p.playerId]?.attempts || 0}</span><br />
                              <b>Average:</b> <span style={{ color: "#aaffb7" }}>{playerStats[p.playerId]?.avg ?? 0}%</span><br />
                              <b>Best:</b> <span style={{ color: "#fffa9d" }}>{playerStats[p.playerId]?.best ?? 0}%</span><br />
                              <b>Recent:</b> <span style={{ color: "#ffd4d6" }}>{playerStats[p.playerId]?.recent ?? 0}%</span>
                            </div>
                          </div>
                        ))
                    )
                    : (filterPlayer &&
                        drills
                          .filter(d => playerStats[d.DrillID])
                          .map((d, idx) => (
                            <div key={d.DrillID} style={{
                              minWidth: 160, background: "#1c292a", borderRadius: 14, padding: "13px 15px",
                              boxShadow: "0 2px 12px #39ecb534", color: drillColor(d.DrillID)
                            }}>
                              <div style={{ fontWeight: 700, fontSize: "1.08em", color: "#d6ffd9" }}>
                                {d.Name}
                              </div>
                              <div style={{ fontSize: "1.0em", marginTop: 4 }}>
                                <b>Attempts:</b> <span style={{ color: "#b9ffe0" }}>{playerStats[d.DrillID]?.attempts || 0}</span><br />
                                <b>Average:</b> <span style={{ color: "#aaffb7" }}>{playerStats[d.DrillID]?.avg ?? 0}%</span><br />
                                <b>Best:</b> <span style={{ color: "#fffa9d" }}>{playerStats[d.DrillID]?.best ?? 0}%</span><br />
                                <b>Recent:</b> <span style={{ color: "#ffd4d6" }}>{playerStats[d.DrillID]?.recent ?? 0}%</span>
                              </div>
                            </div>
                          ))
                      )
                  }
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
