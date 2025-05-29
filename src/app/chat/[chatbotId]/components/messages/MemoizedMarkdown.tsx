import { marked } from 'marked';
import { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Recommended plugin for tables, etc.
import rehypeRaw from 'rehype-raw';
import Link from 'next/link';
import dynamic from 'next/dynamic'; // Import dynamic
import SourceCitationDisplay from './SourceCitationDisplay'; // Import the new component

// Add fade-in animation style
const fadeInStyle = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .fade-in-text {
    animation: fadeIn 0.3s ease-in-out;
  }
`;

// Dynamically import EnhancedCodeBlock with SSR disabled
const EnhancedCodeBlock = dynamic(
  () => import('./enhanced-code-block').then((mod) => mod.EnhancedCodeBlock),
  {
    ssr: false, // Ensure this component only renders on the client
    loading: () => { return <pre><code>Loading code block...</code></pre>; }, // Optional loading state
  }
);

// Dynamically import MermaidDisplay with SSR disabled
const MermaidDisplay = dynamic(
  () => import('./MermaidDisplay').then((mod) => mod.MermaidDisplay),
  {
    ssr: false,
    loading: () => { return <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading diagram...</div>; },
  }
);

// Avoid expensive operations on every render
const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeRaw];

// Helper to preprocess markdown content
const preprocessMarkdown = (markdown: string): string => {
  // Fix triple backtick code blocks that don't have proper newlines
  // Previous regex was causing problems by splitting language identifiers
  
  // First, find code blocks with no newline after language tag
  const codeBlockPattern = /```(\w+)/g;
  
  // Replace with proper spacing (keeping language intact)
  return markdown.replace(codeBlockPattern, '```$1\n');
};

// Helper to safely get node content
const getNodeText = (node: any): string => {
  if (!node || !node.children) return '';
  return node.children.map((child: any) => {
    if (child.type === 'text') {
      return child.value;
    }
    // Potentially handle nested elements if needed, but keep it simple for <sourceCite>
    return '';
  }).join('');
};

// Helper function to parse markdown into discrete blocks
function parseMarkdownIntoBlocks(markdown: string): string[] {
  // Use marked lexer to split content into meaningful blocks
  const tokens = marked.lexer(markdown);
  return tokens.map(token => token.raw);
}

// Function to create component map, including the citation counter
const createMarkdownComponents = (citationMap: React.MutableRefObject<Map<string, number>>): Partial<Components> => ({
  // @ts-ignore - The inline prop is passed by ReactMarkdown but not in type defs
  code: ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const lang = match ? match[1].toLowerCase() : '';
    const codeContent = String(children).replace(/\n$/, ''); // Get the code content

    if (lang === 'mermaid' && !inline) {
      // Pass a unique suffix for the ID to avoid collisions if multiple diagrams are in the same message
      // This could be based on node properties or a simple counter if available
      // For now, let's assume one mermaid diagram per code block instance is fine without a suffix
      return <MermaidDisplay mermaidCode={codeContent} />;
    }

    // Fallback to EnhancedCodeBlock for other languages or inline code
    // @ts-ignore
    return <EnhancedCodeBlock node={node} inline={inline} className={className} {...props}>{children}</EnhancedCodeBlock>;
  },
  
  // @ts-ignore - Custom tag handling requires ignoring some types
  sourcecite: ({ node, ...props }) => { 
    const jsonContent = getNodeText(node);
    if (!jsonContent) {
      return <span className="text-red-500">[Empty SourceCite Tag]</span>;
    }

    let citationNumber;
    try {
      const parsedContent = JSON.parse(jsonContent);
      // Assuming the content is an array and we take the first item's source_id
      const sourceId = parsedContent?.[0]?.source_id;

      if (!sourceId) {
        console.error("SourceCite: source_id not found in JSON content", jsonContent);
        return <span className="text-red-500">[Malformed SourceCite Tag - No ID]</span>;
      }

      if (citationMap.current.has(sourceId)) {
        citationNumber = citationMap.current.get(sourceId)!;
      } else {
        citationNumber = citationMap.current.size + 1;
        citationMap.current.set(sourceId, citationNumber);
      }
    } catch (error) {
      console.error("Error parsing SourceCite JSON content:", error, jsonContent);
      // return <span className="text-red-500">[Invalid SourceCite JSON]</span>;
    }
    
    return (
      <SourceCitationDisplay 
        jsonContent={jsonContent}
        citationNumber={citationNumber ?? 0} 
      />
    );
  },

  // Custom link handling
  // Keep all other component renderers the same
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="list-decimal list-outside ml-4" {...props}>
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="py-1" {...props}>
        {children}
      </li>
    );
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="list-decimal list-outside ml-4" {...props}>
        {children}
      </ul>
    );
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        {children}
      </span>
    );
  },
  a: ({ node, children, ...props }) => {
    return (
      // @ts-ignore - Link props are incompatible with the expected type
      <Link
        className="text-blue-500 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    );
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
        {children}
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
        {children}
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
        {children}
      </h6>
    );
  }
});

// Optimized deeply memoized component for rendering a single markdown block
const MemoizedMarkdownBlock = memo(
  ({ content, blockId, components }: { 
    content: string, 
    blockId: string, 
    components: Partial<Components> // Pass components map as prop
  }) => {
    return (
      <>
        {/* Add style tag for the animation */}
        <style jsx>{fadeInStyle}</style>
        <div className="fade-in-text">
          <ReactMarkdown 
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins} 
            components={components} // Use passed components
            // Allow sourcecite tag via rehypeRaw
            // rehypeRaw options could be configured here if needed
          >
            {content}
          </ReactMarkdown>
        </div>
      </>
    );
  },
  // Update comparison if needed, though components map should be stable per MemoizedMarkdown instance
  (prevProps, nextProps) => 
    prevProps.content === nextProps.content && 
    prevProps.blockId === nextProps.blockId &&
    prevProps.components === nextProps.components // Add components to comparison
);

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';

// Main component that splits content and renders memoized blocks
export const MemoizedMarkdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    // Split content into blocks using marked tokenizer - memoized
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);
    
    // Ref to keep track of citation numbers for unique source_ids within a single message
    const citationIdMap = useRef<Map<string, number>>(new Map());
    
    // Reset counter when content/id changes (new message) using useEffect
    useEffect(() => {
        citationIdMap.current.clear(); // Clear the map for new messages
    }, [content, id]);
    
    // Create the components map once per render, including the counter ref
    const components = useMemo(() => createMarkdownComponents(citationIdMap), []); // citationIdMap ref is stable
    
    // Create a memoized callback for creating block IDs
    const getBlockId = useCallback((index: number) => `${id}-block-${index}`, [id]);
    
    return (
      <div className="markdown-body">
        {blocks.map((block, index) => (
          <MemoizedMarkdownBlock 
            content={block} 
            blockId={getBlockId(index)}
            components={components} // Pass the components map
            key={getBlockId(index)} 
          />
        ))}
      </div>
    );
  },
  // Custom comparison: only re-render if content or id changes
  (prevProps, nextProps) => 
    prevProps.content === nextProps.content && prevProps.id === nextProps.id
);

MemoizedMarkdown.displayName = 'MemoizedMarkdown';

// Also export the block component for direct use
export { MemoizedMarkdownBlock };
