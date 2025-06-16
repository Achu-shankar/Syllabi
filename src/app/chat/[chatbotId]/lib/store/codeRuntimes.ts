import { create } from 'zustand';
import { loadPyodide, PyodideInterface } from 'pyodide';
import { WebR } from 'webr';

// Define Shelter type inline for clarity
type Shelter = any;

// Types mirroring the context setup
type RuntimeStatus = 'uninitialized' | 'loading' | 'initializing' | 'ready' | 'error' | 'executing';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  returnValue?: any;
  error?: string | null;
  plotData?: ImageBitmap | null;
  pythonPlotBase64?: string | null;
  generatedFilename?: string | null;
}

interface RuntimeState {
  instance: PyodideInterface | WebR | null;
  status: RuntimeStatus;
  error: Error | null;
}

// Define the state structure for the store
interface CodeRuntimesState {
  python: RuntimeState;
  r: RuntimeState;
  pyodideConfig: any; // Add config to state if needed by actions
}

// Define the actions the store will provide
interface CodeRuntimesActions {
  loadRuntime: (language: 'python' | 'r') => Promise<void>;
  executeCode: (language: 'python' | 'r' | 'javascript', code: string) => Promise<ExecutionResult>;
  readFileFromVFS: (filename: string) => Promise<Uint8Array | null>;
  readFileFromPyodideVFS: (filename: string) => Promise<Uint8Array | null>;
  // Internal helper actions (optional but can clarify logic)
  _loadPython: () => Promise<void>;
  _loadR: () => Promise<void>;
}

// Define the initial state - use CDN path again for package loading reliability
const initialState: CodeRuntimesState = {
  python: { instance: null, status: 'uninitialized', error: null },
  r: { instance: null, status: 'uninitialized', error: null },
  pyodideConfig: { 
    // Point indexURL to the CDN so loadPackage fetches from there
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/", // Use v0.23.4 CDN
    fullStdLib: false,
    jsglobals: typeof window !== 'undefined' ? window : undefined, 
    stdin: undefined,
    stdout: undefined,
    stderr: undefined,
  }, 
};

// Global flag to track if Pyodide loading has started/completed
let isPyodideLoadingOrReady = false;

// Create the Zustand store
export const useCodeRuntimesStore = create<CodeRuntimesState & CodeRuntimesActions>((set, get) => ({
  // Initial state spread
  ...initialState,

  // --- Action Implementations --- 

  _loadPython: async () => {
    // --- Ensure this only runs on the client side --- 
    if (typeof window === 'undefined') {
      console.warn("[Python] Attempted to load Pyodide on the server. Skipping.");
      return;
    }
    
    // --- Singleton Check --- 
    if (isPyodideLoadingOrReady && get().python.status !== 'error') {
      console.log("[Python] Pyodide loading already initiated or completed. Skipping.");
      return; // Avoid re-initialization
    }
    
    const { python, pyodideConfig } = get();
    if (python.status === 'loading' || python.status === 'ready') {
      console.log(`[Python] Already loading or ready (status: ${python.status}). Skipping.`);
      return; // Double-check state to prevent race conditions
    }
    
    isPyodideLoadingOrReady = true; // Mark as loading
    console.log("[Python] Starting Pyodide load (client-side)... Config:", pyodideConfig);
    set(state => ({ python: { ...state.python, status: 'loading', error: null, instance: null } }));

    let pyodideInstance: PyodideInterface | null = null; 

    try {
      pyodideInstance = await loadPyodide(pyodideConfig);
      console.log("[Python] Pyodide core loaded successfully. Version:", pyodideInstance.version);
      
      if (!pyodideInstance || typeof pyodideInstance.runPython !== 'function') {
        throw new Error("Pyodide instance is invalid - missing runPython method");
      }
      
      // --- Explicitly Load micropip and wait for it --- 
      console.log("[Python] Attempting to load micropip package via loadPackage('micropip')...");
      try {
        await pyodideInstance.loadPackage('micropip');
        console.log("[Python] loadPackage('micropip') promise resolved.");
        
        // === Add Diagnostic Logging ===
        console.log("[Python] Checking loaded packages after loadPackage...");
        // Note: pyodide.loadedPackages might not be fully accurate immediately
        // or available in all versions, wrap in try/catch.
        try {
          // In newer versions, loadedPackages is a Map
          const loadedPackages = pyodideInstance.loadedPackages;
          if (loadedPackages instanceof Map) {
             console.log("[Python] loadedPackages (Map):", Array.from(loadedPackages.keys()));
          } else {
             // Older versions might use an object
             console.log("[Python] loadedPackages (Object):", loadedPackages);
          }
          console.log("[Python] Is 'micropip' key in loadedPackages?", 'micropip' in loadedPackages);
        } catch (logError) {
           console.warn("[Python] Error accessing/logging loadedPackages:", logError);
        }
        // === End Diagnostic Logging ===

        console.log("[Python] Attempting pyimport('micropip')...");
        pyodideInstance.pyimport('micropip'); 
        console.log("[Python] micropip successfully imported via pyimport.");

      } catch (packageError) {
        console.error("[Python] CRITICAL: Failed during micropip loadPackage/pyimport!", packageError);
        // Throw error because micropip is essential for user package installs
        throw new Error(`Failed to initialize micropip: ${packageError instanceof Error ? packageError.message : String(packageError)}`);
      }

      // Test instance after micropip load
      try {
        pyodideInstance.runPython("1+1");
        console.log("[Python] Post-micropip test calculation successful.");
      } catch (testError) {
        console.warn("[Python] Post-micropip test calculation failed:", testError);
      }
            
      set(state => ({ python: { ...state.python, status: 'ready', error: null, instance: pyodideInstance } }));
      console.log("[Python] Pyodide initialization complete and ready (micropip confirmed).");

    } catch (error) {
      isPyodideLoadingOrReady = false; // Reset flag on error
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[Python] Failed during Pyodide/micropip initialization:", errorMessage);
      console.error("[Python] Stack trace:", error instanceof Error ? error.stack : "No stack trace available");
      set(state => ({ 
        python: { 
          ...state.python, 
          status: 'error', 
          error: error instanceof Error ? error : new Error(String(error)),
          instance: null 
        } 
      }));
    }
  },

  _loadR: async () => {
    const { r } = get();
    if (r.status !== 'uninitialized' && r.status !== 'error') return;

    set(state => ({ r: { ...state.r, status: 'loading', error: null, instance: null } }));
    try {
      const webRInstance = new WebR({
        baseUrl: '/webr/',
        repoUrl: '/api/r-proxy/'
      }); 
      set(state => ({ r: { ...state.r, status: 'initializing' } }));
      await webRInstance.init();
      set(state => ({ r: { ...state.r, status: 'ready', error: null, instance: webRInstance } }));
    } catch (error) {
      console.error("Failed to load or initialize WebR:", error);
      set(state => ({ r: { ...state.r, status: 'error', error: error as Error, instance: null } }));
    }
  },

  loadRuntime: async (language) => {
    if (language === 'python') {
      await get()._loadPython();
    } else if (language === 'r') {
      await get()._loadR();
    }
  },

  executeCode: async (language, code) => {
    // Initialize baseResult with the new field
    let baseResult: Omit<ExecutionResult, 'stdout' | 'stderr'> = { 
      error: null, 
      plotData: null, 
      pythonPlotBase64: null, // Initialize new field
      generatedFilename: null 
    };
    let stdout = '';
    let stderr = '';
    const currentState = get();

    try {
      if (language === 'python') {
        const pythonState = currentState.python;
        if (pythonState.status !== 'ready') throw new Error('Python runtime not ready.');
        if (!pythonState.instance) throw new Error('Python instance is null.');
        
        console.log("[Python] Executing code...");
        set(state => ({ python: { ...state.python, status: 'executing' } }));
        const pyodide = pythonState.instance as PyodideInterface;
        
        // Setup stdio redirection with logging
        let consoleOutput = '';
        pyodide.setStdout({ 
          batched: (msg) => {
            stdout += msg + '\n';
            consoleOutput += msg + '\n';
            console.log("[Python stdout]:", msg);
          }
        });
        
        pyodide.setStderr({ 
          batched: (msg) => {
            stderr += msg + '\n';
            consoleOutput += msg + '\n';
            console.error("[Python stderr]:", msg);
          }
        });
        
        try {
            console.log("[Python] Running code length:", code.length, "bytes");
            const result = await pyodide.runPythonAsync(code);
            console.log("[Python] Execution raw result:", typeof result, result);
            
            // --- Handle Python return value --- 
            if (typeof result === 'string') {
              // Check if it looks like a base64 image string
              // Basic check: starts with common base64 chars, reasonable length
              if (result.length > 100 && /^[A-Za-z0-9+/=]+$/.test(result.substring(0,100))) {
                 // More robust check might involve trying to decode a small part
                 // or looking for specific patterns if plots always return base64
                 console.log("[Python] Detected potential base64 plot string.");
                 baseResult.pythonPlotBase64 = result;
                 baseResult.returnValue = undefined; // Don't show base64 as text output
              } 
              // Check if it looks like a filename (similar to R logic)
              else if (result.match(/\.(csv|pdf|png|jpe?g|txt|pptx|xlsx)$/i)) {
                 console.log("[Python] Detected potential filename string:", result);
                 baseResult.generatedFilename = result;
                 baseResult.returnValue = undefined; // Don't show filename as text output
              } 
              // Otherwise, treat as regular string return value
              else {
                 baseResult.returnValue = result;
              }
            } else {
              // Handle non-string return types (numbers, lists, etc.)
              baseResult.returnValue = result;
            }
            // --- End Handle Python return value --- 

        } catch (pythonError: any) {
            console.error("[Python] Execution error:", pythonError);
            baseResult.error = pythonError instanceof Error ? 
              pythonError.message : String(pythonError);
            stderr += `Python Execution Error: ${pythonError.message || String(pythonError)}\n`;
            if (consoleOutput) {
              console.log("[Python] Console output before error:", consoleOutput);
            }
        } finally {
            pyodide.setStdout({}); 
            pyodide.setStderr({});
            set(state => ({ python: { ...state.python, status: 'ready' } }));
        }
        
      } else if (language === 'r') {
        const rState = currentState.r;
        if (rState.status !== 'ready') throw new Error('R runtime not ready.');
        if (!rState.instance) throw new Error('R instance is null.');
        
        set(state => ({ r: { ...state.r, status: 'executing' } }));
        const webR = rState.instance as WebR;
        let shelter: Shelter | null = null; 
        let resultRObject: any = null;

        try {
          if (!(webR as any).Shelter) throw new Error('webR instance does not have Shelter.');
          shelter = await new (webR as any).Shelter(); 
          
          const result = await shelter.captureR(code, { captureStreams: true, captureConditions: false });
          resultRObject = result.result;

          stdout = result.output.filter((o: any) => o.type === 'stdout').map((o: any) => o.data).join('\n');
          stderr = result.output.filter((o: any) => o.type === 'stderr').map((o: any) => o.data).join('\n');
          
          baseResult.returnValue = null;
          baseResult.generatedFilename = null; 

          if (resultRObject && typeof resultRObject.toArray === 'function') {
            try {
                const arr = await resultRObject.toArray();
                if (arr && arr.length === 1 && typeof arr[0] === 'string' && arr[0].match(/\.(csv|pdf|png|jpe?g|txt|pptx|xlsx)$/i)) {
                    baseResult.generatedFilename = arr[0];
                } else {
                     baseResult.returnValue = '[RObject]';
                }
            } catch (conversionError: any) {
                 stderr += `Conversion Error: ${conversionError.message}\n`;
                 baseResult.returnValue = '[RObject Conversion Error]';
            }
          } else if (resultRObject) {
              baseResult.returnValue = '[RObject]'; 
          }
          
          if (result.images && result.images.length > 0) {
            baseResult.plotData = result.images[0] as ImageBitmap; 
          } else {
             baseResult.plotData = null;
          }

        } catch (executionError: any) { 
            baseResult.error = executionError.message || String(executionError);
            stderr += `Execution Error: ${executionError.message || String(executionError)}`;
        } finally {
           if (shelter) { 
             try { await shelter.purge(); } 
             catch (purgeError: any) { stderr += `Purge Error: ${purgeError.message || String(purgeError)}`; }
           }
           set(state => ({ r: { ...state.r, status: 'ready' } }));
        }

      } else if (language === 'javascript') {
        try {
          const result = eval(code); // Still has security implications
          baseResult.returnValue = result;
          stdout = '[JavaScript execution via eval - stdout not captured]';
        } catch (e: any) { 
          baseResult.error = e.message || String(e);
          stderr = e.stack || '';
        }

      } else {
        throw new Error(`Unsupported language: ${language}`);
      }

    } catch (error: any) {
      // Catch errors from status checks or language support
      baseResult.error = error.message || String(error);
      stderr += `Error: ${error.message || String(error)}`; 
    }

    console.log("[ExecuteCode] Returning result:", { ...baseResult, stdout, stderr });
    return { ...baseResult, stdout, stderr };
  },

  readFileFromVFS: async (filename) => {
    const rState = get().r; // Get current R state
    if (rState.status !== 'ready' || !rState.instance) {
      console.error('Cannot read VFS: R runtime not ready or instance is null.');
      return null;
    }
    const webR = rState.instance as WebR;
    try {
      const fs = (webR as any).module?.FS || (webR as any).FS;
      if (!fs || typeof fs.readFile !== 'function') {
          throw new Error('WebR FS API not found or readFile is not a function.');
      }
      const data = fs.readFile(filename, { encoding: 'binary' });
      return data;
    } catch (error: any) {
      console.error(`Failed to read file '${filename}' from WebR VFS:`, error);
      return null;
    }
  },

  readFileFromPyodideVFS: async (filename) => {
    const pythonState = get().python;
    if (pythonState.status !== 'ready' || !pythonState.instance) {
      console.error('Cannot read VFS: Python runtime not ready or instance is null.');
      return null;
    }
    const pyodide = pythonState.instance as PyodideInterface;
    try {
      // Access Pyodide's Emscripten Filesystem (FS) API
      const fs = pyodide.FS;
      if (!fs || typeof fs.readFile !== 'function') {
          throw new Error('Pyodide FS API not found or readFile is not a function.');
      }
      // Read file as binary data (Uint8Array)
      console.log(`[PyVFS] Reading file: ${filename}`);
      const data = fs.readFile(filename, { encoding: 'binary' });
      console.log(`[PyVFS] Successfully read ${data.length} bytes from ${filename}`);
      return data;
    } catch (error: any) {
      console.error(`[PyVFS] Failed to read file '${filename}' from Pyodide VFS:`, error);
      // Check for common Emscripten file not found error
      if (error.message?.includes('FS error') || error.name?.includes('FSReqWrap') || error.message?.includes('NotFoundError')) { 
          console.error(`[PyVFS] File "${filename}" likely does not exist in the virtual filesystem.`);
      } 
      return null;
    }
  },

}));

// Optional: Selector hooks for convenience (can be defined here or used inline in components)
// export const usePythonStatus = () => useCodeRuntimesStore(state => state.python.status);
// export const useRStatus = () => useCodeRuntimesStore(state => state.r.status); 