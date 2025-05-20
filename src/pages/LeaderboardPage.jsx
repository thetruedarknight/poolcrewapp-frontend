// src/pages/LeaderboardPage.jsx

import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

// Helper: Get display name
function getDisplayName(player) {
  return player.nickname || player.name;
}

// Helper: Medal icons
const rankIcons = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage({ onPlayerClick, onBackToMenu }) {
  const [players, setPlayers] = useState([]);
  const [ratingHistory, setRatingHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch players and rating history on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [playersRes, historyRes] = await Promise.all([
        fetch("/api/getPlayers").then(res => res.json()),
        fetch("/api/getRatingHistory").then(res => res.json())
      ]);
      setPlayers(playersRes);
      setRatingHistory(historyRes);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Sort players by current rating DESC
  const sortedPlayers = [...players].sort((a, b) => {
    // Use Current Rating; fallback to startingRating if missing
    const aRating = parseInt(a["Current Rating"] || a["startingRating"] || "0", 10);
    const bRating = parseInt(b["Current Rating"] || b["startingRating"] || "0", 10);
    return bRating - aRating;
  });

  // For chart: collect all unique rating history dates
  const dates = Array.from(new Set(ratingHistory.map(r => r.date))).sort();

  // Build data: each point is { date, [playerId1]: rating, [playerId2]: rating, ... }
  const chartData = dates.map(date => {
    const entry = { date };
    players.forEach(p => {
      // Find the latest rating for player on/before this date
      const history = ratingHistory.filter(r => r.playerId === p.playerId && r.date <= date);
      if (history.length > 0) {
        // Get the last entry on/before this date
        entry[p.playerId] = parseInt(history[history.length - 1].rating, 10);
      } else {
        entry[p.playerId] = parseInt(p.startingRating || "0", 10);
      }
    });
    return entry;
  });

  if (loading) return <div style={{ color: "#fff", textAlign: "center", marginTop: 36 }}>Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg-gradient)" }}>
      <div className="page-container" style={{ width: "100%", maxWidth: 540, marginTop: 28, marginBottom: 28 }}>
        <h1 style={{ color: "var(--accent)", fontWeight: "bold", fontSize: "2.1em", textAlign: "center" }}>
          Leaderboard
        </h1>
        {/* Leaderboard Table */}
        <table style={{ width: "100%", marginTop: 24, borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ color: "#fff", background: "none" }}>
              <th style={{ width: 56, textAlign: "center" }}>Rank</th>
              <th style={{ textAlign: "left" }}>Player</th>
              <th style={{ textAlign: "right" }}>Rating</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, idx) => (
              <tr
                key={player.playerId}
                style={{ background: "rgba(32,42,48,0.92)", cursor: "pointer" }}
                onClick={() => onPlayerClick && onPlayerClick(player)}
              >
                <td style={{ textAlign: "center", fontSize: "1.35em", fontWeight: "700" }}>
                  {rankIcons[idx] || (idx + 1)}
                </td>
                <td style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                  <img
                    src={player.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName(player))}`}
                    alt={getDisplayName(player)}
                    style={{
                      width: 44, height: 44, borderRadius: "50%",
                      border: `3px solid ${player.color || "#fff"}`,
                      objectFit: "cover", background: "#222"
                    }}
                  />
                  <span style={{
                    fontWeight: "600", color: player.color || "#78FFA3", fontSize: "1.17em"
                  }}>
                    {getDisplayName(player)}
                  </span>
                </td>
                <td style={{
                  textAlign: "right", fontWeight: 700, color: "#fff", fontSize: "1.17em"
                }}>
                  {player["Current Rating"] || player.startingRating}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ELO Chart */}
        <h2 style={{ margin: "2.3em 0 0.7em 0", color: "#fff", fontSize: "1.13em", textAlign: "center" }}>
          ELO Rating History
        </h2>
        <div style={{ width: "100%", minHeight: 240, margin: "0 auto" }}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
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
              {players.map(player => (
                <Line
                  key={player.playerId}
                  type="monotone"
                  dataKey={player.playerId}
                  stroke={player.color || "#78FFA3"}
                  strokeWidth={3}
                  dot={false}
                  name={getDisplayName(player)}
                  isAnimationActive={true}
                />
              ))}
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Fixed Return to Main Menu button (handled by App.jsx) */}
      <div style={{ height: 60 }} />
    </div>
  );
}
