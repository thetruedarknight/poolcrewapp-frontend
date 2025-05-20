import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// Helper
function getDisplayName(player) {
  return player.nickname || player.name;
}

export default function PlayerStatsPage({ player, onBackToLeaderboard, onBackToMenu }) {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [ratingHistory, setRatingHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [playersRes, matchesRes, historyRes] = await Promise.all([
        fetch("/api/getPlayers").then(res => res.json()),
        fetch("/api/matches?action=get").then(res => res.json()),
        fetch("/api/getRatingHistory").then(res => res.json())
      ]);
      setPlayers(playersRes);
      setMatches(matchesRes);
      setRatingHistory(historyRes);
      setLoading(false);
    }
    fetchData();
  }, [player.playerId]);

  if (!player) return null;
  if (loading) return <div style={{ color: "#fff", textAlign: "center", marginTop: 36 }}>Loading...</div>;

  // Filter matches for this player
  const playerMatches = matches
    .filter(m => m.playerAId === player.playerId || m.playerBId === player.playerId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Quick stats
  let wins = 0, losses = 0, runouts = 0;
  let oppWinMap = {}, oppLossMap = {};
  let prevResult = null, streak = 0, maxStreak = 0, currentStreakType = "";
  playerMatches.forEach(m => {
    const isWinner = m.winnerId === player.playerId;
    const oppId = m.playerAId === player.playerId ? m.playerBId : m.playerAId;
    if (isWinner) {
      wins += 1;
      oppWinMap[oppId] = (oppWinMap[oppId] || 0) + 1;
      if (prevResult === "W" || prevResult === null) streak += 1;
      else streak = 1;
      prevResult = "W";
    } else {
      losses += 1;
      oppLossMap[oppId] = (oppLossMap[oppId] || 0) + 1;
      if (prevResult === "L" || prevResult === null) streak += 1;
      else streak = 1;
      prevResult = "L";
    }
    // Runouts: For now, let's assume if winner got a runout it's tracked on Players tab already.
  });

  const matchesPlayed = wins + losses;
  const winPercent = matchesPlayed ? Math.round((wins / matchesPlayed) * 100) : 0;

  // Most Wins/Losses vs
  const mostWinsId = Object.keys(oppWinMap).reduce((a, b) => oppWinMap[a] > oppWinMap[b] ? a : b, null);
  const mostLossesId = Object.keys(oppLossMap).reduce((a, b) => oppLossMap[a] > oppLossMap[b] ? a : b, null);

  const mostWinsOpponent = players.find(p => p.playerId === mostWinsId) || { name: mostWinsId || "—", nickname: "" };
  const mostLossesOpponent = players.find(p => p.playerId === mostLossesId) || { name: mostLossesId || "—", nickname: "" };

  // Recent matches (last 10)
  const recentMatches = playerMatches.slice(0, 10);

  // Rating history for this player
  const playerRatings = ratingHistory
    .filter(r => r.playerId === player.playerId)
    .map(r => ({
      date: r.date,
      rating: parseInt(r.rating, 10)
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg-gradient)" }}>
      <div className="page-container" style={{ width: "100%", maxWidth: 520, marginTop: 30, marginBottom: 30 }}>
        <h1 style={{ fontSize: "2em", color: "var(--accent)", textAlign: "center" }}>
          {player.nickname || player.name}
        </h1>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "1.6em 0" }}>
          <img
            src={player.avatarUrl || "https://ui-avatars.com/api/?name=" + encodeURIComponent(player.name)}
            alt={player.name}
            style={{
              width: 96, height: 96, borderRadius: "50%",
              border: `3.5px solid ${player.color}`,
              objectFit: "cover",
              marginBottom: 16,
              background: "#181F25"
            }}
          />
          <div style={{ fontWeight: 600, fontSize: "1.15em", color: player.color }}>
            {player.name}
          </div>
          <div style={{
            fontWeight: 700, color: "#fff", background: player.color, borderRadius: 8,
            padding: "2px 10px", marginTop: 8, fontSize: "1.15em"
          }}>
            Rating: {player["Current Rating"] || player.startingRating}
          </div>
        </div>
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24,
          color: "#fff", fontSize: "1.06em", marginBottom: 20
        }}>
          <div><b>Matches:</b> {matchesPlayed}</div>
          <div><b>Wins:</b> {wins}</div>
          <div><b>Losses:</b> {losses}</div>
          <div><b>Runouts:</b> {player.Runouts || 0}</div>
          <div>
            <b>Most Wins vs:</b>{" "}
            {mostWinsOpponent.nickname
              ? mostWinsOpponent.nickname
              : mostWinsOpponent.name
            }{" "}
            {mostWinsId && `(${oppWinMap[mostWinsId]}W)`}
          </div>
          <div>
            <b>Most Losses vs:</b>{" "}
            {mostLossesOpponent.nickname
              ? mostLossesOpponent.nickname
              : mostLossesOpponent.name
            }{" "}
            {mostLossesId && `(${oppLossMap[mostLossesId]}L)`}
          </div>
          <div>
            <b>Current Streak:</b>{" "}
            {streak > 0
              ? `${streak}${prevResult === "W" ? "W" : "L"}`
              : "—"}
          </div>
          <div><b>Win %:</b> {winPercent}%</div>
        </div>

        {/* Recent Matches Table */}
        <h2 style={{ margin: "1.5em 0 0.5em 0", color: "#fff", fontSize: "1.13em", textAlign: "center" }}>
          Recent Matches
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: "transparent", color: "var(--text-light)", fontSize: "1.05em" }}>
                <th style={{ textAlign: "center", width: 70 }}>Date</th>
                <th style={{ textAlign: "center" }}>Opponent</th>
                <th style={{ textAlign: "center" }}>Race</th>
                <th style={{ textAlign: "center" }}>Score</th>
                <th style={{ textAlign: "center" }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {recentMatches.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#9fa" }}>No matches yet.</td>
                </tr>
              )}
              {recentMatches.map((m, idx) => {
                const opponent = players.find(
                  (p) => p.playerId === (m.playerAId === player.playerId ? m.playerBId : m.playerAId)
                ) || { name: m.playerAId === player.playerId ? m.playerBId : m.playerAId, nickname: "" };
                const playerScore = m.playerAId === player.playerId ? m.scoreA : m.scoreB;
                const oppScore = m.playerAId === player.playerId ? m.scoreB : m.scoreA;
                const isWinner = m.winnerId === player.playerId;
                const result = isWinner ? "Win" : "Loss";
                return (
                  <tr key={idx} style={{ background: "rgba(32,42,48,0.85)" }}>
                    <td style={{ textAlign: "center", fontSize: "1em" }}>{m.date || "—"}</td>
                    <td style={{ textAlign: "center", color: opponent.color || "#e7ffe0", fontWeight: 600 }}>
                      <span
                        style={{ cursor: "pointer", textDecoration: "underline dotted" }}
                        onClick={() => opponent.playerId && opponent.playerId !== player.playerId && window.alert("Show stats for " + (opponent.nickname || opponent.name))}
                      >
                        {opponent.nickname ? opponent.nickname : opponent.name}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>{m.gameType || "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      {playerScore && oppScore
                        ? `${playerScore} - ${oppScore}`
                        : "—"}
                    </td>
                    <td style={{ textAlign: "center", color: isWinner ? "#78FFA3" : "#ff6b6b", fontWeight: 700 }}>
                      {result}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ELO History Chart */}
        <h2 style={{ margin: "1.6em 0 0.4em 0", color: "#fff", fontSize: "1.13em", textAlign: "center" }}>
          ELO Rating Over Time
        </h2>
        <div style={{ width: "100%", minHeight: 240, margin: "0 auto" }}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={playerRatings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#28343a" />
              <XAxis dataKey="date" stroke="#b3ffc3" fontSize={13} />
              <YAxis domain={["auto", "auto"]} stroke="#b3ffc3" fontSize={13} />
              <Tooltip
                contentStyle={{
                  background: "#172624",
                  border: "1px solid #50ff9e80",
                  color: "#fff",
                  borderRadius: 12,
                  fontSize: "1em",
                }}
              />
              <Line
                type="monotone"
                dataKey="rating"
                stroke={player.color}
                strokeWidth={3}
                dot={false}
                isAnimationActive={true}
                name={getDisplayName(player)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Navigation Buttons handled by App.jsx (fixed at bottom) */}
      <div style={{ height: 60 }} />
    </div>
  );
}
