import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { Name, MaxScore, skillTested } = req.body;
    if (!Name || !MaxScore || !skillTested) return res.status(400).json({ error: "Missing required fields" });

    const client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const private_key = process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n");
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;

    const jwt = new google.auth.JWT(client_email, null, private_key, [
      "https://www.googleapis.com/auth/spreadsheets",
    ]);
    const sheets = google.sheets({ version: "v4", auth: jwt });

    // Generate DrillID: D + timestamp + random
    const DrillID = "D" + Date.now() + Math.floor(Math.random() * 9000 + 1000);

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Drills!A2:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[DrillID, Name, MaxScore, skillTested]],
      },
    });

    res.status(200).json({ success: true, DrillID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
