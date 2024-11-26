// app/api/submit-response/route.ts

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request) {
  const body = await request.json();

  // Extract data from the request body
  const { studentId, questionId, timeTaken, answer, chatLogs } = body;

  // Authenticate with Google Sheets API
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'config', 'service-account.json'),
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
      range: 'Sheet1!A:F', // Adjust the range as needed
      valueInputOption: 'USER_ENTERED',
      requestBody: resource,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error appending data to Google Sheets:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
