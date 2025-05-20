import React, { useState } from "react";
import LeaderboardPage from "./pages/LeaderboardPage";
import PlayerStatsPage from "./pages/PlayerStatsPage";
import AddPlayerPage from "./pages/AddPlayerPage";
import EnterNew1v1Page from "./pages/EnterNew1v1Page";
import EnterNewRacePage from "./pages/EnterNewRacePAge";
import TrainingLogPage from "./pages/TrainingLogPage";
import ViewTrainingDataPage from "./pages/ViewTrainingPage";
import HeadToHeadPage from "./pages/HeadToHeadPage";
import MatchHistoryPage from "./pages/MatchHistoryPage";
// import MainMenu from "./pages/MainMenu"; // Uncomment if you have a menu page

function App() {
  const [view, setView] = useState("menu"); // "menu" | "leaderboard" | "playerStats"
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  

  // Main Menu (replace with your MainMenu component if you have it)
  function MainMenu() {
  const menuOptions = [
    { label: "View Leaderboard", value: "leaderboard" },
    { label: "View Match History", value: "matchHistory" },
    { label: "Enter New 1v1", value: "enter1v1" },
    { label: "Enter New Race", value: "enterRace" },
    { label: "Head to Head Comparison", value: "headToHead"},
    { label: "Add New Player", value: "addPlayer" },
    { label: "Enter Training Session", value: "trainingLog" },
    { label: "View Training Data", value: "viewTrainingData" }
    
    
    // Add more menu options here if you want!
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "var(--bg-gradient)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <h1
        style={{
          color: "var(--accent)",
          fontWeight: "bold",
          fontSize: "2.2em",
          marginBottom: 36,
          textAlign: "center",
        }}
      >
        Pool Crew
      </h1>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "22px",
          width: "100%",
          maxWidth: 320,
        }}
      >
        {menuOptions.map((opt) => (
          <button
            key={opt.value}
            className="btn"
            style={{
              width: 220,
              fontSize: "1.15em",
              borderRadius: 17,
              fontWeight: 700,
              textAlign: "center",
              background: "linear-gradient(90deg, #20e878 0%, #42E2F7 100%)",
              boxShadow: "0 2px 18px #57efb2c4"
            }}
            onClick={() => setView(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}



  // Navigation handlers
  const handlePlayerClick = (player) => {
    setSelectedPlayer(player);
    setView("playerStats");
  };
  const handleBackToLeaderboard = () => setView("leaderboard");
  const handleBackToMenu = () => setView("menu");

  // Routing logic
  if (view === "leaderboard") {
    return (
      <>
        <LeaderboardPage
          onPlayerClick={handlePlayerClick}
        />
        <button
          className="btn fixed-bottom-nav"
          onClick={handleBackToMenu}
        >
          Return to Main Menu
        </button>
      </>
    );
  }

  if (view === "playerStats" && selectedPlayer) {
    return (
      <>
        <PlayerStatsPage
          player={selectedPlayer}
          onBackToLeaderboard={handleBackToLeaderboard}
          onBackToMenu={handleBackToMenu}
        />
        <button
          className="btn fixed-bottom-nav"
          onClick={handleBackToLeaderboard}
        >
          Return to Leaderboard
        </button>
      </>
    );
  }
  if (view === "addPlayer") {
    return (
      <AddPlayerPage
        onBackToMenu={() => setView("menu")}
        onBackToLeaderboard={() => setView("leaderboard")}
      />
    );
  }
  if (view === "enter1v1") {
  return (
    <EnterNew1v1Page
      onBackToMenu={() => setView("menu")}
      onBackToLeaderboard={() => setView("leaderboard")}
    />
  );
}
if (view === "enterRace") {
  return (
    <EnterNewRacePage
      onBackToMenu={() => setView("menu")}
      onBackToLeaderboard={() => setView("leaderboard")}
    />
  );
}
if (view === "trainingLog") {
  return <TrainingLogPage onBackToMenu={() => setView("menu")} />;
}
if (view === "viewTrainingData") {
  return <ViewTrainingDataPage onBackToMenu={() => setView("menu")} />;
}

if (view === "headToHead") {
  return <HeadToHeadPage onBackToMenu={() => setView("menu")} />;
}
if (view === "matchHistory") {
  return <MatchHistoryPage onBackToMenu={() => setView("menu")} />;
}
  // Default to main menu
  return <MainMenu />;
}

export default App;
