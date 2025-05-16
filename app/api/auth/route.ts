// app/api/auth/route.ts

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'No ID provided' }, { status: 400 });
  }

  // Check if the ID is the teacher's ID
  /*if (id === 'teacher123') {
    return NextResponse.json({ role: 'teacher' });
  }*/

  // Authenticate with Google Sheets API
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    return NextResponse.json(
      { error: 'Service account key not provided' },
      { status: 500 }
    );
  }

  const decodedKey = JSON.parse(
    Buffer.from(serviceAccountKey, 'base64').toString('utf8')
  );

  const auth = new google.auth.GoogleAuth({
    credentials: decodedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  try {
    const res = await sheets.spreadsheets.values.get({spreadsheetId, range: 'GraderLogin!A:B'});
    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No data found in the GraderLogin sheet' }, { status: 500 });
    }
    for (const row of rows.slice(1)) {
      const login = row[0];
      const gradingId = row[1];
      if (login === id) {
      // Return the grader's role and name
      return NextResponse.json({ role: 'grader', gradingId: gradingId });
      }
    }
  } catch (error) {
    console.error('Error accessing Google Sheets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (id === 'grading') {
    

    return NextResponse.json({ role: 'grading', user: '' });
  }

  try {
    // Fetch data from the "Data" sheet
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Data!A:E', // Adjust the range if needed
    });

    const rows = res.data.values;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No data found in the Data sheet' }, { status: 500 });
    }

    // Get the indices of the relevant columns
    const headerRow = rows[0];
    const nameIndex = headerRow.indexOf('Name');
    const groupIndex = headerRow.indexOf('Group');
    const loginIndex = headerRow.indexOf('Login');

    if (nameIndex === -1 || groupIndex === -1 || loginIndex === -1) {
      return NextResponse.json({ error: 'Required columns not found in the Data sheet' }, { status: 500 });
    }

    // Skip the header row and search for the login ID
    const dataRows = rows.slice(1);

    const studentRow = dataRows.find((row) => {
      const loginValue = row[loginIndex];
      return loginValue === id;
    });

    if (studentRow) {
      const studentName = studentRow[nameIndex];
      const studentGroup = studentRow[groupIndex];

      // Return the student's role and group
      return NextResponse.json({ role: 'student', name: studentName, group: studentGroup });
    } else {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error accessing Google Sheets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
