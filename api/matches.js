import { google } from "googleapis";

function getTrinidadDate() {
  const now = new Date();
  const localeOptions = {
    timeZone: 'America/Port_of_Spain',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false
  };
  // "20/05/2025"
  const dateStr = now.toLocaleDateString('en-GB', localeOptions);
  // Format date to "YYYY-MM-DD"
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}-${day}`;
}

export default async function handler(req, res) {
  const {
    action // "get" | "add" | "edit" | "delete"
  } = req.method === "GET" ? req.query : req.body;

  const client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const private_key = process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n");
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
  // Get your actual Matches sheetId from #gid=... in your spreadsheet URL:
  const matchesSheetId = 1517965271; // <--- Replace with YOUR sheetId

  const jwt = new google.auth.JWT(client_email, null, private_key, [
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
  const sheets = google.sheets({ version: "v4", auth: jwt });

  try {
    // ------------------
    // GET MATCHES
    // ------------------
    if ((req.method === "GET" && (!action || action === "get")) ||
        (req.method === "POST" && action === "get")) {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "Matches!A2:M",
      });
      const rows = resp.data.values || [];
      const result = rows.map(row => ({
        matchId: row[0],
        sessionId: row[1],
        date: row[2],
        sessionType: row[3],
        gameType: row[4],
        playerAId: row[5],
        playerBId: row[6],
        winnerId: row[7],
        scoreA: row[8],
        scoreB: row[9],
        runout: row[10],
        runoutA: row[11],
        runoutB: row[12]
      }));
      return res.status(200).json(result);
    }

    // ------------------
    // ADD MATCH
    // ------------------
    if (req.method === "POST" && action === "add") {
      const {
        matchId, sessionId, date, sessionType, gameType,
        playerAId, playerBId, winnerId, scoreA, scoreB, runout, runoutA, runoutB
      } = req.body;
      if (!matchId || !sessionId || !sessionType || !gameType || !playerAId || !playerBId || !winnerId) {
        return res.status(400).json({ error: "Missing required fields." });
      }
      const trinidadDate = date || getTrinidadDate();
      let row;
      if (sessionType === "1v1") {
        row = [
          matchId, sessionId, trinidadDate, sessionType, gameType,
          playerAId, playerBId, winnerId, "", "", runout === "Y" ? "Y" : "", "", ""
        ];
      } else if (sessionType === "race") {
        row = [
          matchId, sessionId, trinidadDate, sessionType, gameType,
          playerAId, playerBId, winnerId, scoreA ?? "", scoreB ?? "",
          "", runoutA > 0 ? String(runoutA) : "", runoutB > 0 ? String(runoutB) : ""
        ];
      } else {
        return res.status(400).json({ error: "Invalid sessionType." });
      }
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "Matches!A2:M",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
      });
      return res.status(200).json({ success: true });
    }

    // ------------------
    // EDIT MATCH (no date change here)
    // ------------------
    if (req.method === "POST" && action === "edit") {
      const {
        matchId, winnerId, scoreA, scoreB, runout, runoutA, runoutB, gameType, sessionType
      } = req.body;
      if (!matchId) return res.status(400).json({ error: "Missing matchId" });

      // Get all matches and find the row to update
      const getResp = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "Matches!A2:M",
      });
      const rows = getResp.data.values || [];
      const idx = rows.findIndex(row => row[0] === matchId);
      if (idx === -1) return res.status(404).json({ error: "Match not found" });
      let row = rows[idx];
      if (winnerId !== undefined) row[7] = winnerId;
      if (scoreA !== undefined) row[8] = scoreA;
      if (scoreB !== undefined) row[9] = scoreB;
      if (runout !== undefined) row[10] = runout;
      if (runoutA !== undefined) row[11] = runoutA;
      if (runoutB !== undefined) row[12] = runoutB;
      if (gameType !== undefined) row[4] = gameType;
      if (sessionType !== undefined) row[3] = sessionType;
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `Matches!A${idx + 2}:M${idx + 2}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
      });
      return res.status(200).json({ success: true });
    }

    // ------------------
    // DELETE MATCH
    // ------------------
    if (req.method === "POST" && action === "delete") {
      const { matchId } = req.body;
      if (!matchId) return res.status(400).json({ error: "Missing matchId" });
      // Get all matches and find row to delete
      const getResp = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "Matches!A2:M",
      });
      const rows = getResp.data.values || [];
      const idx = rows.findIndex(row => row[0] === matchId);
      if (idx === -1) return res.status(404).json({ error: "Match not found" });

      // Delete row: Google uses "sheetId" as in spreadsheet, not spreadsheetId
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: matchesSheetId, // <-- your Matches tab's sheetId
                  dimension: "ROWS",
                  startIndex: idx + 1, // +1 because A2 = idx 0, but row 1 is header
                  endIndex: idx + 2
                }
              }
            }
          ]
        }
      });
      return res.status(200).json({ success: true });
    }

    // --- If nothing matched:
    return res.status(400).json({ error: "Invalid action" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
