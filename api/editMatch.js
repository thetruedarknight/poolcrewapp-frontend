import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      matchId,         // required
      winnerId,
      scoreA,
      scoreB,
      runout,         // for 1v1: "Y" or "" (blank)
      runoutA,        // for race: number or ""
      runoutB,        // for race: number or ""
      gameType,
      sessionType
    } = req.body;

    if (!matchId) return res.status(400).json({ error: "Missing matchId" });

    const client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const private_key = process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n");
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;

    const jwt = new google.auth.JWT(client_email, null, private_key, [
      "https://www.googleapis.com/auth/spreadsheets",
    ]);
    const sheets = google.sheets({ version: "v4", auth: jwt });

    // 1. Get all matches and find the row to update
    const getResp = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Matches!A2:M", // Adjust to your sheet columns/range
    });
    const rows = getResp.data.values || [];
    const idx = rows.findIndex(row => row[0] === matchId);
    if (idx === -1) return res.status(404).json({ error: "Match not found" });

    // 2. Update only the fields provided
    const headers = [
      "matchId","sessionId","date","sessionType","gameType","playerAId","playerBId",
      "winnerId","scoreA","scoreB","runout","runoutA","runoutB"
    ];
    let row = rows[idx];
    if (winnerId !== undefined) row[7] = winnerId;
    if (scoreA !== undefined) row[8] = scoreA;
    if (scoreB !== undefined) row[9] = scoreB;
    if (runout !== undefined) row[10] = runout;
    if (runoutA !== undefined) row[11] = runoutA;
    if (runoutB !== undefined) row[12] = runoutB;
    if (gameType !== undefined) row[4] = gameType;
    if (sessionType !== undefined) row[3] = sessionType;

    // 3. Write back the updated row (row number = idx+2, since A2 = index 0)
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Matches!A${idx + 2}:M${idx + 2}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
