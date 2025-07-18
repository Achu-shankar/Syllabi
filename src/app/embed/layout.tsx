import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Embedded Chatbot",
  description: "Syllabi.io embedded chatbot widget",
  robots: "noindex, nofollow", // Prevent search engine indexing of embedded widgets
};

export default function EmbeddedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Embedded widget specific styles */
          .theme-default {
            --primary-color: #3b82f6;
            --secondary-color: #64748b;
            --background-color: #ffffff;
            --text-color: #1f2937;
            --border-color: #e5e7eb;
          }
          
          .theme-dark {
            --primary-color: #60a5fa;
            --secondary-color: #94a3b8;
            --background-color: #1f2937;
            --text-color: #f9fafb;
            --border-color: #374151;
          }
          
          /* Ensure embedded content fills container */
          .embedded-container {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
        `
      }} />
      <div className="h-full w-full overflow-hidden embedded-container">
        {children}
      </div>
    </>
  );
} 