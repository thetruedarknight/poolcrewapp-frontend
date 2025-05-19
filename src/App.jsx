// src/App.jsx

import React, { useState } from "react";
import LeaderboardPage from "./pages/LeaderboardPage";
import PlayerStatsPage from "./pages/PlayerStatsPage";
import EnterNew1v1Page from "./pages/EnterNew1v1Page";

// Menu options with icons (removed "View Individual Stats")
const menuOptions = [
  {
    label: "View Leaderboard",
    icon: "🏆",
    view: "leaderboard",
  },
  {
    label: "View Match History",
    icon: "📜",
    view: "matchHistory",
  },
  {
    label: "Enter New 1v1",
    icon: "⚔️",
    view: "new1v1",
  },
  {
    label: "Enter New Race",
    icon: "🏁",
    view: "newRace",
  },
  // {
  //   label: "View Individual Stats",
  //   icon: "👤",
  //   view: "playerStats",
  // },
  {
    label: "View Head to Head Stats",
    icon: "🤝",
    view: "headToHead",
  },
  {
    label: "Add New Player",
    icon: "➕",
    view: "addPlayer",
  },
  {
    label: "Enter Training Session",
    icon: "🎱",
    view: "trainingSession",
  },
  {
    label: "View Training Data",
    icon: "📊",
    view: "trainingData",
  },
];

function MainMenu({ onSelect }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start"
      style={{ background: "var(--bg-gradient)" }}
    >
      <main className="w-full flex-1 flex flex-col items-center px-2 py-8">
        <div className="w-full flex flex-col items-center mb-6">
          <h1
            style={{
              color: "var(--accent)",
              fontWeight: "bold",
              fontSize: "2.4em",
              letterSpacing: "-0.02em",
              textShadow: "0 2px 24px #11cf6b55",
              marginBottom: 0,
              textAlign: "center",
              width: "100%",
              display: "block",
            }}
          >
            PoolCrew
          </h1>
        </div>

        <div
          className="grid gap-4 w-full"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            maxWidth: 520,
            margin: "0 auto",
          }}
        >
          {menuOptions.map((option) => (
            <button
              key={option.label}
              className="flex flex-col items-center justify-center rounded-2xl shadow-lg px-4 py-6 transition transform hover:scale-105"
              style={{
                background: "var(--glass-bg)",
                border: "var(--glass-border)",
                boxShadow: "var(--shadow)",
                color: "var(--text-light)",
                minHeight: 120,
                fontSize: "1.15em",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
              onClick={() => onSelect(option.view)}
            >
              <span
                style={{
                  fontSize: "2.3em",
                  marginBottom: 8,
                  color: "var(--accent-glow)",
                  textShadow: "0 2px 16px var(--accent-glow)",
                }}
              >
                {option.icon}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

// Fixed bottom button for all non-menu views
function FixedBottomButton({ children, onClick }) {
  return (
    <button
      className="btn fixed-bottom-nav"
      style={{
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        zIndex: 100,
        borderRadius: 0,
        boxShadow: "0 -2px 28px #57efb2b2",
        background: "linear-gradient(90deg, #20e878 0%, #2ad493 100%)",
        color: "#1a2b20",
        fontSize: "1.18em",
        fontWeight: 700,
        padding: "1.2em 0",
        border: "none",
        textAlign: "center",
        letterSpacing: "0.04em",
        position: "fixed",
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function App() {
  const [view, setView] = useState("menu");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Show Leaderboard, pass player click handler
  if (view === "leaderboard") {
    return (
      <>
        <LeaderboardPage
          onBackToMenu={() => setView("menu")}
          onPlayerClick={(player) => {
            setSelectedPlayer(player);
            setView("playerStats");
          }}
        />
        <FixedBottomButton onClick={() => setView("menu")}>
          Return to Main Menu
        </FixedBottomButton>
      </>
    );
  }
  if (view === "new1v1") {
  return (
    <>
      <EnterNew1v1Page onBackToMenu={() => setView("menu")} />
    </>
  );
}

  // Show Player Stats page
  if (view === "playerStats" && selectedPlayer) {
    return (
      <>
        <PlayerStatsPage
          player={selectedPlayer}
          onBackToLeaderboard={() => setView("leaderboard")}
          onBackToMenu={() => setView("menu")}
        />
        <FixedBottomButton onClick={() => setView("leaderboard")}>
          Return to Leaderboard
        </FixedBottomButton>
      </>
    );
  }

  // Placeholder for other pages
  if (view !== "menu") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "var(--bg-gradient)", paddingBottom: 96 }}
      >
        <h2 style={{ color: "#fff", marginTop: 28, fontWeight: 600 }}>This page is coming soon!</h2>
        <FixedBottomButton onClick={() => setView("menu")}>
          Return to Main Menu
        </FixedBottomButton>
      </div>
    );
  }

  // Main Menu
  return <MainMenu onSelect={setView} />;
}

export default App;
