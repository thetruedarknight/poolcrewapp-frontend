import React, { useState, useEffect } from "react";

export default function EnterNewRacePage({ onBackToMenu, onBackToLeaderboard }) {
  const [players, setPlayers] = useState([]);
  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [runoutA, setRunoutA] = useState(0);
  const [runoutB, setRunoutB] = useState(0);

  useEffect(() => {
    fetch("/api/getPlayers").then(r => r.json()).then(setPlayers);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const matchId = "M" + Date.now();
    const sessionId = "S" + Math.floor(Date.now() / 100000);
    const today = new Date();
    today.setHours(today.getHours() - 4); // Trinidad
    const date = today.toISOString().split("T")[0];
    fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        matchId,
        sessionId,
        date,
        sessionType: "race",
        gameType: "9 ball", // or your dropdown value!
        playerAId,
        playerBId,
        winnerId,
        scoreA,
        scoreB,
        runoutA: Number(runoutA) || 0,
        runoutB: Number(runoutB) || 0
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          alert("Race logged!");
          setPlayerAId("");
          setPlayerBId("");
          setWinnerId("");
          setScoreA("");
          setScoreB("");
          setRunoutA(0);
          setRunoutB(0);
        } else {
          alert("Failed: " + data.error);
        }
      });
  }

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg-gradient)" }}>
      <div className="page-container" style={{ width: "100%", maxWidth: 410, marginTop: 36, marginBottom: 36 }}>
        <h1 style={{ color: "var(--accent)", textAlign: "center", marginBottom: 16 }}>Enter New Race</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit("continue");
          }}
        >
          <label>
            Player A
            <select
              required
              value={playerA}
              onChange={(e) => {
                setPlayerA(e.target.value);
                if (playerB === e.target.value) setPlayerB("");
              }}
              style={{ width: "100%" }}
            >
              <option value="">Select Player A</option>
              {playerOptions.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          <label>
            Player B
            <select
              required
              value={playerB}
              onChange={(e) => setPlayerB(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Select Player B</option>
              {filteredPlayerBOptions.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          <label>
            Game Type
            <select
              required
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
              style={{ width: "100%" }}
            >
              {GAME_TYPES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ flex: 1 }}>
              Player A Score
              <input
                required
                type="number"
                min={0}
                value={scoreA}
                onChange={(e) => setScoreA(e.target.value)}
                style={{ width: "100%" }}
              />
            </label>
            <label style={{ flex: 1 }}>
              Player B Score
              <input
                required
                type="number"
                min={0}
                value={scoreB}
                onChange={(e) => setScoreB(e.target.value)}
                style={{ width: "100%" }}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ flex: 1 }}>
              Runouts by Player A
              <input
                required
                type="number"
                min={0}
                value={runoutsA}
                onChange={(e) => setRunoutsA(e.target.value)}
                style={{ width: "100%" }}
              />
            </label>
            <label style={{ flex: 1 }}>
              Runouts by Player B
              <input
                required
                type="number"
                min={0}
                value={runoutsB}
                onChange={(e) => setRunoutsB(e.target.value)}
                style={{ width: "100%" }}
              />
            </label>
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
