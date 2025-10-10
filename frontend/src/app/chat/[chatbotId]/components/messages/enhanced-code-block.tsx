'use client';
import React, { useEffect, useState, useCallback, useRef, useMemo, memo } from 'react';
import { ClipboardIcon, CheckIcon, PlayIcon, SquareIcon, Loader2Icon, DownloadIcon } from 'lucide-react';
import LightweightCodeBlock from './LightweightCodeBlock';
import { useCodeRuntimesStore, ExecutionResult } from '../../lib/store/codeRuntimes';

type CodeProps = {
  node?: any;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

interface CodeOutputProps {
  result: ExecutionResult | null;
}

// Memoize CodeOutput component to prevent re-renders when props haven't changed
const CodeOutput = memo(({ result }: CodeOutputProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (result?.plotData && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
          canvas.width = result.plotData.width;
          canvas.height = result.plotData.height;
          ctx.drawImage(result.plotData, 0, 0);
        } catch (drawError: any) {
          console.error('Error during canvas draw:', drawError);
        }
      }
    } else if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [result?.plotData]);

  if (!result) return null;

  const hasOutput = result.stdout || result.stderr || result.error || result.returnValue !== undefined || result.plotData || result.pythonPlotBase64;
  if (!hasOutput) return null;

  return (
    <div className="mt-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50/50 dark:bg-zinc-800/50 overflow-hidden">
      {result.stdout && (
        <div className="p-2 border-b  border-gray-200 dark:border-gray-700">
          <strong className="font-medium text-gray-600 dark:text-gray-400">Output (stdout):</strong>
          <pre className="mt-1 max-h-80 overflow-y-auto whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">{result.stdout}</pre>
        </div>
      )}
      {result.stderr && (
        <div className="p-2 border-b   border-gray-200 dark:border-gray-700 bg-red-50/30 dark:bg-red-900/10">
          <strong className="font-medium text-red-600 dark:text-red-400">Messages / Logs (stderr):</strong>
          <pre className="mt-1 max-h-80 overflow-y-auto whitespace-pre-wrap break-words text-red-700 dark:text-red-300">{result.stderr}</pre>
        </div>
      )}
      {result.error && (
        <div className="p-2 border-b   border-gray-200 dark:border-gray-700 bg-red-50/50 dark:bg-red-900/20">
          <strong className="font-medium text-red-700 dark:text-red-500">Execution Error:</strong>
          <pre className="mt-1 max-h-80 overflow-y-auto whitespace-pre-wrap break-words text-red-800 dark:text-red-400">{result.error}</pre>
        </div>
      )}
      {result.returnValue !== undefined && result.returnValue !== null && (
         <div className="p-2">
           <strong className="font-medium text-gray-600 dark:text-gray-400">Return Value:</strong>
           <pre className="mt-1 max-h-80 overflow-y-auto  whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
             {typeof result.returnValue === 'object' ? JSON.stringify(result.returnValue, null, 2) : String(result.returnValue)}
           </pre>
         </div>
      )}
      {result.plotData && (
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <strong className="font-medium text-gray-600 dark:text-gray-400">R Plot Output:</strong>
              <div className="mt-1 flex justify-center items-center bg-white dark:bg-gray-900 p-1 rounded shadow-inner">
                  <canvas 
                      ref={canvasRef} 
                      className="max-w-full h-auto"
                  ></canvas>
              </div>
          </div>
      )}
      {result.pythonPlotBase64 && (
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <strong className="font-medium text-gray-600 dark:text-gray-400">Python Plot Output:</strong>
              <div className="mt-1 flex justify-center items-center bg-white dark:bg-gray-900 p-1 rounded shadow-inner">
                  <img 
                      src={`data:image/png;base64,${result.pythonPlotBase64}`}
                      alt="Python Plot"
                      className="max-w-full h-auto"
                  />
              </div>
          </div>
      )}
    </div>
  );
});

// Set display name for debugging
CodeOutput.displayName = 'CodeOutput';

// Define a combined state type to reduce re-renders
interface CodeBlockState {
  content: string;
  copied: boolean;
  status: 'idle' | 'loading-runtime' | 'pending-execution' | 'executing' | 'error';
  executionResult: ExecutionResult | null;
  errorMessage: string | null;
  isExecutionPending: boolean;
  isDownloading: boolean;
}

export function EnhancedCodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeProps) {
  // Combine related state to reduce re-renders
  const [state, setState] = useState<CodeBlockState>({
    content: '',
    copied: false,
    status: 'idle',
    executionResult: null,
    errorMessage: null,
    isExecutionPending: false,
    isDownloading: false
  });

  // Destructure for easier access
  const { 
    content, 
    copied, 
    status: blockStatus, 
    executionResult, 
    errorMessage, 
    isExecutionPending, 
    isDownloading 
  } = state;

  // Memoize language detection to avoid recomputing on every render
  const { language, isExecutable } = useMemo(() => {
    const match = /language-(\w+)/.exec(className || '');
    let lang = match ? match[1].toLowerCase() : '';
    if (lang === 'js') lang = 'javascript';
    if (lang === 'py') lang = 'python';
    
    return {
      language: lang,
      isExecutable: ['python', 'javascript', 'r'].includes(lang)
    };
  }, [className]);

  // --- Use Zustand Store --- 
  // Select only the specific pieces of state and actions needed.
  // This ensures the component only re-renders if these specific parts change.
  const pythonStatus = useCodeRuntimesStore(state => state.python.status);
  const rStatus = useCodeRuntimesStore(state => state.r.status);
  const loadRuntime = useCodeRuntimesStore(state => state.loadRuntime);
  const executeCode = useCodeRuntimesStore(state => state.executeCode);
  const readFileFromVFS = useCodeRuntimesStore(state => state.readFileFromVFS);
  const readFileFromPyodideVFS = useCodeRuntimesStore(state => state.readFileFromPyodideVFS);
  // --- End Zustand Store Usage ---

  // Parse content only when children changes
  useEffect(() => {
    if (children) {
      let childContent = '';
      if (typeof children === 'string') {
        childContent = children;
      } else if (Array.isArray(children)) {
        childContent = children.join('');
      } else {
        try {
          childContent = String(children);
        } catch (e) {
          console.error('Failed to stringify code content', e);
          childContent = '';
        }
      }
      
      setState(prev => ({
        ...prev,
        content: childContent.replace(/\n$/, '')
      }));
    }
  }, [children]);

  // Optimized copy handler
  const handleCopy = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(content);
      setState(prev => ({ ...prev, copied: true }));
      // Use setTimeout outside of setState to avoid stale closure issues
      setTimeout(() => {
        setState(prev => ({ ...prev, copied: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [content]);

  // Enhanced handleExecute function with better error logging
  const handleExecute = useCallback(async () => {
    console.log("Execute button clicked for language:", language);
    
    setState(prev => ({
      ...prev,
      executionResult: null,
      errorMessage: null, 
      status: 'idle',
      isExecutionPending: false
    }));

    const currentStatus = language === 'python' ? pythonStatus : (language === 'r' ? rStatus : 'ready'); // JS doesn't need loading
    const langKey = language as 'python' | 'r'; // Type assertion for store actions

    try {
      if (language === 'javascript') {
        setState(prev => ({ ...prev, status: 'executing' }));
        const result = await executeCode('javascript', content);
        setState(prev => ({ ...prev, executionResult: result, status: 'idle' }));
        return;
      }

      if (currentStatus === 'ready') {
        setState(prev => ({ ...prev, status: 'executing' }));
        console.log(`Executing ${language} code with ready runtime`);
        const result = await executeCode(langKey, content); 
        // Zustand action executeCode now handles resetting the store status internally
        setState(prev => ({ ...prev, executionResult: result, status: 'idle' }));
      } else if (currentStatus === 'loading' || currentStatus === 'initializing') {
        console.log(`${language} runtime is currently loading`);
        setState(prev => ({ ...prev, status: 'loading-runtime', isExecutionPending: true }));
        return; 
      } else if (currentStatus === 'error') {
        console.error(`${language} runtime failed to load previously.`);
        setState(prev => ({ ...prev, errorMessage: `Cannot execute: ${language} runtime failed to load previously.`, status: 'error' }));
        return;
      } else { // Status is uninitialized
        console.log(`Initializing ${language} runtime for the first time`);
        setState(prev => ({ ...prev, status: 'loading-runtime', isExecutionPending: true }));
        try {
          await loadRuntime(langKey); // Call the store action
          // Status updates will trigger the useEffect below when ready/error
        } catch (loadError: any) {
          console.error(`Error loading ${language} runtime:`, loadError);
          // This catch might be less likely if loadRuntime handles its own errors
          setState(prev => ({ 
            ...prev, 
            errorMessage: loadError.message || `Failed to initiate runtime loading.`,
            status: 'error',
            isExecutionPending: false
          }));
        }
      }
    } catch (error: any) {
      console.error(`Error executing ${language} code:`, error);
      const message = error.message || 'An unexpected error occurred';
      setState(prev => ({ 
        ...prev, 
        errorMessage: message,
        // executionResult can be set here if needed for displaying execution context errors
        status: 'error',
        isExecutionPending: false
      }));
    }
  }, [language, isExecutable, content, pythonStatus, rStatus, loadRuntime, executeCode]); // Depend on selected statuses and actions

  // Effect to handle pending execution state, depends on store status
  useEffect(() => {
    if (!isExecutionPending || !language || language === 'javascript') return;

    const currentStatus = language === 'python' ? pythonStatus : rStatus;
    const langKey = language as 'python' | 'r';

    if (currentStatus === 'ready') {
      setState(prev => ({ ...prev, status: 'executing', isExecutionPending: false }));

      executeCode(langKey, content)
        .then(result => {
          setState(prev => ({ ...prev, executionResult: result, status: 'idle' }));
        })
        .catch(execError => {
          const message = execError.message || 'An unexpected error occurred during execution.';
          setState(prev => ({ 
            ...prev,
            errorMessage: message,
            // executionResult can be set here to show error details
            status: 'error'
          }));
        });
    } else if (currentStatus === 'error') {
      // Get error from store state if possible, otherwise use generic message
      // Note: Need to select error from store if detailed msg is needed here
      // const error = useCodeRuntimesStore(state => language === 'python' ? state.python.error : state.r.error);
      setState(prev => ({ 
        ...prev,
        errorMessage: `Runtime for ${language} failed to load.`,
        status: 'error',
        isExecutionPending: false
      }));
    }
    // Dependency on store statuses triggers this effect when loading completes
  }, [language, pythonStatus, rStatus, isExecutionPending, content, executeCode]);

  // Optimized download handler using Zustand actions based on language
  const handleDownload = useCallback(async (filename: string | null | undefined) => {
    if (!filename || isDownloading || !language) return; // Added check for language

    setState(prev => ({ ...prev, isDownloading: true, errorMessage: null }));

    try {
      let fileData: Uint8Array | null = null;
      
      // --- Call the appropriate VFS reading function based on language ---
      if (language === 'python') {
        console.log(`[Download] Attempting to read "${filename}" from Pyodide VFS...`);
        fileData = await readFileFromPyodideVFS(filename); 
      } else if (language === 'r') {
        console.log(`[Download] Attempting to read "${filename}" from WebR VFS...`);
        fileData = await readFileFromVFS(filename); 
      } else {
        throw new Error(`File download not supported for language: ${language}`);
      }
      // ------------------------------------------------------------------

      if (!fileData) {
        throw new Error(`File "${filename}" not found or could not be read from the ${language} virtual filesystem.`);
      }
      
      console.log(`[Download] Successfully read ${fileData.length} bytes for "${filename}". Creating Blob...`);

      // --- Determine MIME type (existing logic) ---
      let mimeType = 'application/octet-stream';
      const extension = filename.split('.').pop()?.toLowerCase();
      if (extension === 'pdf') mimeType = 'application/pdf';
      else if (extension === 'csv') mimeType = 'text/csv';
      else if (extension === 'png') mimeType = 'image/png';
      else if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
      else if (extension === 'txt') mimeType = 'text/plain';
      else if (extension === 'pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      else if (extension === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      // ---------------------------------------------

      const blob = new Blob([fileData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log(`[Download] File "${filename}" download triggered.`);

    } catch (error: any) {
      console.error(`[Download] Error downloading file "${filename}":`, error);
      setState(prev => ({ 
        ...prev, 
        errorMessage: error.message || 'Failed to download file.'
      }));
    } finally {
      setState(prev => ({ ...prev, isDownloading: false }));
    }
    // Add language and the new VFS reader to dependencies
  }, [language, readFileFromVFS, readFileFromPyodideVFS, isDownloading]);

  // Early return for inline code
  if (inline === true) {
    return (
      <code
        className="text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md"
        {...props}
      >
        {content}
      </code>
    );
  }
  
  // Use selected store statuses for UI logic
  const isLoadingRuntime = useMemo(() => {
    const currentStatus = language === 'python' ? pythonStatus : (language === 'r' ? rStatus : 'ready');
    return blockStatus === 'loading-runtime' || 
      currentStatus === 'loading' || 
      currentStatus === 'initializing';
  }, [blockStatus, language, pythonStatus, rStatus]);

  const isExecutingCode = blockStatus === 'executing';
  const showRunButton = useMemo(() => 
    isExecutable && !isLoadingRuntime && !isExecutingCode,
    [isExecutable, isLoadingRuntime, isExecutingCode]
  );
  const showStopButton = useMemo(() => 
    isExecutable && isExecutingCode,
    [isExecutable, isExecutingCode]
  );
  const showLoadingIcon = useMemo(() => 
    isExecutable && (blockStatus === 'loading-runtime' || blockStatus === 'pending-execution'),
    [isExecutable, blockStatus]
  );

  const canDownload = useMemo(() => 
    !!executionResult?.generatedFilename && !isDownloading,
    [executionResult?.generatedFilename, isDownloading]
  );
  const downloadFilename = executionResult?.generatedFilename;

  // Only render full code block if there's a language or multiline content
  if (language || content.includes('\n')) {
    return (
      <div className="my-4 not-prose flex flex-col group relative">
        <div className="flex justify-between items-center text-xs text-gray-500 border-t border-l border-r border-gray-200 dark:border-gray-700 px-3 py-1 rounded-t-md bg-gray-50 dark:bg-zinc-800">
          <div>{language || 'text'}</div>
          <div className="flex gap-2 items-center">
            <button 
              onClick={handleCopy}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              aria-label="Copy code"
              title="Copy code"
            >
              {copied ? <CheckIcon size={14} className="text-green-500" /> : <ClipboardIcon size={14} />}
            </button>
            
            <div className="relative w-5 h-5 flex items-center justify-center">
              {showLoadingIcon && <Loader2Icon size={14} className="animate-spin" />}
              {showRunButton && (
                <button 
                  onClick={handleExecute}
                  className={'p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors'}
                  aria-label={`Execute ${language} code`}
                  title={`Execute ${language} code`}
                  disabled={isLoadingRuntime || isExecutingCode}
                >
                  <PlayIcon size={14} />
                </button>
              )}
              {showStopButton && (
                <button 
                  className={'p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors'}
                  aria-label={`Stop execution`}
                  title={`Stop execution`}
                  disabled={!isExecutingCode}
                >
                  <SquareIcon size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex border border-gray-200 rounded-b-md dark:border-gray-700 flex-col">
          <LightweightCodeBlock
            content={content}
            language={language || 'text'}
          // showLineNumbers={content.split('\n').length > 5}
          showLineNumbers={false}
          className="text-sm w-full !my-0"
        />
        </div>
        
        {(blockStatus === 'loading-runtime' || blockStatus === 'executing' || blockStatus === 'error' || blockStatus === 'pending-execution' || isDownloading || errorMessage) && (
           <div className="mt-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-zinc-800 text-xs text-gray-600 dark:text-gray-400">
              {blockStatus === 'loading-runtime' && <span className="flex items-center gap-1"><Loader2Icon size={12} className="animate-spin"/>Loading {language} runtime...</span>}
              {blockStatus === 'pending-execution' && <span className="flex items-center gap-1"><Loader2Icon size={12} className="animate-spin"/>Waiting for {language} runtime...</span>}
              {blockStatus === 'executing' && <span className="flex items-center gap-1"><Loader2Icon size={12} className="animate-spin"/>Executing...</span>}
              {blockStatus === 'error' && <span className="text-red-600 dark:text-red-400">Error: {errorMessage || 'Failed to execute.'}</span>}
              {isDownloading && <span className="flex items-center gap-1"><Loader2Icon size={12} className="animate-spin"/>Downloading file...</span>}
              {errorMessage && blockStatus !== 'error' && <span className="text-red-600 dark:text-red-400">Error: {errorMessage}</span>}
           </div>
        )}
        
        <CodeOutput result={executionResult} />

        {downloadFilename && (
          <div className="mt-2 p-2 border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-md bg-gray-50/50 dark:bg-zinc-800/50 flex items-center justify-start">
            <button 
              onClick={() => handleDownload(downloadFilename)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${canDownload ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900' : 'bg-gray-100 text-gray-500 opacity-70 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-400'}`}
              aria-label={`Download ${downloadFilename}`}
              title={`Download ${downloadFilename}`}
              disabled={!canDownload}
            >
              {isDownloading ? 
                <Loader2Icon size={14} className="animate-spin" /> :
                <DownloadIcon size={14} />
              }
              Download {downloadFilename}
            </button>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <code
      className="text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md"
      {...props}
    >
      {content}
    </code>
  );
} 