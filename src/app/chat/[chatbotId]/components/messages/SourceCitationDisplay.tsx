'use client';

import React from 'react';
import Link from 'next/link'; // Import Link for client-side navigation (though target="_blank" uses standard anchor)
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'; // Assuming standard shadcn path
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Assuming standard shadcn path
import { useEbookContext } from '../../lib/context/ebook-context'; // Import the ebook context hook

interface Source {
  sentence: string;
  source_id: string;
  title: string;
  chapter: string;
}

interface SourceCitationDisplayProps {
  jsonContent: string;
  citationNumber: number;
}

// Base URL for source links
const DSPA_NOTES_BASE_URL = 'https://socr.umich.edu/DSPA2/DSPA2_notes/';

// Helper function to shorten text
const shortenText = (text: string, maxLength: number = 20): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
};

const SourceCitationDisplay: React.FC<SourceCitationDisplayProps> = ({
  jsonContent,
  citationNumber,
}) => {
  // Get the navigation function from the context
  const { navigateToChapter } = useEbookContext();

  let sources: Source[] = [];
  try {
    sources = JSON.parse(jsonContent);
    if (!Array.isArray(sources)) {
      throw new Error('Parsed content is not an array');
    }
    // Basic validation of source structure
    if (sources.length > 0 && (!sources[0].title || !sources[0].sentence)) {
        throw new Error('Source object structure is invalid');
    }
  } catch (error) {
    console.error('Error parsing source citation JSON:', error, 'Content:', jsonContent);
    // Render nothing or an error indicator if parsing fails
    // return <span className="text-red-500">[Invalid Citation Data]</span>; 
  }

  // Ensure we have sources to display
  if (sources.length === 0) {
    return <span className="text-gray-500"></span>;
  }

  // Generate a unique ID for ARIA attributes if needed, though HoverCard might handle this
  const triggerId = `citation-trigger-${citationNumber}`;
  const contentId = `citation-content-${citationNumber}`;

  // Helper to generate URL with Text Fragment
  const generateSourceUrl = (source: Source): string | undefined => {
    if (!source.chapter) return undefined;
    const baseUrl = `${DSPA_NOTES_BASE_URL}${encodeURIComponent(source.chapter)}.html`;
    if (source.sentence) {
      // Append text fragment if title exists
      return `${baseUrl}#:~:text=${encodeURIComponent(source.sentence)}`;
    }
    return baseUrl; // Return base URL if no title
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {/* Display citation number like [1], [2], etc. */}
        <span 
          className="inline-block align-super text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full mx-0.5 cursor-pointer hover:bg-blue-200"
          id={triggerId}
          aria-describedby={contentId}
        >
          [{citationNumber}]
        </span>
      </HoverCardTrigger>
      <HoverCardContent 
        side="top" // Adjust position as needed
        className="w-96 p-0" // Increased width, remove padding for Card
        id={contentId}
        role="tooltip" // ARIA role
      >
        <Card className="border-none shadow-md"> {/* Optional: remove border if redundant */}
          <CardHeader className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b">
            <CardTitle className="text-sm font-medium">
              {sources.length > 1 ? 'Cited Sources' : 'Cited Source'}
            </CardTitle>
          </CardHeader>
          
          {/* Horizontal pill bar with links */}
          <div className="px-4 pt-3 pb-2 border-b">
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
              {sources.map((source, index) => {
                const sourceUrl = generateSourceUrl(source); // Full URL with fragment
                const pillContent = (
                  <span
                    className="inline-block whitespace-nowrap rounded-full bg-gray-200 dark:bg-gray-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 cursor-pointer"
                    title={source.title} 
                  >
                    {shortenText(source.title)}
                  </span>
                );

                return (
                  <React.Fragment key={`pill-${source.source_id || index}`}>
                    {sourceUrl ? (
                      <a 
                        href={sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full"
                        onClick={(e) => {
                          if (sourceUrl && navigateToChapter) {
                            e.preventDefault(); 
                            navigateToChapter(sourceUrl); // Navigate in sidebar with full URL
                          }
                        }}
                      >
                        {pillContent}
                      </a>
                    ) : (
                      pillContent // Render span without link if no chapter
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Detailed list with links */}
          <CardContent className="p-4 text-xs space-y-3 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
            {sources.map((source, index) => {
              const sourceUrl = generateSourceUrl(source); // Full URL with fragment
              const titleContent = (
                <>{source.title}{source.chapter ? ` (${source.chapter})` : ''}</>
              );

              return (
                <div key={`detail-${source.source_id || index}`} className="border-b pb-2 last:border-b-0 last:pb-0">
                  {sourceUrl ? (
                    <a 
                      href={sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                      onClick={(e) => {
                          if (sourceUrl && navigateToChapter) {
                            e.preventDefault(); 
                            navigateToChapter(sourceUrl); // Navigate in sidebar with full URL
                          }
                      }}
                    >
                      {titleContent}
                    </a>
                  ) : (
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {titleContent}
                    </p>
                  )}
                  <blockquote className="mt-1 italic text-gray-600 dark:text-gray-400 border-l-2 border-gray-300 pl-2">
                    "{source.sentence}"
                  </blockquote>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </HoverCardContent>
    </HoverCard>
  );
};

export default SourceCitationDisplay; 