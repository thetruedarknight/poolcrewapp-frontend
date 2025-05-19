// src/pages/EnterNew1v1Page.jsx

import React, { useEffect, useState } from "react";

// CHANGE THIS to your Apps Script deployment
const API_PLAYERS = "https://script.google.com/macros/s/AKfycby-Dv1y7C1j_cZ2wlliTBHqQh5giqfEyGLT8ZIhn8W9Yi4hx1S0qEtvDeO3eiiG1SQMHw/exec?action=getPlayers";
const API_ADD_MATCH = "https://script.google.com/macros/s/AKfycby-Dv1y7C1j_cZ2wlliTBHqQh5giqfEyGLT8ZIhn8W9Yi4hx1S0qEtvDeO3eiiG1SQMHw/exec?action=addMatch";

function EnterNew1v1Page({ onBackToMenu }) {
  const [players, setPlayers] = useState([]);
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [winner, setWinner] = useState("");
  const [runout, setRunout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch player list
  useEffect(() => {
    setLoading(true);
    fetch(API_PLAYERS)
      .then(res => res.json())
      .then(data => {
        setPlayers(data);
        setLoading(false);
      });
  }, []);

  // Get dropdown options (exclude selected player for other dropdown)
  const playerOptions = players.map(p => ({
    value: p.playerId,
    label: p.nickname ? p.nickname : p.name,
    player: p
  }));

  const playerBOptions = playerOptions.filter(opt => opt.value !== playerA);
  const playerAOptions = playerOptions.filter(opt => opt.value !== playerB);

  // Winner options: only A or B
  const winnerOptions = [playerA, playerB]
    .map(id => playerOptions.find(opt => opt.value === id))
    .filter(Boolean);

  // Form is valid if all dropdowns set and players different
  const formValid = playerA && playerB && playerA !== playerB && winner;

  // Handle form submission
  async function handleSubmit(type = "continue") {
  setErrorMsg("");
  setSuccessMsg("");
  setSubmitting(true);

  // Compose match record as URL params
  const params = new URLSearchParams({
    action: "addMatch",
    playerA,
    playerB,
    winner,
    runout: runout ? winner : "",
    date: new Date().toISOString().split("T")[0]
  });

  // Use GET with params
  const url = `https://script.google.com/macros/s/AKfycby-Dv1y7C1j_cZ2wlliTBHqQh5giqfEyGLT8ZIhn8W9Yi4hx1S0qEtvDeO3eiiG1SQMHw/exec?${params.toString()}`;

  try {
    const res = await fetch(url);
    const result = await res.json();
    if (result.success) {
      setSuccessMsg("Match logged successfully!");
      if (type === "continue") {
        setPlayerA(winner);
        setPlayerB("");
        setWinner("");
        setRunout(false);
      } else if (type === "end") {
        onBackToMenu();
      }
    } else {
      setErrorMsg(result.error || "Unknown error logging match.");
    }
  } catch (e) {
    setErrorMsg("Failed to connect to server.");
  } finally {
    setSubmitting(false);
  }
}


  // Cancel: just return to main menu
  function handleCancel() {
    onBackToMenu();
  }

  if (loading) return <div style={{ color: "var(--text-light)", textAlign: "center", marginTop: 32 }}>Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg-gradient)" }}>
      <div className="page-container" style={{ width: "100%", maxWidth: 420, marginTop: 36, marginBottom: 36 }}>
        <h1 style={{ fontSize: "2em", color: "var(--accent)", textAlign: "center" }}>Enter New 1v1 Match</h1>
        {errorMsg && <div style={{ color: "#ff7373", marginBottom: 12, textAlign: "center" }}>{errorMsg}</div>}
        {successMsg && <div style={{ color: "#78FFA3", marginBottom: 12, textAlign: "center" }}>{successMsg}</div>}

        <form onSubmit={e => { e.preventDefault(); handleSubmit("continue"); }}>
          <label htmlFor="playerA">Player A</label>
          <select
            id="playerA"
            value={playerA}
            onChange={e => { setPlayerA(e.target.value); if (e.target.value === playerB) setPlayerB(""); setWinner(""); }}
            required
            style={{ marginBottom: 16, width: "100%" }}
          >
            <option value="">Select Player A</option>
            {playerAOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <label htmlFor="playerB">Player B</label>
          <select
            id="playerB"
            value={playerB}
            onChange={e => { setPlayerB(e.target.value); if (e.target.value === playerA) setPlayerA(""); setWinner(""); }}
            required
            style={{ marginBottom: 16, width: "100%" }}
          >
            <option value="">Select Player B</option>
            {playerBOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <label htmlFor="winner">Winner</label>
          <select
            id="winner"
            value={winner}
            onChange={e => setWinner(e.target.value)}
            required
            disabled={!(playerA && playerB && playerA !== playerB)}
            style={{ marginBottom: 16, width: "100%" }}
          >
            <option value="">Select Winner</option>
            {winnerOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <input
              type="checkbox"
              checked={runout}
              onChange={e => setRunout(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Runout (Winner completed a break and run)
          </label>

          {/* Bottom Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 24 }}>
            <button
              type="submit"
              className="btn"
              disabled={!formValid || submitting}
              style={{
                background: "linear-gradient(90deg, #20e878 0%, #2ad493 100%)",
                color: "#1a2b20",
                fontWeight: 700,
                fontSize: "1.18em",
                borderRadius: 15,
                border: "none"
              }}
            >
              Log Match and Continue
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => handleSubmit("end")}
              disabled={!formValid || submitting}
              style={{
                background: "linear-gradient(90deg, #42E2F7 0%, #20e878 100%)",
                color: "#182427",
                fontWeight: 700,
                fontSize: "1.12em",
                borderRadius: 15,
                border: "none"
              }}
            >
              End Session
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleCancel}
              style={{
                background: "#242c33",
                color: "#9fa",
                fontWeight: 700,
                fontSize: "1.1em",
                borderRadius: 15,
                border: "none"
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      {/* Padding for bottom nav */}
      <div style={{ height: 60 }} />
    </div>
  );
}

export default EnterNew1v1Page;
