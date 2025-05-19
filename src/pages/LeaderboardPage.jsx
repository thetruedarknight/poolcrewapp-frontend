// src/pages/LeaderboardPage.jsx

import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";

// Change these URLs if your endpoint changes:
const API_PLAYERS = "https://script.google.com/macros/s/AKfycby-Dv1y7C1j_cZ2wlliTBHqQh5giqfEyGLT8ZIhn8W9Yi4hx1S0qEtvDeO3eiiG1SQMHw/exec?action=getPlayers";
const API_RATING_HISTORY = "https://script.google.com/macros/s/AKfycby-Dv1y7C1j_cZ2wlliTBHqQh5giqfEyGLT8ZIhn8W9Yi4hx1S0qEtvDeO3eiiG1SQMHw/exec?action=getRatingHistory";

// Helper: Get the display name (nickname or name)
const getDisplayName = (player) => player.nickname ? player.nickname : player.name;

// Helper: Medal icon for 1st, 2nd, 3rd
const getMedal = (rank) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
};

function LeaderboardPage({ onBackToMenu, onPlayerClick }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingHistory, setRatingHistory] = useState([]);
  const [chartData, setChartData] = useState([]);

  // Fetch players
  useEffect(() => {
    setLoading(true);
    fetch(API_PLAYERS)
      .then(res => res.json())
      .then(playerData => {
        // Sort players by Current Rating descending, fallback to startingRating
        const sorted = [...playerData].sort((a, b) =>
          (parseInt(b["Current Rating"] || b.startingRating || 0, 10)) -
          (parseInt(a["Current Rating"] || a.startingRating || 0, 10))
        );
        setPlayers(sorted);
        setLoading(false);
      });
  }, []);

  // Fetch rating history for chart
  useEffect(() => {
    fetch(API_RATING_HISTORY)
      .then(res => res.json())
      .then(history => {
        setRatingHistory(history);
      });
  }, []);

  // Transform rating history for charting
  useEffect(() => {
    if (!ratingHistory.length || !players.length) return;

    // Assume each entry: {playerId, name, nickname, date, rating}
    // Group by date, so each object is { date, player1: rating, player2: rating, ... }
    const dateMap = {};
    ratingHistory.forEach(entry => {
      const dateKey = entry.date;
      if (!dateMap[dateKey]) dateMap[dateKey] = { date: dateKey };
      dateMap[dateKey][getDisplayName(entry)] = parseInt(entry.rating, 10);
    });
    // Convert to array, sorted by date
    const chartRows = Object.values(dateMap).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );
    setChartData(chartRows);
  }, [ratingHistory, players]);

  if (loading) return <div style={{ color: "var(--text-light)", textAlign: "center", marginTop: 32 }}>Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg-gradient)" }}>
      <div className="page-container" style={{ width: "100%", maxWidth: 700, marginTop: 30, marginBottom: 30 }}>
        <h1 style={{ fontSize: "2em", color: "var(--accent)", textAlign: "center", marginBottom: "0.6em" }}>
          Leaderboard
        </h1>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: "transparent", color: "var(--text-light)", fontSize: "1.1em" }}>
                <th style={{ textAlign: "center", width: 52 }}>#</th>
                <th style={{ textAlign: "left" }}>Player</th>
                <th style={{ textAlign: "center" }}>Current Rating</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, idx) => (
                <tr
                  key={player.playerId}
                  style={{
                    borderLeft: `6px solid ${player.color}`,
                    background: "rgba(28,38,44,0.86)",
                    cursor: "pointer",
                    transition: "background 0.12s",
                  }}
                  onClick={() => onPlayerClick && onPlayerClick(player)}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(40,56,63,1)"}
                  onMouseOut={e => e.currentTarget.style.background = "rgba(28,38,44,0.86)"}
                >
                  <td style={{ textAlign: "center", fontWeight: "bold", fontSize: "1.2em" }}>
                    {getMedal(idx + 1)}
                  </td>
                  <td style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img
                      src={player.avatarUrl || "https://ui-avatars.com/api/?name=" + encodeURIComponent(getDisplayName(player))}
                      alt={player.name}
                      style={{
                        width: 38, height: 38,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: `2.5px solid ${player.color}`,
                        background: "#111",
                        marginRight: 8,
                      }}
                    />
                    <span style={{
                      fontWeight: 600,
                      fontSize: "1.1em",
                      color: player.color,
                    }}>
                      {getDisplayName(player)}
                    </span>
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 700, fontSize: "1.18em", color: "#78FFA3" }}>
                    {player["Current Rating"] || player.startingRating}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Chart Section */}
        <h2 style={{ margin: "1.7em 0 0.2em 0", color: "#fff", fontSize: "1.13em", textAlign: "center" }}>
          Player Rating History
        </h2>
        <div style={{ width: "100%", minHeight: 270, margin: "0 auto" }}>
          <ResponsiveContainer width="100%" height={270}>
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
              <Legend />
              {players.map((player) => (
                <Line
                  key={player.playerId}
                  type="monotone"
                  dataKey={getDisplayName(player)}
                  stroke={player.color}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={true}
                  name={getDisplayName(player)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Return to Main Menu */}
        
      </div>
    </div>
  );
}

export default LeaderboardPage;
