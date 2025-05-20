import React, { useState } from "react";

const COLORS = [
  "#F94144", "#F3722C", "#F8961E", "#F9C74F",
  "#90BE6D", "#43AA8B", "#4ECDC4", "#1A8FE3", "#5C4D7D", "#78FFA3"
];

export default function AddPlayerPage({ onBackToMenu, onBackToLeaderboard }) {
  const [form, setForm] = useState({
    name: "",
    nickname: "",
    avatarUrl: "",
    color: COLORS[COLORS.length - 1],
    startingRating: "1200"
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/addPlayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        setSuccess("Player added!");
        setForm({
          name: "",
          nickname: "",
          avatarUrl: "",
          color: COLORS[COLORS.length - 1],
          startingRating: "1200"
        });
      } else {
        setError(result.error || "Failed to add player");
      }
    } catch (e) {
      setError("Failed to connect.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg-gradient)" }}>
      <div className="page-container" style={{ width: "100%", maxWidth: 410, marginTop: 36, marginBottom: 36 }}>
        <h1 style={{ color: "var(--accent)", textAlign: "center", marginBottom: 20 }}>Add New Player</h1>
        <form onSubmit={handleSubmit} autoComplete="off">
          <label>
            Name
            <input
              required
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Player's full name"
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Nickname (shown in app)
            <input
              name="nickname"
              value={form.nickname}
              onChange={handleChange}
              placeholder="e.g. Texas"
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Avatar Image URL (optional)
            <input
              name="avatarUrl"
              value={form.avatarUrl}
              onChange={handleChange}
              placeholder="Paste image URL or leave blank"
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Player Color
            <select name="color" value={form.color} onChange={handleChange} style={{ width: "100%" }}>
              {COLORS.map((color) => (
                <option key={color} value={color} style={{ background: color, color: "#222" }}>
                  {color}
                </option>
              ))}
            </select>
          </label>
          <label>
            Starting Rating
            <input
              name="startingRating"
              type="number"
              min={600}
              max={3000}
              step={1}
              value={form.startingRating}
              onChange={handleChange}
              style={{ width: "100%" }}
            />
          </label>
          <button
            type="submit"
            className="btn"
            disabled={submitting}
            style={{ marginTop: 22, width: "100%", borderRadius: 17 }}
          >
            {submitting ? "Adding..." : "Add Player"}
          </button>
          {success && <div style={{ color: "#24FF8A", marginTop: 10, textAlign: "center" }}>{success}</div>}
          {error && <div style={{ color: "#ff8181", marginTop: 10, textAlign: "center" }}>{error}</div>}
        </form>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30, gap: 16 }}>
          <button className="btn" style={{ width: "48%", borderRadius: 15 }} onClick={onBackToMenu}>Main Menu</button>
          <button className="btn" style={{ width: "48%", borderRadius: 15 }} onClick={onBackToLeaderboard}>Leaderboard</button>
        </div>
      </div>
    </div>
  );
}
