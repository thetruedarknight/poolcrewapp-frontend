import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { playerId } = req.body;
    if (!playerId) return res.status(400).json({ error: 'Missing playerId' });

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

    // Load all players
    const range = 'Players!A1:H';
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
    const rows = resp.data.values;
    const [header, ...data] = rows;

    // Find the player
    const idx = data.findIndex(row => row[0] === playerId);
    if (idx === -1) return res.status(404).json({ error: 'Player not found' });

    const runoutIdx = header.indexOf("Runouts");
    if (runoutIdx === -1) return res.status(500).json({ error: "Runouts column not found" });

    // Increment runout count
    const current = parseInt(data[idx][runoutIdx] || "0", 10);
    data[idx][runoutIdx] = (current + 1).toString();

    // Write the updated row
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Players!A${idx + 2}:H${idx + 2}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [data[idx]] }
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
