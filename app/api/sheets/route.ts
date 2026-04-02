import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1JF2vVbrnMYTMC3WrOVVv-vkTICBxh06S0t-40cyPIo0';
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheet = searchParams.get('sheet') || 'EQUIPOS';
    const range = searchParams.get('range') || 'A:Z';

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheet)}!${range}?key=${API_KEY}`;

    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { success: false, error: data.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.values || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error al leer Google Sheets' },
      { status: 500 }
    );
  }
}