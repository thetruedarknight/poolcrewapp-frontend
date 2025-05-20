import React, { useEffect, useState } from "react";

function generateSessionId() {
  return "T" + Date.now() + Math.floor(Math.random() * 9000 + 1000);
}

export default function TrainingLogPage({ onBackToMenu }) {
  // Drills and players from API
  const [drills, setDrills] = useState([]);
  const [players, setPlayers] = useState([]);

  // Form state
  const [selectedDrillId, setSelectedDrillId] = useState("");
  const [newDrill, setNewDrill] = useState({ Name: "", MaxScore: "", skillTested: "" });
  const [addingDrill, setAddingDrill] = useState(false);

  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [sets, setSets] = useState(1);

  const [scores, setScores] = useState({}); // { playerId: [score1, score2, ...] }
  const [notes, setNotes] = useState({});   // { playerId: note }
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [step, setStep] = useState(1); // 1: drill/player/set, 2: score entry

  // Fetch drills/players on mount
  useEffect(() => {
    fetch("/api/getDrills").then(res => res.json()).then(setDrills);
    fetch("/api/getPlayers").then(res => res.json()).then(setPlayers);
  }, []);

  // Drill details for validation/max score
  const drill = drills.find(d => d.DrillID === selectedDrillId);

  // --- Drill Add Logic ---
  async function handleAddDrill(e) {
    e.preventDefault();
    setErrorMsg(""); setSuccessMsg("");
    if (!newDrill.Name || !newDrill.MaxScore || !newDrill.skillTested) {
      setErrorMsg("All drill fields required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/addDrill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDrill),
      });
      const result = await res.json();
      if (result.success && result.DrillID) {
        setDrills([...drills, { DrillID: result.DrillID, ...newDrill }]);
        setSelectedDrillId(result.DrillID);
        setAddingDrill(false);
        setNewDrill({ Name: "", MaxScore: "", skillTested: "" });
      } else {
        setErrorMsg(result.error || "Failed to add drill.");
      }
    } catch {
      setErrorMsg("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Multi-step Form Handlers ---
  function handleNextStep(e) {
    e.preventDefault();
    setErrorMsg("");
    if (!selectedDrillId) {
      setErrorMsg("Select a drill.");
      return;
    }
    if (selectedPlayers.length < 1) {
      setErrorMsg("Select at least one player.");
      return;
    }
    if (!sets || isNaN(sets) || sets < 1 || sets > 30) {
      setErrorMsg("Enter a valid number of sets (1-30).");
      return;
    }
    setStep(2);
  }
  function handleBackStep() { setStep(1); }

  // --- Score/Note Handlers ---
  function handleScoreChange(playerId, setIdx, value) {
    const arr = [...(scores[playerId] || [])];
    arr[setIdx] = value;
    setScores({ ...scores, [playerId]: arr });
  }
  function handleNoteChange(playerId, value) {
    setNotes({ ...notes, [playerId]: value });
  }

  // --- Submission ---
  async function handleSubmitScores(e) {
    e.preventDefault();
    setErrorMsg(""); setSuccessMsg("");
    if (!drill) { setErrorMsg("No drill selected."); return; }

    // Validate all scores
    for (let pid of selectedPlayers) {
      const arr = scores[pid] || [];
      for (let i = 0; i < sets; ++i) {
        const val = arr[i] !== undefined && arr[i] !== "" ? Number(arr[i]) : 0;
        if (isNaN(val) || val < 0 || val > Number(drill.MaxScore)) {
          setErrorMsg(`Scores for ${players.find(p => p.playerId === pid)?.nickname || pid} must be 0-${drill.MaxScore}.`);
          return;
        }
      }
    }
    setSubmitting(true);

    // Compose logs
    const sessionId = generateSessionId();
    const logs = selectedPlayers.map(pid => ({
      playerId: pid,
      scores: Array.from({ length: sets }, (_, i) =>
        scores[pid]?.[i] !== undefined && scores[pid][i] !== "" ? Number(scores[pid][i]) : 0
      ),
      note: notes[pid] || "",
    }));

    try {
      const res = await fetch("/api/logTraining", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          DrillID: drill.DrillID,
          SessionID: sessionId,
          sets,
          logs,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setSuccessMsg("Training data logged!");
        setStep(1);
        setSelectedDrillId("");
        setSelectedPlayers([]);
        setSets(1);
        setScores({});
        setNotes({});
      } else {
        setErrorMsg(result.error || "Failed to log training.");
      }
    } catch {
      setErrorMsg("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- UI ---
  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg-gradient)" }}>
      <div className="page-container" style={{ width: "100%", maxWidth: 530, marginTop: 36, marginBottom: 36 }}>
        <h1 style={{ color: "var(--accent)", textAlign: "center", marginBottom: 18 }}>Enter Training Session</h1>
        {step === 1 ? (
          <form onSubmit={handleNextStep}>
            <label>
              Drill
              <div style={{ display: "flex", gap: 12 }}>
                <select
                  required
                  value={selectedDrillId}
                  onChange={e => setSelectedDrillId(e.target.value)}
                  style={{ width: "100%" }}
                  disabled={addingDrill}
                >
                  <option value="">Select a drill...</option>
                  {drills.map(d => (
                    <option key={d.DrillID} value={d.DrillID}>
                      {d.Name} — {d.skillTested} (max {d.MaxScore})
                    </option>
                  ))}
                </select>
                <button
  type="button"
  className="btn"
  style={{ padding: "0 1.1em", borderRadius: 13, minWidth: 90, fontSize: "1em" }}
  onClick={() => setAddingDrill(true)}
  disabled={addingDrill}
>Add Drill</button>
              </div>
            </label>
            {addingDrill && (
  <div style={{ marginTop: 18, background: "#181f2588", padding: 14, borderRadius: 10 }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
  <input
    placeholder="Drill name"
    value={newDrill.Name}
    onChange={e => setNewDrill({ ...newDrill, Name: e.target.value })}
    required
    style={{ width: "100%", minWidth: 0 }}
  />
  <input
    placeholder="Max score"
    type="number"
    min={1}
    value={newDrill.MaxScore}
    onChange={e => setNewDrill({ ...newDrill, MaxScore: e.target.value })}
    required
    style={{ width: "100%", minWidth: 0 }}
  />
  <input
    placeholder="Skill tested"
    value={newDrill.skillTested}
    onChange={e => setNewDrill({ ...newDrill, skillTested: e.target.value })}
    required
    style={{ width: "100%", minWidth: 0 }}
  />
</div>

    <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
      <button
        type="button"
        className="btn"
        style={{ flex: 1 }}
        disabled={submitting}
        onClick={async () => {
          setErrorMsg("");
          if (!newDrill.Name || !newDrill.MaxScore || !newDrill.skillTested) {
            setErrorMsg("All drill fields required.");
            return;
          }
          setSubmitting(true);
          try {
            const res = await fetch("/api/addDrill", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newDrill),
            });
            const result = await res.json();
            if (result.success && result.DrillID) {
              setDrills([...drills, { DrillID: result.DrillID, ...newDrill }]);
              setSelectedDrillId(result.DrillID);
              setAddingDrill(false);
              setNewDrill({ Name: "", MaxScore: "", skillTested: "" });
            } else {
              setErrorMsg(result.error || "Failed to add drill.");
            }
          } catch {
            setErrorMsg("Network error.");
          } finally {
            setSubmitting(false);
          }
        }}
      >Save Drill</button>
      <button
        type="button"
        className="btn"
        style={{ flex: 1, background: "#273036", color: "#fff" }}
        onClick={() => setAddingDrill(false)}
        disabled={submitting}
      >Cancel</button>
    </div>
    {errorMsg && <div style={{ color: "#ff8181", marginTop: 10, textAlign: "center" }}>{errorMsg}</div>}
  </div>
)}

            <label style={{ marginTop: 18, width: "100%" }}>
  Players (tap to select)
  <div style={{
    display: "flex", flexWrap: "wrap", gap: 8,
    marginTop: 8,
    background: "rgba(32,232,120,0.05)",
    borderRadius: 10,
    padding: "8px 0"
  }}>
    {players.map(p => {
      const checked = selectedPlayers.includes(p.playerId);
      return (
        <label
          key={p.playerId}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "4px 12px",
            borderRadius: 8,
            background: checked ? "var(--accent-glow)" : "transparent",
            color: checked ? "#181F25" : "var(--text-light)",
            fontWeight: checked ? 700 : 400,
            cursor: "pointer",
            minWidth: "46%"
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => {
              setSelectedPlayers(checked
                ? selectedPlayers.filter(id => id !== p.playerId)
                : [...selectedPlayers, p.playerId]);
            }}
            style={{ marginRight: 10, width: 18, height: 18 }}
          />
          {p.nickname ? `${p.nickname} (${p.name})` : p.name}
        </label>
      );
    })}
  </div>
</label>

            <label style={{ marginTop: 14 }}>
              Number of Sets
              <input
                type="number"
                min={1}
                max={30}
                value={sets}
                onChange={e => setSets(Number(e.target.value))}
                style={{ width: 120, marginLeft: 12 }}
              />
            </label>
            <button type="submit" className="btn" style={{ marginTop: 28, width: "100%" }}>Next: Enter Scores</button>
            {errorMsg && <div style={{ color: "#ff8181", marginTop: 12, textAlign: "center" }}>{errorMsg}</div>}
          </form>
        ) : (
          <form onSubmit={handleSubmitScores}>
            <div style={{ marginBottom: 12 }}>
              <b>{drill?.Name}</b> — <i>{drill?.skillTested}</i> (max per set: {drill?.MaxScore})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", marginBottom: 18 }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 100 }}>Player</th>
                    {[...Array(sets)].map((_, i) => (
                      <th key={i}>Set {i + 1}</th>
                    ))}
                    <th style={{ minWidth: 140 }}>Notes (optional)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPlayers.map(pid => (
                    <tr key={pid}>
                      <td style={{ fontWeight: 600 }}>
                        {players.find(p => p.playerId === pid)?.nickname || players.find(p => p.playerId === pid)?.name || pid}
                      </td>
                      {[...Array(sets)].map((_, i) => (
                        <td key={i}>
                          <input
                            type="number"
                            min={0}
                            max={drill?.MaxScore || 100}
                            value={scores[pid]?.[i] ?? ""}
                            onChange={e => handleScoreChange(pid, i, e.target.value)}
                            style={{ width: 70 }}
                          />
                        </td>
                      ))}
                      <td>
                        <input
                          type="text"
                          value={notes[pid] || ""}
                          onChange={e => handleNoteChange(pid, e.target.value)}
                          style={{ width: 130 }}
                          maxLength={90}
                          placeholder="Notes"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" className="btn" style={{ width: "40%", borderRadius: 15 }} onClick={handleBackStep}>Back</button>
              <button type="submit" className="btn" style={{ width: "60%", borderRadius: 15 }} disabled={submitting}>
                {submitting ? "Logging..." : "Log Training"}
              </button>
            </div>
            {errorMsg && <div style={{ color: "#ff8181", marginTop: 12, textAlign: "center" }}>{errorMsg}</div>}
            {successMsg && <div style={{ color: "#24FF8A", marginTop: 12, textAlign: "center" }}>{successMsg}</div>}
          </form>
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
