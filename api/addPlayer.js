import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
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

    // Destructure incoming fields
    const {
      name, nickname, avatarUrl, color, startingRating
    } = req.body;

    // Generate a unique playerId
    const playerId = "P" + Date.now() + Math.floor(Math.random() * 9000 + 1000);

    // Format the row to match your sheet
    const row = [
      playerId,
      name,
      nickname || "",
      avatarUrl || "",
      color || "#78FFA3",
      startingRating || "1200",
      startingRating || "1200", // Also set current rating initially
      0 // Runouts
    ];

    // Append to the Players sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Players',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });

    res.status(200).json({ success: true, playerId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
