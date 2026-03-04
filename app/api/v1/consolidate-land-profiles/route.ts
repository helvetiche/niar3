import { NextRequest, NextResponse } from 'next/server';
import { consolidateNuclear } from '@/lib/consolidate-land-profiles-nuclear';
import { applySecurityHeaders, secureFileResponse } from '@/lib/security-headers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Get template file
    const templateFile = formData.get('template') as File;
    if (!templateFile) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Template file is required' },
          { status: 400 }
        )
      );
    }
    
    // Get all land profile files
    const landProfileFiles: { buffer: Buffer; fileName: string }[] = [];
    let fileIndex = 0;
    
    while (true) {
      const file = formData.get(`landProfile_${fileIndex}`) as File;
      if (!file) break;
      
      const arrayBuffer = await file.arrayBuffer();
      landProfileFiles.push({
        buffer: Buffer.from(arrayBuffer),
        fileName: file.name,
      });
      
      fileIndex++;
    }
    
    if (landProfileFiles.length === 0) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'At least one land profile file is required' },
          { status: 400 }
        )
      );
    }
    
    // Convert template to buffer
    const templateArrayBuffer = await templateFile.arrayBuffer();
    const templateBuffer = Buffer.from(templateArrayBuffer);
    
    // Process consolidation
    const { buffer, processedCount, errors, warnings } = await consolidateNuclear(
      templateBuffer,
      landProfileFiles
    );
    
    // Return the file with metadata in headers
    const response = secureFileResponse(buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `consolidated-land-profiles-${Date.now()}.xlsx`,
    });
    
    // Add custom headers for metadata
    response.headers.set('X-Processed-Count', processedCount.toString());
    response.headers.set('X-Error-Count', errors.length.toString());
    if (errors.length > 0) {
      response.headers.set('X-Errors', JSON.stringify(errors));
    }
    if (warnings.length > 0) {
      response.headers.set('X-Warnings', JSON.stringify(warnings));
    }
    
    return response;
  } catch (error) {
    console.error('Error in consolidate-land-profiles API:', error);
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    );
  }
}
