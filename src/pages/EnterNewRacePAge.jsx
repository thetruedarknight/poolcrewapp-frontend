import React, { useEffect, useState, useRef } from "react";

const GAME_TYPES = ["8 ball", "9 ball", "10 ball"];

export default function EnterNewRacePage({ onBackToMenu, onBackToLeaderboard }) {
  const [players, setPlayers] = useState([]);
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [runoutsA, setRunoutsA] = useState(0);
  const [runoutsB, setRunoutsB] = useState(0);
  const [winner, setWinner] = useState("");
  const [gameType, setGameType] = useState(GAME_TYPES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const sessionIdRef = useRef(generateSessionId());
  const lastGameTypeRef = useRef(GAME_TYPES[0]);

  useEffect(() => {
    fetch("/api/getPlayers")
      .then((res) => res.json())
      .then(setPlayers);
  }, []);

  function resetForm(newWinner = "", newGameType = gameType) {
    setPlayerA(newWinner || "");
    setPlayerB("");
    setScoreA("");
    setScoreB("");
    setRunoutsA(0);
    setRunoutsB(0);
    setWinner("");
    setGameType(newGameType);
  }

  function generateSessionId() {
    return `S${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  // Player dropdown logic
  const playerOptions = players.map((p) => ({
    value: p.playerId,
    label: p.nickname ? `${p.nickname} (${p.name})` : p.name,
  }));
  const filteredPlayerBOptions = playerOptions.filter((opt) => opt.value !== playerA);

  // Winner detection (auto if scores are entered)
  useEffect(() => {
    if (
      playerA &&
      playerB &&
      scoreA !== "" &&
      scoreB !== "" &&
      Number(scoreA) !== Number(scoreB)
    ) {
      setWinner(Number(scoreA) > Number(scoreB) ? playerA : playerB);
    } else {
      setWinner("");
    }
  }, [playerA, playerB, scoreA, scoreB]);

  async function handleSubmit(type = "continue") {
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    // Validation
        if (!playerA || !playerB || playerA === playerB) {
      setErrorMsg("Please select two different players.");
      setSubmitting(false);
      return;
    }
    if (!gameType) {
      setErrorMsg("Please select a game type.");
      setSubmitting(false);
      return;
    }
    if (
      scoreA === "" ||
      scoreB === "" ||
      isNaN(Number(scoreA)) ||
      isNaN(Number(scoreB)) ||
      Number(scoreA) < 0 ||
      Number(scoreB) < 0
    ) {
      setErrorMsg("Enter valid scores for both players.");
      setSubmitting(false);
      return;
    }
    if (Number(scoreA) === Number(scoreB)) {
      setErrorMsg("Scores cannot be tied in a race.");
      setSubmitting(false);
      return;
    }
    if (!winner) {
      setErrorMsg("Cannot determine winner from scores.");
      setSubmitting(false);
      return;
    }
    if (
      runoutsA === "" ||
      runoutsB === "" ||
      isNaN(Number(runoutsA)) ||
      isNaN(Number(runoutsB)) ||
      Number(runoutsA) < 0 ||
      Number(runoutsB) < 0
    ) {
      setErrorMsg("Enter valid runout counts (0 or more) for both players.");
      setSubmitting(false);
      return;
    }
    if (Number(runoutsA) > Number(scoreA)) {
      setErrorMsg("Player A cannot have more runouts than games won.");
      setSubmitting(false);
      return;
    }
    if (Number(runoutsB) > Number(scoreB)) {
      setErrorMsg("Player B cannot have more runouts than games won.");
      setSubmitting(false);
      return;
    }

    const matchId = `M${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
    const sessionId = sessionIdRef.current;
    const dateStr = new Date().toISOString().split("T")[0];

    try {
      // 1. Add Match
      const res = await fetch("/api/addMatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
  runoutA: Number(runoutsA), // from input
  runoutB: Number(runoutsB)  // from input
        }),
      });
      const result = await res.json();
      if (!result.success) {
        setErrorMsg(result.error || "Failed to add match.");
        setSubmitting(false);
        return;
      }

      // 2. Recalculate ELO
      try {
        await fetch("/api/recalculateElo", { method: "POST" });
      } catch {}

      // 3. Increment runouts for each player if needed
      for (let i = 0; i < Number(runoutsA); i++) {
        await fetch("/api/incrementRunout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: playerA }),
        });
      }
      for (let i = 0; i < Number(runoutsB); i++) {
        await fetch("/api/incrementRunout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: playerB }),
        });
      }

      setSuccessMsg("Race logged and ratings updated!");
      lastGameTypeRef.current = gameType;

      if (type === "continue") {
        resetForm(winner, gameType);
      } else if (type === "end") {
        sessionIdRef.current = generateSessionId();
        onBackToMenu();
      }
    } catch (e) {
      setErrorMsg("Network error.");
    } finally {
      setSubmitting(false);
    }
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
