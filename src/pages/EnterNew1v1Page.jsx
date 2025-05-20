import React, { useState, useEffect } from "react";

export default function EnterNew1v1Page({ onBackToMenu, onBackToLeaderboard }) {
  const [players, setPlayers] = useState([]);
  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [runout, setRunout] = useState(false);

  useEffect(() => {
    fetch("/api/getPlayers").then(r => r.json()).then(setPlayers);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    // Simple ID gen:
    const matchId = "M" + Date.now();
    const sessionId = "S" + Math.floor(Date.now() / 100000);
    const today = new Date();
    today.setHours(today.getHours() - 4); // Trinidad time!
    const date = today.toISOString().split("T")[0];
    fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        matchId,
        sessionId,
        date,
        sessionType: "1v1",
        gameType: "8 ball", // or your dropdown value!
        playerAId,
        playerBId,
        winnerId,
        runout: runout ? "Y" : ""
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          alert("Match logged!");
          setPlayerAId("");
          setPlayerBId("");
          setWinnerId("");
          setRunout(false);
        } else {
          alert("Failed: " + data.error);
        }
      });
  }

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg-gradient)" }}>
      <div className="page-container" style={{ width: "100%", maxWidth: 410, marginTop: 36, marginBottom: 36 }}>
        <h1 style={{ color: "var(--accent)", textAlign: "center", marginBottom: 16 }}>Enter New 1v1 Match</h1>
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
                if (![e.target.value, playerB].includes(winner)) setWinner("");
              }}
              style={{ width: "100%" }}
            >
              <option value="">Select Player A</option>
              {playerOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Player B
            <select
              required
              value={playerB}
              onChange={(e) => {
                setPlayerB(e.target.value);
                if (![playerA, e.target.value].includes(winner)) setWinner("");
              }}
              style={{ width: "100%" }}
            >
              <option value="">Select Player B</option>
              {filteredPlayerBOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Winner
            <select
              required
              value={winner}
              onChange={(e) => setWinner(e.target.value)}
              style={{ width: "100%" }}
              disabled={!playerA || !playerB}
            >
              <option value="">Select Winner</option>
              {winnerOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
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
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={runout}
              onChange={(e) => setRunout(e.target.checked)}
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
