import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathArray } = await params;
  const path = pathArray.join('/');
  const url = `https://repo.r-wasm.org/${path}`;
  
  try {
    const response = await fetch(url);
    const data = await response.arrayBuffer();
    
    // Copy the headers from the original response
    const headers = new Headers();
    response.headers.forEach((value, key) => {
      headers.set(key, value);
    });
    
    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from R repository' },
      { status: 500 }
    );
  }
}
