import { google } from "googleapis";

function getTrinidadDateTime() {
  const now = new Date();
  const localeOptions = {
    timeZone: 'America/Port_of_Spain',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  const trinidadDateTime = now.toLocaleString('en-GB', localeOptions); // "20/05/2025, 13:26:55"
  const [dateStr, timeStr] = trinidadDateTime.split(',').map(s => s.trim());
  const [day, month, year] = dateStr.split('/');
  const isoDate = `${year}-${month}-${day}`; // "2025-05-20"
  const isoTime = timeStr; // "13:26:55"
  return { isoDate, isoTime };
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    // 1. Auth
    const client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const private_key = process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n");
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
    const jwt = new google.auth.JWT(
      client_email,
      null,
      private_key,
      ["https://www.googleapis.com/auth/spreadsheets"]
    );
    const sheets = google.sheets({ version: "v4", auth: jwt });

    // 2. Load all players
    const playersResp = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Players!A1:Z"
    });
    const playerRows = playersResp.data.values;
    const header = playerRows[0];
    const players = playerRows.slice(1);

    // 3. Load all matches
    const matchesResp = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Matches!A1:Z"
    });
    const matchHeader = matchesResp.data.values[0];
    const matchRows = matchesResp.data.values.slice(1);

    // 4. Column indices
    const playerIdIndex = header.indexOf("playerId");
    const ratingColIndex = header.indexOf("Current Rating"); // Adjust if different

    if (playerIdIndex === -1) throw new Error("playerId column not found in Players sheet header");
    if (ratingColIndex === -1) throw new Error("Current Rating column not found in Players sheet header");

    // Match indices
    const mPlayerAIdx = matchHeader.indexOf("playerAId");
    const mPlayerBIdx = matchHeader.indexOf("playerBId");
    const mWinnerIdx = matchHeader.indexOf("winnerId");
    const mSessionTypeIdx = matchHeader.indexOf("sessionType");
    const mScoreAIdx = matchHeader.indexOf("scoreA");
    const mScoreBIdx = matchHeader.indexOf("scoreB");

    // 5. Prepare matches
    const matches = matchRows
      .filter(row => row[mSessionTypeIdx])
      .map(row => ({
        sessionType: row[mSessionTypeIdx],
        playerAId: row[mPlayerAIdx],
        playerBId: row[mPlayerBIdx],
        winnerId: row[mWinnerIdx],
        scoreA: row[mScoreAIdx],
        scoreB: row[mScoreBIdx],
      }));

    // 6. ELO Calculation (basic, as before)
    const INITIAL_ELO = 1200;
    const K = 32;
    const eloByPlayer = {};
    players.forEach(row => {
      const pid = row[playerIdIndex];
      eloByPlayer[pid] = INITIAL_ELO;
    });

    matches.forEach(match => {
      const { sessionType, playerAId, playerBId, winnerId, scoreA, scoreB } = match;
      if (!playerAId || !playerBId || !winnerId) return;

      let numGames = 1;
      if (sessionType === "race") {
        const a = Number(scoreA || 0), b = Number(scoreB || 0);
        numGames = Math.abs(a - b);
        if (numGames < 1) numGames = 1;
      }

      let loserId = (winnerId === playerAId) ? playerBId : playerAId;

      for (let i = 0; i < numGames; ++i) {
        const Ra = eloByPlayer[winnerId] || INITIAL_ELO;
        const Rb = eloByPlayer[loserId] || INITIAL_ELO;
        const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
        eloByPlayer[winnerId] = Math.round(Ra + K * (1 - Ea));
        eloByPlayer[loserId] = Math.round(Rb + K * (0 - (1 - Ea)));
      }
    });

    // 7. Only update the Current Rating in the Players sheet (leave Runouts alone!)
    players.forEach(row => {
      const playerId = row[playerIdIndex];
      row[ratingColIndex] = eloByPlayer[playerId] || INITIAL_ELO;
    });
    const outputRows = players.map(row => row.slice(0, 7));
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Players!A2:G`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: outputRows },
    });

    // 8. Append current ratings to RatingHistory tab (with Trinidad local time)
    const { isoDate, isoTime } = getTrinidadDateTime();
    const historyRows = players.map(row => [
      isoDate,                   // Date
      isoTime,                   // Time
      row[playerIdIndex],        // playerId
      row[header.indexOf("nickname")] || row[header.indexOf("name")], // Nickname/Name
      row[ratingColIndex],       // Current Rating (after recalc)
    ]);
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "RatingHistory!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: historyRows },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Recalculate ELO Error:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}
