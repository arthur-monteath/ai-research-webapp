import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  const body = await request.json();

  // Extract data from the request body
  const { studentId, taskId, questionId, timeTaken, answer, chatLogs } = body;

  // Decode the base64-encoded service account key
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    return NextResponse.json({ success: false, error: 'Service account key not provided' }, { status: 500 });
  }

  const decodedKey = JSON.parse(
    Buffer.from(serviceAccountKey, 'base64').toString('utf8')
  );

  // Authenticate with Google Sheets API using the decoded credentials
  const auth = new google.auth.GoogleAuth({
    credentials: decodedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Specify your Google Sheet ID
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // Prepare data to append
  const values = [
    [
      new Date().toISOString(),
      studentId,
      taskId,
      questionId,
      timeTaken,
      answer,
      JSON.stringify(chatLogs),
    ],
  ];

  const resource = {
    values,
  };

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Responses!A:G', // Adjust the range as needed
      valueInputOption: 'USER_ENTERED',
      requestBody: resource,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error appending data to Google Sheets:', error);
    let errorMessage = 'An unknown error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
