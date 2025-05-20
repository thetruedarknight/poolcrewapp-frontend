import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

// Helper
function getPlayerDisplayName(player) {
  return player?.nickname ? player.nickname : player?.name || "";
}
function getAvatar(player) {
  return player?.avatarUrl
    ? <img src={player.avatarUrl} alt={getPlayerDisplayName(player)} style={{
        width: 58, height: 58, borderRadius: "50%", objectFit: "cover",
        border: `3px solid ${player?.color || "#222"}`,
        background: "#222"
      }} />
    : (
      <div style={{
        width: 58, height: 58, borderRadius: "50%",
        background: player?.color || "#282828", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: "1.55em", border: `3px solid #222`
      }}>
        {getPlayerDisplayName(player).substring(0, 1)}
      </div>
    );
}
function getDonutData(stats, playerA, playerB) {
  return [
    { name: getPlayerDisplayName(playerA), value: stats?.[playerA?.playerId]?.wins || 0 },
    { name: getPlayerDisplayName(playerB), value: stats?.[playerB?.playerId]?.wins || 0 }
  ];
}

export default function HeadToHeadPage({ onBackToMenu }) {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [stats, setStats] = useState({});
  const [streak, setStreak] = useState({});

  // Load players and matches
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/getPlayers").then(r => r.json()),
      fetch("/api/matches?action=get").then(r => r.json())
    ]).then(([p, m]) => {
      setPlayers(p || []);
      setMatches(m || []);
      setLoading(false);
    });
  }, []);

  // When playerA/B selected, filter matches and compute stats
  useEffect(() => {
    if (!playerAId || !playerBId || playerAId === playerBId) {
      setFiltered([]);
      setStats({});
      setStreak({});
      return;
    }
    // Only matches between A and B
    const vsMatches = matches
      .filter(m =>
        (m.playerAId === playerAId && m.playerBId === playerBId) ||
        (m.playerAId === playerBId && m.playerBId === playerAId)
      )
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")); // Newest first

    setFiltered(vsMatches);

    // Stats calc
    let statsObj = {
      [playerAId]: { wins: 0, racks: 0, runouts: 0 },
      [playerBId]: { wins: 0, racks: 0, runouts: 0 }
    };
    vsMatches.forEach(m => {
      if (m.winnerId === playerAId) statsObj[playerAId].wins++;
      if (m.winnerId === playerBId) statsObj[playerBId].wins++;
      // Add racks/games
      if (m.sessionType === "race") {
        const aScore = Number(m.scoreA || 0);
        const bScore = Number(m.scoreB || 0);
        if (m.playerAId === playerAId) {
          statsObj[playerAId].racks += aScore;
          statsObj[playerBId].racks += bScore;
          statsObj[playerAId].runouts += Number(m.runoutA || 0);
          statsObj[playerBId].runouts += Number(m.runoutB || 0);
        } else {
          statsObj[playerBId].racks += aScore;
          statsObj[playerAId].racks += bScore;
          statsObj[playerBId].runouts += Number(m.runoutA || 0);
          statsObj[playerAId].runouts += Number(m.runoutB || 0);
        }
      }
      if (m.sessionType === "1v1") {
        if (m.winnerId === playerAId) statsObj[playerAId].racks++;
        if (m.winnerId === playerBId) statsObj[playerBId].racks++;
        if (m.runout === "Y") {
          if (m.winnerId === playerAId) statsObj[playerAId].runouts++;
          if (m.winnerId === playerBId) statsObj[playerBId].runouts++;
        }
      }
    });

    setStats(statsObj);

    // Streak calc
    const ordered = [...vsMatches].reverse();
    let curr = null, streakCt = 0;
    for (let m of ordered) {
      if (!m.winnerId) continue;
      if (curr === null) { curr = m.winnerId; streakCt = 1; }
      else if (curr === m.winnerId) { streakCt++; }
      else { curr = m.winnerId; streakCt = 1; }
    }
    if (curr === playerAId) setStreak({ who: "A", count: streakCt });
    else if (curr === playerBId) setStreak({ who: "B", count: streakCt });
    else setStreak({ who: null, count: 0 });

  }, [playerAId, playerBId, matches]);

  // Chart data
  const playerA = players.find(p => p.playerId === playerAId);
  const playerB = players.find(p => p.playerId === playerBId);
  const total = (stats?.[playerAId]?.wins || 0) + (stats?.[playerBId]?.wins || 0);

  // Chart color mapping (player color or fallback)
  const donutColors = [
    playerA?.color || "#39ecb5",
    playerB?.color || "#f3722c"
  ];

  // --- UI ---
  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg-gradient)" }}>
      <div className="page-container" style={{ width: "100%", maxWidth: 700, marginTop: 0, marginBottom: 30 }}>
        <h1 style={{ color: "var(--accent)", textAlign: "center", marginBottom: 12 }}>Head to Head Comparison</h1>
        {loading ? (
          <div style={{ textAlign: "center", color: "#aaffc6", padding: 24 }}>Loading data...</div>
        ) : (
          <>
            <div style={{
              display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 24
            }}>
              <div style={{ flex: 2, minWidth: 160 }}>
                <label>Player A<br />
                  <select
                    value={playerAId}
                    onChange={e => setPlayerAId(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="">Select...</option>
                    {players.filter(p => p.playerId !== playerBId).map(p => (
                      <option key={p.playerId} value={p.playerId}>
                        {getPlayerDisplayName(p)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div style={{
                flex: 1, textAlign: "center", fontWeight: 700,
                fontSize: "1.25em", padding: "0 6px"
              }}>VS</div>
              <div style={{ flex: 2, minWidth: 160 }}>
                <label>Player B<br />
                  <select
                    value={playerBId}
                    onChange={e => setPlayerBId(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="">Select...</option>
                    {players.filter(p => p.playerId !== playerAId).map(p => (
                      <option key={p.playerId} value={p.playerId}>
                        {getPlayerDisplayName(p)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            {playerAId && playerBId && playerAId !== playerBId && (
              <>
                {/* Avatars and Donut chart - NEW LAYOUT */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 0, marginBottom: 6, width: "100%", textAlign: "center"
                }}>
                  <div style={{
                    flex: 1, minWidth: 90, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center"
                  }}>
                    {getAvatar(playerA)}
                    <div style={{ marginTop: 6, color: playerA?.color || "#fff", fontWeight: 700 }}>
                      {getPlayerDisplayName(playerA)}
                    </div>
                  </div>
                  <div style={{
                    flex: 2, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
                  }}>
                    <div style={{
                      width: 160, height: 140, display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <ResponsiveContainer width={160} height={120}>
                        <PieChart>
                          <Pie
                            data={getDonutData(stats, playerA, playerB)}
                            dataKey="value"
                            cx="50%"
                            cy="55%"
                            innerRadius={32}
                            outerRadius={54}
                            startAngle={90}
                            endAngle={-270}
                            label={({ value }) =>
                              total ? `${Math.round((value / total) * 100)}%` : "0%"
                            }
                            labelLine={false}
                          >
                            {getDonutData(stats, playerA, playerB).map((entry, i) =>
                              <Cell key={i} fill={donutColors[i]} />
                            )}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-row items-center justify-center gap-5" style={{ marginTop: 0 }}>
                      {[playerA, playerB].map((p, i) => (
                        <span key={p?.playerId} style={{
                          display: "inline-flex", alignItems: "center", fontWeight: 600,
                          color: p?.color || (i === 0 ? "#39ecb5" : "#f3722c"), margin: "0 6px"
                        }}>
                          <span style={{
                            display: "inline-block", width: 13, height: 13, borderRadius: "50%",
                            background: p?.color || (i === 0 ? "#39ecb5" : "#f3722c"),
                            marginRight: 6, border: "2px solid #223629"
                          }}></span>
                          {getPlayerDisplayName(p)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{
                    flex: 1, minWidth: 90, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center"
                  }}>
                    {getAvatar(playerB)}
                    <div style={{ marginTop: 6, color: playerB?.color || "#fff", fontWeight: 700 }}>
                      {getPlayerDisplayName(playerB)}
                    </div>
                  </div>
                </div>
                {/* Stats grid */}
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 15, justifyContent: "center",
                  marginBottom: 16
                }}>
                  {[playerA, playerB].map((p, idx) => (
                    <div key={p?.playerId || idx} style={{
                      minWidth: 170, background: "#1c292a", borderRadius: 14, padding: "10px 14px",
                      color: p?.color || "#d6ffd9", marginBottom: 6
                    }}>
                      <div style={{ fontWeight: 700, fontSize: "1.08em", color: "#d6ffd9", marginBottom: 6 }}>
                        {getPlayerDisplayName(p)}
                      </div>
                      <div><b>Wins:</b> {stats[p?.playerId]?.wins || 0} / {total} ({total ? Math.round((stats[p?.playerId]?.wins || 0) / total * 100) : 0}%)</div>
                      <div><b>Total racks:</b> {stats[p?.playerId]?.racks || 0}</div>
                      <div><b>Runouts:</b> {stats[p?.playerId]?.runouts || 0}</div>
                      <div>
                        <b>Current streak:</b>{" "}
                        {streak.who === (idx === 0 ? "A" : "B") && streak.count > 1
                          ? <b style={{ color: "#ffe600" }}>{streak.count} in a row</b>
                          : streak.who === (idx === 0 ? "A" : "B") && streak.count === 1
                            ? <b style={{ color: "#ffe600" }}>1 (last match)</b>
                            : "-"}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Matches table */}
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
                        <th style={{ padding: 6 }}>Winner</th>
                        <th style={{ padding: 6 }}>Type</th>
                        <th style={{ padding: 6 }}>Game</th>
                        <th style={{ padding: 6 }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((m, i) => {
                        let winnerName = getPlayerDisplayName(players.find(p => p.playerId === m.winnerId));
                        if (m.sessionType === "1v1" && m.runout === "Y") winnerName += " ⭐️";
                        let scoreStr = "-";
                        if (m.sessionType === "race") {
                          let aScore = m.playerAId === playerAId ? m.scoreA : m.scoreB;
                          let bScore = m.playerBId === playerBId ? m.scoreB : m.scoreA;
                          let aRun = m.playerAId === playerAId ? m.runoutA : m.runoutB;
                          let bRun = m.playerBId === playerBId ? m.runoutB : m.runoutA;
                          scoreStr =
                            `${aScore}${aRun > 0 ? ` (${aRun})` : ""} – ${bScore}${bRun > 0 ? ` (${bRun})` : ""}`;
                        }
                        return (
                          <tr key={m.matchId + i} style={{
                            color: i % 2 ? "#d6ffd9" : "#abf7e3",
                            background: i % 2 ? "#182427" : "#172227"
                          }}>
                            <td style={{ padding: 5 }}>{m.date}</td>
                            <td style={{ padding: 5 }}>{winnerName}</td>
                            <td style={{ padding: 5 }}>{m.sessionType}</td>
                            <td style={{ padding: 5 }}>{m.gameType}</td>
                            <td style={{ padding: 5 }}>{scoreStr}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!filtered.length && (
                    <div style={{ color: "#fcb0b0", textAlign: "center", margin: 16 }}>
                      No matches played between these players.
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
        <button
          className="btn"
          style={{ width: "100%", marginTop: 22, background: "#273036", color: "#fff" }}
          onClick={onBackToMenu}
        >Return to Main Menu</button>
      </div>
    </div>
  );
}
