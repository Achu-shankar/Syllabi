import React from 'react';

interface DebugMarkdownProps {
  markdown: string;
}

export function DebugMarkdown({ markdown }: DebugMarkdownProps) {
  // Function to highlight inline code
  const highlightInlineCode = (text: string) => {
    return text.replace(
      /`([^`]+)`/g, 
      '<span style="background-color: #f0f0f0; padding: 2px 4px; border-radius: 4px; color: #ff3366; font-family: monospace;">$1</span>'
    );
  };

  // Function to highlight code blocks
  const highlightCodeBlocks = (text: string) => {
    return text.replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      '<div style="background-color: #282c34; color: #abb2bf; padding: 10px; border-radius: 6px; margin: 10px 0; white-space: pre; overflow-x: auto; font-family: monospace;">' +
      '<div style="color: #e06c75; font-size: 0.8em; margin-bottom: 5px;">$1</div>' +
      '$2</div>'
    );
  };

  // Process the markdown to highlight inline code and code blocks
  const processedMarkdown = highlightCodeBlocks(highlightInlineCode(markdown));

  return (
    <div className="my-4">
      <h3 className="text-lg font-bold mb-2">Debug View</h3>
      
      <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-4">
        <h4 className="text-sm font-semibold mb-2">Raw Markdown</h4>
        <pre className="text-xs overflow-auto whitespace-pre-wrap break-all bg-white p-2 rounded">{markdown}</pre>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
        <h4 className="text-sm font-semibold mb-2">Processed View</h4>
        <div 
          className="text-sm"
          dangerouslySetInnerHTML={{ __html: processedMarkdown }}
        />
      </div>
    </div>
  );
} 