import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetUrlString = searchParams.get('url');

  if (!targetUrlString) {
    return new NextResponse('Missing target URL', { status: 400 });
  }

  try {
    const targetUrl = new URL(targetUrlString);
    const response = await fetch(targetUrl.href, { // Use .href to ensure the full URL is fetched
      headers: {
        // It's good practice to forward some headers or set a specific User-Agent
        // if the target site requires it, but start simple.
        'User-Agent': 'DSPA-Ebook-Proxy/1.0',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Error fetching from target: ${response.status} ${response.statusText}`, {
        status: response.status,
      });
    }

    let htmlContent = await response.text();

    // Inject base tag (important to do this *before* stripping potentially related scripts)
    const basePath = targetUrl.protocol + '//' + targetUrl.host + targetUrl.pathname.substring(0, targetUrl.pathname.lastIndexOf('/') + 1);
    const baseTag = `<base href="${basePath}">`;
    if (htmlContent.includes('<head>')) {
      htmlContent = htmlContent.replace('<head>', '<head>\n' + baseTag);
    } else if (htmlContent.includes('<HEAD>')) {
      htmlContent = htmlContent.replace('<HEAD>', '<HEAD>\n' + baseTag);
    } else {
      htmlContent = baseTag + '\n' + htmlContent;
    }

    // --- Re-enabled Experimental Stripping for Testing --- 
    htmlContent = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    htmlContent = htmlContent.replace(/<img[^>]*>/gi, '');
    // ---------------------------------------------------- 

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400'
        // s-maxage=3600: Tells CDNs (like Vercel) to cache for 1 hour (3600 seconds).
        // stale-while-revalidate=86400: Allows CDN to serve stale content for 1 day while revalidating.
      },
    });
  } catch (error: any) {
    console.error('[EBOOK_PROXY_ERROR]', error);
    let errorMessage = 'Internal Server Error while proxying request';
    if (error.code === 'ERR_INVALID_URL') {
        errorMessage = 'Invalid target URL provided.';
        return new NextResponse(errorMessage, { status: 400 });
    }
    return new NextResponse(errorMessage, { status: 500 });
  }
} 