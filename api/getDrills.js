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
      range: "Drills!A2:D",
    });

    const drills = (resp.data.values || []).map(row => ({
      DrillID: row[0],
      Name: row[1],
      MaxScore: row[2],
      skillTested: row[3],
    }));

    res.status(200).json(drills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
