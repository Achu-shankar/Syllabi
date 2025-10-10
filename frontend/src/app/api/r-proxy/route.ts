import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get the path from the URL
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/r-proxy', '');
  
  // Construct the full repo URL
  const repoUrl = `https://repo.r-wasm.org${path || '/'}`;
  
  try {
    console.log(`Proxying request to: ${repoUrl}`);
    const response = await fetch(repoUrl);
    
    if (!response.ok) {
      console.error(`Error from R repo: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch from R repository: ${response.status}` },
        { status: response.status }
      );
    }
    
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
