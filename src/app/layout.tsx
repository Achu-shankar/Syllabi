import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import Script from 'next/script';
import { GA_TRACKING_ID } from '@/utils/analytics';
import { Providers } from "./providers";
import { Inter as FontSans } from 'next/font/google'
import { Inter } from "next/font/google"; // 1. Import Inter

// const fontSans = FontSans({
//   subsets: ['latin'],
//   variable: '--font-sans'
// })
// import AnalyticsProvider from './analytics-provider';

const fontInter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", // This is the key part
});

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Syllabi.io",
  description: "Syllabi.io is a platform for creating and sharing syllabis.",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontInter.variable} suppressHydrationWarning>
      <head>
        {/* Global Site Tag (gtag.js) - Google Analytics */}
        
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_TRACKING_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground h-screen flex flex-col">
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            
              <main className="flex-1 w-full h-[calc(100vh-4rem)] overflow-hidden">
                {children}
              </main>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
