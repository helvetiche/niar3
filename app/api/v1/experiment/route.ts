import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { 
      type: 'buffer',
      cellFormula: true,
      cellStyles: true,
    });

    const results: any = {
      message: 'Experiment endpoint ready',
      fileName: file.name,
      sheets: workbook.SheetNames,
    };

    // Add your reverse engineering logic here

    return NextResponse.json(results);
  } catch (error) {
    console.error('Experiment error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
