import React, { useEffect, useState } from "react";

// Helper: unique player list, get display, color, etc.
function getPlayerDisplayName(p) { return p?.nickname ? p.nickname : p?.name || ""; }
function getPlayerColor(players, playerId) {
  const idx = players.findIndex(p => p.playerId === playerId);
  const COLORS = [
    "#F94144", "#277DA1", "#F3722C", "#4ECDC4", "#F9C74F",
    "#43AA8B", "#577590", "#FF7F51", "#90BE6D", "#D7263D"
  ];
  return COLORS[idx % COLORS.length];
}

export default function MatchHistoryPage({ onBackToMenu }) {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [sessionType, setSessionType] = useState("all");
  const [gameType, setGameType] = useState("all");
  const [editMatchId, setEditMatchId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);

  // Load data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/matches?action=get").then(r => r.json()),
      fetch("/api/getPlayers").then(r => r.json())
    ]).then(([m, p]) => {
      setMatches(m || []);
      setPlayers(p || []);
      setLoading(false);
    });
  }, []);

  // Filtering logic
  let filtered = matches;
  if (dateFrom) filtered = filtered.filter(m => m.date >= dateFrom);
  if (dateTo) filtered = filtered.filter(m => m.date <= dateTo);
  if (selectedPlayers.length > 0) {
    filtered = filtered.filter(m =>
      selectedPlayers.includes(m.playerAId) || selectedPlayers.includes(m.playerBId)
    );
  }
  if (sessionType !== "all") filtered = filtered.filter(m => m.sessionType === sessionType);
  if (gameType !== "all") filtered = filtered.filter(m => m.gameType === gameType);

  // Sort: newest first
  filtered = filtered.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // --- Edit logic ---
  function startEdit(m) {
    setEditMatchId(m.matchId);
    setEditData({
      winnerId: m.winnerId,
      scoreA: m.scoreA || "",
      scoreB: m.scoreB || "",
      runout: m.runout || "",
      runoutA: m.runoutA || "",
      runoutB: m.runoutB || "",
      gameType: m.gameType || "",
      sessionType: m.sessionType || "",
    });
  }
  async function handleSaveEdit(m) {
    const body = { action: "edit", matchId: m.matchId, ...editData };
    const resp = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const res = await resp.json();
    if (res.success) {
      setEditMatchId(null);
      setEditData({});
      await fetch("/api/recalculateElo", { method: "POST" });
      const mm = await fetch("/api/matches?action=get").then(r => r.json());
      setMatches(mm || []);
    } else {
      alert("Error: " + (res.error || "Unknown error"));
    }
  }
  // Delete logic
  async function handleDelete(m) {
    const body = { action: "delete", matchId: m.matchId };
    const resp = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const res = await resp.json();
    if (res.success) {
      setShowConfirmDelete(null);
      await fetch("/api/recalculateElo", { method: "POST" });
      const mm = await fetch("/api/matches?action=get").then(r => r.json());
      setMatches(mm || []);
    } else {
      alert("Error: " + (res.error || "Unknown error"));
    }
  }

  // --- UI ---
  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg-gradient)" }}>
      <div className="page-container" style={{ width: "100%", maxWidth: 860, marginTop: 0, marginBottom: 32 }}>
        <h1 style={{ color: "var(--accent)", textAlign: "center", marginBottom: 16 }}>Match History</h1>
        {loading ? (
          <div style={{ textAlign: "center", color: "#aaffc6", padding: 24 }}>Loading...</div>
        ) : (
          <>
            {/* Filters */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center",
              marginBottom: 18, justifyContent: "space-between"
            }}>
              <div>
                <label>Date<br />
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ marginRight: 4 }} />
                  <span style={{ color: "#91dda1" }}>to</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ marginLeft: 4 }} />
                </label>
              </div>
              <div>
                <label>Players<br />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {players.map((p, idx) => {
                      const checked = selectedPlayers.includes(p.playerId);
                      return (
                        <label key={p.playerId} style={{
                          display: "flex", alignItems: "center", padding: "2px 8px",
                          background: checked ? "var(--accent-glow)" : "transparent",
                          borderRadius: 8, color: checked ? "#181F25" : "var(--text-light)",
                          fontWeight: checked ? 700 : 400, cursor: "pointer"
                        }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedPlayers(checked
                                ? selectedPlayers.filter(id => id !== p.playerId)
                                : [...selectedPlayers, p.playerId]);
                            }}
                            style={{ marginRight: 7 }}
                          />
                          {getPlayerDisplayName(p)}
                        </label>
                      );
                    })}
                  </div>
                </label>
              </div>
              <div>
                <label>Session Type<br />
                  <select value={sessionType} onChange={e => setSessionType(e.target.value)} style={{ width: 92 }}>
                    <option value="all">All</option>
                    <option value="1v1">1v1</option>
                    <option value="race">Race</option>
                  </select>
                </label>
              </div>
              <div>
                <label>Game Type<br />
                  <select value={gameType} onChange={e => setGameType(e.target.value)} style={{ width: 92 }}>
                    <option value="all">All</option>
                    <option value="8 ball">8 ball</option>
                    <option value="9 ball">9 ball</option>
                    <option value="10 ball">10 ball</option>
                  </select>
                </label>
              </div>
            </div>
            {/* Table */}
            <div style={{
              width: "100%", overflowX: "auto", margin: "0 auto",
              marginBottom: 18
            }}>
              <table style={{
                width: "100%", borderCollapse: "collapse", background: "#1a232b",
                borderRadius: 12, overflow: "hidden"
              }}>
                <thead>
                  <tr style={{ color: "#8affb1", background: "#212c25" }}>
                    <th style={{ padding: 6, minWidth: 70 }}>Date</th>
                    <th style={{ padding: 6 }}>Player A</th>
                    <th style={{ padding: 6 }}>Player B</th>
                    <th style={{ padding: 6 }}>Winner</th>
                    <th style={{ padding: 6 }}>Session Type</th>
                    <th style={{ padding: 6 }}>Game</th>
                    <th style={{ padding: 6 }}>Score</th>
                    <th style={{ padding: 6 }}>Edit</th>
                    <th style={{ padding: 6 }}>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => {
                    // Winner (with star if runout for 1v1)
                    let winnerName = getPlayerDisplayName(players.find(p => p.playerId === m.winnerId));
                    if (m.sessionType === "1v1" && m.runout === "Y") winnerName += " ⭐️";
                    // Player names
                    const playerA = players.find(p => p.playerId === m.playerAId);
                    const playerB = players.find(p => p.playerId === m.playerBId);
                    // Score
                    let scoreStr = "-";
                    if (m.sessionType === "race") {
                      let aRun = m.runoutA > 0 ? ` (${m.runoutA})` : "";
                      let bRun = m.runoutB > 0 ? ` (${m.runoutB})` : "";
                      scoreStr = `${m.scoreA || 0}${aRun} – ${m.scoreB || 0}${bRun}`;
                    }
                    return (
                      <tr key={m.matchId + i} style={{
                        color: i % 2 ? "#d6ffd9" : "#abf7e3",
                        background: i % 2 ? "#182427" : "#172227"
                      }}>
                        <td style={{ padding: 5 }}>{m.date}</td>
                        <td style={{ padding: 5, color: playerA?.color || "#fff" }}>{getPlayerDisplayName(playerA)}</td>
                        <td style={{ padding: 5, color: playerB?.color || "#fff" }}>{getPlayerDisplayName(playerB)}</td>
                        <td style={{ padding: 5 }}>{winnerName}</td>
                        <td style={{ padding: 5 }}>{m.sessionType}</td>
                        <td style={{ padding: 5 }}>{m.gameType}</td>
                        <td style={{ padding: 5 }}>{scoreStr}</td>
                        <td style={{ padding: 5 }}>
                          {editMatchId === m.matchId ? (
                            <>
                              <select value={editData.winnerId} onChange={e => setEditData({ ...editData, winnerId: e.target.value })}>
                                {[playerA, playerB].map(p =>
                                  <option key={p.playerId} value={p.playerId}>{getPlayerDisplayName(p)}</option>
                                )}
                              </select>
                              {m.sessionType === "race" && (
                                <>
                                  <input
                                    type="number"
                                    style={{ width: 36, marginLeft: 3 }}
                                    value={editData.scoreA}
                                    onChange={e => setEditData({ ...editData, scoreA: e.target.value })}
                                  />
                                  <input
                                    type="number"
                                    style={{ width: 36, marginLeft: 3 }}
                                    value={editData.scoreB}
                                    onChange={e => setEditData({ ...editData, scoreB: e.target.value })}
                                  />
                                  <input
                                    type="number"
                                    style={{ width: 34, marginLeft: 3 }}
                                    value={editData.runoutA}
                                    onChange={e => setEditData({ ...editData, runoutA: e.target.value })}
                                    placeholder="A runout"
                                    min={0}
                                  />
                                  <input
                                    type="number"
                                    style={{ width: 34, marginLeft: 3 }}
                                    value={editData.runoutB}
                                    onChange={e => setEditData({ ...editData, runoutB: e.target.value })}
                                    placeholder="B runout"
                                    min={0}
                                  />
                                </>
                              )}
                              {m.sessionType === "1v1" && (
                                <>
                                  <label style={{ marginLeft: 7 }}>
                                    <input
                                      type="checkbox"
                                      checked={editData.runout === "Y"}
                                      onChange={e => setEditData({ ...editData, runout: e.target.checked ? "Y" : "" })}
                                    /> Runout
                                  </label>
                                </>
                              )}
                              <button style={{ marginLeft: 5, color: "#21fa93" }} onClick={() => handleSaveEdit(m)}>Save</button>
                              <button style={{ marginLeft: 5, color: "#ffb7b7" }} onClick={() => setEditMatchId(null)}>Cancel</button>
                            </>
                          ) : (
                            <button style={{ color: "#1cf991" }} onClick={() => startEdit(m)}>Edit</button>
                          )}
                        </td>
                        <td style={{ padding: 5 }}>
                          <button style={{ color: "#ff8080" }} onClick={() => setShowConfirmDelete(m.matchId)}>Delete</button>
                          {showConfirmDelete === m.matchId && (
                            <span style={{ marginLeft: 10 }}>
                              Confirm?
                              <button style={{ color: "#1cf991", marginLeft: 5 }} onClick={() => handleDelete(m)}>Yes</button>
                              <button style={{ color: "#fff", marginLeft: 5 }} onClick={() => setShowConfirmDelete(null)}>No</button>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filtered.length && (
                <div style={{ color: "#fcb0b0", textAlign: "center", margin: 16 }}>
                  No matches found for the selected filters.
                </div>
              )}
            </div>
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
