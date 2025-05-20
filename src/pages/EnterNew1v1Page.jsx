import React, { useState, useEffect } from "react";

const GAME_TYPES = ["8 ball", "9 ball", "10 ball"];

export default function EnterNew1v1Page({ onBackToMenu, onBackToLeaderboard }) {
  const [players, setPlayers] = useState([]);
  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [gameType, setGameType] = useState(GAME_TYPES[0]);
  const [runout, setRunout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/getPlayers").then(r => r.json()).then(setPlayers);
  }, []);

  // Winner options: Only Player A or Player B, once both are chosen
  const winnerOptions = [playerAId, playerBId]
    .filter(Boolean)
    .map(pid => {
      const player = players.find(p => p.playerId === pid);
      return player ? { value: player.playerId, label: player.nickname || player.name } : null;
    })
    .filter(Boolean);

  // For dropdown options: filter to prevent duplicate selection
  const playerAOptions = players
    .filter(p => p.playerId !== playerBId)
    .map(p => ({
      value: p.playerId,
      label: p.nickname || p.name,
    }));

  const playerBOptions = players
    .filter(p => p.playerId !== playerAId)
    .map(p => ({
      value: p.playerId,
      label: p.nickname || p.name,
    }));

  // Clear winner if either A or B is changed
  useEffect(() => {
    if (![playerAId, playerBId].includes(winnerId)) setWinnerId("");
  }, [playerAId, playerBId]);

  function resetForm() {
    setPlayerAId("");
    setPlayerBId("");
    setWinnerId("");
    setRunout(false);
    setGameType(GAME_TYPES[0]);
  }

  async function handleSubmit(mode = "continue") {
    setErrorMsg("");
    setSuccessMsg("");
    if (!playerAId || !playerBId || !winnerId) {
      setErrorMsg("Please select both players and a winner.");
      return;
    }
    setSubmitting(true);

    const matchId = "M" + Date.now();
    const sessionId = "S" + Math.floor(Date.now() / 100000);
    const today = new Date();
    today.setHours(today.getHours() - 4); // Trinidad UTC-4
    const date = today.toISOString().split("T")[0];

    // 1. Add the match
    const addRes = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        matchId,
        sessionId,
        date,
        sessionType: "1v1",
        gameType,
        playerAId,
        playerBId,
        winnerId,
        runout: runout ? "Y" : "",
      })
    }).then(r => r.json());


    // 3. Always recalc ELO
    if (addRes.success) {
      await fetch("/api/recalculateElo", { method: "POST" });
    }

    setSubmitting(false);

    if (addRes.success) {
      setSuccessMsg("Match logged!");
      setErrorMsg("");
      if (mode === "continue") {
        setPlayerAId(winnerId);
        setPlayerBId("");
        setWinnerId("");
        setRunout(false);
      } else {
        resetForm();
        onBackToMenu();
      }
    } else {
      setErrorMsg("Failed: " + (addRes.error || "Unknown error"));
      setSuccessMsg("");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg-gradient)" }}>
      <div className="page-container" style={{ width: "100%", maxWidth: 410, marginTop: 0, marginBottom: 36 }}>
        <h1 style={{ color: "var(--accent)", textAlign: "center", marginBottom: 16 }}>Enter New 1v1 Match</h1>
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSubmit("continue");
          }}
        >
          <label>
            Player A
            <select
              required
              value={playerAId}
              onChange={e => setPlayerAId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Select Player A</option>
              {playerAOptions.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          <label>
            Player B
            <select
              required
              value={playerBId}
              onChange={e => setPlayerBId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Select Player B</option>
              {playerBOptions.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          <label>
            Winner
            <select
              required
              value={winnerId}
              onChange={e => setWinnerId(e.target.value)}
              style={{ width: "100%" }}
              disabled={!playerAId || !playerBId}
            >
              <option value="">Select Winner</option>
              {winnerOptions.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          <label>
            Game Type
            <select
              required
              value={gameType}
              onChange={e => setGameType(e.target.value)}
              style={{ width: "100%" }}
            >
              {GAME_TYPES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={runout}
              onChange={e => setRunout(e.target.checked)}
              style={{ width: 22, height: 22 }}
            />
            Winner had a runout
          </label>
          <div style={{ marginTop: 22, display: "flex", gap: 12 }}>
            <button
              type="submit"
              className="btn"
              style={{ width: "50%", borderRadius: 17 }}
              disabled={submitting}
            >
              {submitting ? "Logging..." : "Log match and continue"}
            </button>
            <button
              type="button"
              className="btn"
              style={{ width: "50%", borderRadius: 17, background: "#333", color: "#fff" }}
              disabled={submitting}
              onClick={() => handleSubmit("end")}
            >
              {submitting ? "Saving..." : "End Session"}
            </button>
          </div>
          <button
            type="button"
            className="btn"
            style={{
              width: "100%",
              borderRadius: 17,
              marginTop: 14,
              background: "#273036",
              color: "#fff"
            }}
            disabled={submitting}
            onClick={onBackToMenu}
          >
            Cancel
          </button>
          {successMsg && <div style={{ color: "#24FF8A", marginTop: 10, textAlign: "center" }}>{successMsg}</div>}
          {errorMsg && <div style={{ color: "#ff8181", marginTop: 10, textAlign: "center" }}>{errorMsg}</div>}
        </form>
      </div>
    </div>
  );
}
