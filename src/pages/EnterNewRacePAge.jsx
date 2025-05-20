import React, { useState, useEffect } from "react";

const GAME_TYPES = ["8 ball", "9 ball", "10 ball"];

export default function EnterNewRacePage({ onBackToMenu, onBackToLeaderboard }) {
  const [players, setPlayers] = useState([]);
  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");
  const [gameType, setGameType] = useState(GAME_TYPES[0]);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [runoutA, setRunoutA] = useState(0);
  const [runoutB, setRunoutB] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/getPlayers").then(r => r.json()).then(setPlayers);
  }, []);

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

  // Ensure runouts can't exceed games won
  useEffect(() => {
    if (Number(runoutA) > Number(scoreA)) setRunoutA(scoreA || 0);
    if (Number(runoutB) > Number(scoreB)) setRunoutB(scoreB || 0);
  }, [scoreA, scoreB]);

  function resetForm() {
    setPlayerAId("");
    setPlayerBId("");
    setScoreA("");
    setScoreB("");
    setRunoutA(0);
    setRunoutB(0);
    setGameType(GAME_TYPES[0]);
  }

  async function handleSubmit(mode = "continue") {
    setErrorMsg("");
    setSuccessMsg("");
    if (!playerAId || !playerBId) {
      setErrorMsg("Please select both players.");
      return;
    }
    if (!scoreA || !scoreB) {
      setErrorMsg("Please enter scores for both players.");
      return;
    }
    if (scoreA === scoreB) {
      setErrorMsg("Scores cannot be equal; there must be a winner.");
      return;
    }
    if (Number(runoutA) > Number(scoreA) || Number(runoutB) > Number(scoreB)) {
      setErrorMsg("Runouts cannot exceed games won for either player.");
      return;
    }
    setSubmitting(true);

    const matchId = "M" + Date.now();
    const sessionId = "S" + Math.floor(Date.now() / 100000);
    const today = new Date();
    today.setHours(today.getHours() - 4); // Trinidad
    const date = today.toISOString().split("T")[0];

    // Winner is the one with the higher score:
    let winnerId = "";
    if (Number(scoreA) > Number(scoreB)) winnerId = playerAId;
    else if (Number(scoreB) > Number(scoreA)) winnerId = playerBId;

    // Add the race match (no incrementRunout endpoint; backend will recalc all runouts)
    const addRes = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        matchId,
        sessionId,
        date,
        sessionType: "race",
        gameType,
        playerAId,
        playerBId,
        winnerId,
        scoreA,
        scoreB,
        runoutA: Number(runoutA) || 0,
        runoutB: Number(runoutB) || 0
      })
    }).then(r => r.json());
    
    // Always recalc ELO (and runouts)
    if (addRes.success) {
      await fetch("/api/recalculateElo", { method: "POST" });
    }

    setSubmitting(false);

    if (addRes.success) {
      setSuccessMsg("Race logged!");
      setErrorMsg("");
      if (mode === "continue") {
        // Just clear the form for the next entry
        resetForm();
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
        <h1 style={{ color: "var(--accent)", textAlign: "center", marginBottom: 16 }}>Enter New Race</h1>
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
          <div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    width: "100%",
    marginTop: 4,
    marginBottom: 6
  }}
>
  <div>
    <div style={{ fontWeight: 600, marginBottom: 3 }}>Player A Score</div>
    <input
      required
      type="number"
      min={0}
      max={99}
      value={scoreA}
      onChange={e => setScoreA(e.target.value)}
      style={{
        width: "70px",
        textAlign: "center",
        fontSize: "1.15em",
        borderRadius: "9px"
      }}
    />
  </div>
  <div>
    <div style={{ fontWeight: 600, marginBottom: 3 }}>Player B Score</div>
    <input
      required
      type="number"
      min={0}
      max={99}
      value={scoreB}
      onChange={e => setScoreB(e.target.value)}
      style={{
        width: "70px",
        textAlign: "center",
        fontSize: "1.15em",
        borderRadius: "9px"
      }}
    />
  </div>
  <div>
    <div style={{ fontWeight: 600, marginBottom: 3 }}>Runouts by Player A</div>
    <input
      required
      type="number"
      min={0}
      max={scoreA}
      value={runoutA}
      onChange={e => setRunoutA(e.target.value)}
      style={{
        width: "70px",
        textAlign: "center",
        fontSize: "1.15em",
        borderRadius: "9px"
      }}
    />
  </div>
  <div>
    <div style={{ fontWeight: 600, marginBottom: 3 }}>Runouts by Player B</div>
    <input
      required
      type="number"
      min={0}
      max={scoreB}
      value={runoutB}
      onChange={e => setRunoutB(e.target.value)}
      style={{
        width: "70px",
        textAlign: "center",
        fontSize: "1.15em",
        borderRadius: "9px"
      }}
    />
  </div>
</div>

          <div style={{ marginTop: 22, display: "flex", gap: 12 }}>
            <button
              type="submit"
              className="btn"
              style={{ width: "50%", borderRadius: 17 }}
              disabled={submitting}
            >
              {submitting ? "Logging..." : "Log race and continue"}
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
