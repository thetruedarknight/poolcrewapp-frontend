import { google } from "googleapis";
// at top of file:
function getTrinidadDate() {
  const now = new Date();
  now.setHours(now.getHours() - 4);
  return now.toISOString().split("T")[0];
}
// then:
const _date = date || getTrinidadDate();

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Parse POST body
    const {
      matchId,
      sessionId,
      date,
      sessionType, // "1v1" or "race"
      gameType,
      playerAId,
      playerBId,
      winnerId,
      scoreA,
      scoreB,
      runout,    // "Y" or "N" for 1v1; undefined for race
      runoutA,   // number (for race)
      runoutB    // number (for race)
    } = req.body;

    // Minimal validation
    if (!matchId || !sessionId || !date || !sessionType || !gameType || !playerAId || !playerBId || !winnerId) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const private_key = process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n");
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;

    const jwt = new google.auth.JWT(client_email, null, private_key, [
      "https://www.googleapis.com/auth/spreadsheets",
    ]);
    const sheets = google.sheets({ version: "v4", auth: jwt });

    // Build row (adjust order to match your actual sheet!)
    let row;
    if (sessionType === "1v1") {
      // 1v1: runout is "Y" or "N", runoutA/runoutB are blank
      row = [
        matchId,
        sessionId,
        date,
        sessionType,
        gameType,
        playerAId,
        playerBId,
        winnerId,
        "", // scoreA
        "", // scoreB
        runout === "Y" ? "Y" : "", // Runout
        "", // Runout A
        ""  // Runout B
      ];
    } else if (sessionType === "race") {
      // Race: runout is blank, runoutA/runoutB are integer strings
      row = [
        matchId,
        sessionId,
        date,
        sessionType,
        gameType,
        playerAId,
        playerBId,
        winnerId,
        scoreA ?? "",
        scoreB ?? "",
        "", // Runout
        runoutA > 0 ? String(runoutA) : "", // Runout A
        runoutB > 0 ? String(runoutB) : ""  // Runout B
      ];
    } else {
      return res.status(400).json({ error: "Invalid sessionType." });
    }

    // Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Matches!A2:M", // Adjust range to fit your sheet columns!
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
