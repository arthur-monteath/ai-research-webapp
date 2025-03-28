// app/api/[taskId]/[questionId]/responses/route.ts

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(
  request: Request,
  { params }: { params: { taskId: string; questionId: string } }
) {
  // Get the service account key from environment variables.
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    return NextResponse.json(
      { error: 'Service account key not provided' },
      { status: 500 }
    );
  }

  // Decode the key from base64 and parse it.
  const decodedKey = JSON.parse(
    Buffer.from(serviceAccountKey, 'base64').toString('utf8')
  );

  // Authenticate with the Google Sheets API.
  const auth = new google.auth.GoogleAuth({
    credentials: decodedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  try {
    // Fetch all responses from the "Responses" sheet.
    // Adjust the range as needed based on your sheet's structure.
    const responsesRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Responses!A:K',
    });
    const rows = responsesRes.data.values || [];

    // If your sheet includes a header row, remove it.
    const dataRows = rows.slice(1);

    // The expected columns are:
    // 0: Time of Submission, 1: Student Id, 2: Task Id, 3: Question Id,
    // 4: Time Taken, 5: Response, 6: Chat logs, 7: Grading Status,
    // 8: Comments, 9: Correct, 10: Score
    const filteredRows = dataRows.filter(
      (row) => row[2] === params.taskId && row[3] === params.questionId
    );

    // Map the filtered rows to a structured response.
    const responses = filteredRows.map((row) => ({
      timeOfSubmission: row[0],
      studentId: row[1],
      taskId: row[2],
      questionId: row[3],
      timeTaken: row[4],
      answer: row[5],
      chatLogs: row[6],
      gradingStatus: row[7],
      comments: row[8],
      correct: row[9] === 'true',
      score: parseFloat(row[10]),
    }));

    return NextResponse.json({ responses });
  } catch (error) {
    console.error('Error fetching responses:', error);

    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return NextResponse.json(
      { error: 'Error fetching responses', details: errorMessage },
      { status: 500 }
    );
  }
}
