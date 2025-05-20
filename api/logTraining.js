import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { DrillID, SessionID, sets, date, logs } = req.body;
    // logs: Array of { playerId, scores: [], note }
    if (!DrillID || !SessionID || !sets || !Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const private_key = process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n");
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;

    const jwt = new google.auth.JWT(client_email, null, private_key, [
      "https://www.googleapis.com/auth/spreadsheets",
    ]);
    const sheets = google.sheets({ version: "v4", auth: jwt });

    // Trinidad is GMT-4
function getTrinidadDate() {
  const now = new Date();
  // get UTC time, subtract 4 hours (Trinidad time zone)
  now.setHours(now.getHours() - 4);
  return now.toISOString().split("T")[0];
}
const today = date || getTrinidadDate();


    let rows = [];
    logs.forEach(({ playerId, scores, note }) => {
      for (let i = 0; i < sets; ++i) {
        rows.push([
          today,
          SessionID,
          DrillID,
          playerId,
          i + 1, // set number (1-based)
          scores[i] !== undefined ? scores[i] : 0,
          note || "",
        ]);
      }
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "TrainingLogs!A2:G",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rows },
    });

    res.status(200).json({ success: true, logged: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
