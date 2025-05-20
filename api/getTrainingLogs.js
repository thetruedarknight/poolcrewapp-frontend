import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const private_key = process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n");
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;

    const jwt = new google.auth.JWT(client_email, null, private_key, [
      "https://www.googleapis.com/auth/spreadsheets",
    ]);
    const sheets = google.sheets({ version: "v4", auth: jwt });

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "TrainingLogs!A2:G",
    });

    const logs = (resp.data.values || []).map(row => ({
      Date: row[0],
      SessionID: row[1],
      DrillID: row[2],
      PlayerID: row[3],
      SetNumber: row[4],
      Score: row[5],
      Notes: row[6] || "",
    }));

    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
