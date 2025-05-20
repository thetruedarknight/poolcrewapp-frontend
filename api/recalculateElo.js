import { google } from 'googleapis';

const K_FACTOR = 32; // change as needed

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Auth
    const client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const private_key = process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
    const jwt = new google.auth.JWT(
      client_email,
      null,
      private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    const sheets = google.sheets({ version: 'v4', auth: jwt });

    // Load Players
    const playersRange = 'Players!A1:H';
    const playersResp = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId, range: playersRange
    });
    const playersRows = playersResp.data.values;
    const [playersHeader, ...playersData] = playersRows;
    const playersById = {};
    playersData.forEach(row => {
      const player = {};
      playersHeader.forEach((h, i) => (player[h] = row[i]));
      player.startingRating = parseInt(player.startingRating, 10) || 1200;
      player["Current Rating"] = player.startingRating;
      playersById[player.playerId] = player;
    });

    // Load Matches, ordered by date then matchId (stable)
    const matchesRange = 'Matches!A1:J';
    const matchesResp = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId, range: matchesRange
    });
    const matchesRows = matchesResp.data.values;
    const [matchesHeader, ...matchesData] = matchesRows;
    const matches = matchesData.map(row => {
      const m = {};
      matchesHeader.forEach((h, i) => (m[h] = row[i]));
      return m;
    }).sort((a, b) => {
      const da = new Date(a.date), db = new Date(b.date);
      return da - db || (a.matchId || '').localeCompare(b.matchId || '');
    });

    // Prepare RatingHistory: { [playerId]: [ {date, rating} ] }
    const ratingHistory = {};
    Object.values(playersById).forEach(p => {
      ratingHistory[p.playerId] = [{
        date: "", // Will skip blank date in final output
        rating: p.startingRating
      }];
    });

    // Process each match
    for (const match of matches) {
      // Only process 1v1 or race
      if (!match.playerAId || !match.playerBId || !match.winnerId) continue;
      const A = playersById[match.playerAId];
      const B = playersById[match.playerBId];
      if (!A || !B) continue;

      let winsForWinner = 1;
      if (match.sessionType && match.sessionType.toLowerCase().includes("race")) {
        // Use the absolute score difference (ex: 7-4 => 3)
        const scoreA = parseInt(match.scoreA, 10) || 0;
        const scoreB = parseInt(match.scoreB, 10) || 0;
        winsForWinner = Math.abs(scoreA - scoreB);
        if (winsForWinner < 1) winsForWinner = 1;
      }

      const winner = match.winnerId === A.playerId ? A : B;
      const loser = match.winnerId === A.playerId ? B : A;

      for (let i = 0; i < winsForWinner; ++i) {
        // Calculate expected scores
        const expectedWin = 1 / (1 + Math.pow(10, (loser["Current Rating"] - winner["Current Rating"]) / 400));
        const expectedLose = 1 / (1 + Math.pow(10, (winner["Current Rating"] - loser["Current Rating"]) / 400));
        // Update ratings
        winner["Current Rating"] = Math.round(winner["Current Rating"] + K_FACTOR * (1 - expectedWin));
        loser["Current Rating"] = Math.round(loser["Current Rating"] + K_FACTOR * (0 - expectedLose));
        // Push history for this match
        ratingHistory[winner.playerId].push({
          date: match.date,
          rating: winner["Current Rating"]
        });
        ratingHistory[loser.playerId].push({
          date: match.date,
          rating: loser["Current Rating"]
        });
      }
    }

    // Update Players sheet with new Current Ratings
    // We'll overwrite the "Current Rating" column for each player (index 6)
    for (let i = 0; i < playersData.length; ++i) {
      const playerId = playersData[i][0];
      if (playersById[playerId]) {
        playersData[i][6] = String(playersById[playerId]["Current Rating"]);
      }
    }
    // Write back to Players sheet (keep header)
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Players!A2:H${playersData.length + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: playersData }
    });

    // Rewrite RatingHistory tab
    // Format: date, playerId, rating (one row per entry, no blank date rows)
    const ratingHistoryRows = [];
    Object.entries(ratingHistory).forEach(([playerId, entries]) => {
      entries.forEach(e => {
        if (e.date) {
          ratingHistoryRows.push([e.date, playerId, e.rating]);
        }
      });
    });
    // Sort by date then playerId
    ratingHistoryRows.sort((a, b) => new Date(a[0]) - new Date(b[0]) || (a[1] || '').localeCompare(b[1] || ''));

    // Clear and write the full history
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'RatingHistory!A2:C'
    });
    if (ratingHistoryRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'RatingHistory!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: ratingHistoryRows }
      });
    }

    res.status(200).json({
      success: true,
      playerRatings: Object.values(playersById).map(p => ({
        playerId: p.playerId,
        name: p.name,
        rating: p["Current Rating"]
      })),
      numMatches: matches.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
