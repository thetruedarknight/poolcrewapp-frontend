import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { matchId } = req.body;
    if (!matchId) return res.status(400).json({ error: "Missing matchId" });

    const client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const private_key = process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n");
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;

    const jwt = new google.auth.JWT(client_email, null, private_key, [
      "https://www.googleapis.com/auth/spreadsheets",
    ]);
    const sheets = google.sheets({ version: "v4", auth: jwt });

    // 1. Get all matches and find row to delete
    const getResp = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Matches!A2:M", // Adjust for your columns
    });
    const rows = getResp.data.values || [];
    const idx = rows.findIndex(row => row[0] === matchId);
    if (idx === -1) return res.status(404).json({ error: "Match not found" });

    // 2. Use Google Sheets API to delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 1517965271,      // Usually 0 for first sheet. Change if needed!
                dimension: "ROWS",
                startIndex: idx + 1, // +1 since row 0 is headers (A1), idx=0 is A2
                endIndex: idx + 2    // just this row
              }
            }
          }
        ]
      }
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
