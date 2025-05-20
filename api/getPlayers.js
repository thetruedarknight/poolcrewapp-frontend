import { google } from 'googleapis';

export default async function handler(req, res) {
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

    const range = 'Players!A1:H'; // matches your sheet's 8 columns
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    const rows = response.data.values;
    const [header, ...rest] = rows;
    const players = rest.map(row => {
      const obj = {};
      header.forEach((key, i) => obj[key] = row[i]);
      return obj;
    });

    res.status(200).json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
