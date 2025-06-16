import {createContext, useState, useContext, ReactNode} from 'react';
import { ContentSource } from '../db/content_queries';

export interface EbookContextType {
    isEbookPanelOpen: boolean;
    currentDocument: ContentSource | null;
    currentTimestamp: number | null; // For multimedia content only
    isLoading: boolean;
    openEbookPanel: (documentId?: string) => void;
    closeEbookPanel: () => void;
    selectDocument: (document: ContentSource, timestamp?: number) => void; // Removed pageNumber, only timestamp for multimedia
    navigateToTimestamp: (timestamp: number) => void; // For multimedia navigation only
    setIsLoadingEbook: (loading: boolean) => void;
}

const EbookContext = createContext<EbookContextType | undefined>(undefined)

const EbookProvider = ({children}:{children:ReactNode})=>{
    const [isEbookPanelOpen, setIsEbookPanelOpen] = useState(false);
    const [currentDocument, setCurrentDocument] = useState<ContentSource | null>(null);
    const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null);
    const [isLoadingEbook, setIsLoadingEbook] = useState(false);

    const openEbookPanel = (documentId?: string) => {
        setIsEbookPanelOpen(true);
        // If a specific document is requested, we'll handle selection in the component
        // that has access to the content sources list
        // If no specific document but we have a current document, it will be restored automatically
        if (!documentId && currentDocument) {
            console.log(`[EbookContext] Restoring previous document: ${currentDocument.file_name} at page ${currentTimestamp || 1}`);
        }
    }

    const closeEbookPanel = () => {
        setIsEbookPanelOpen(false);
        setIsLoadingEbook(false);
        // Keep currentDocument and currentTimestamp to restore when reopening
    }
    
    const selectDocument = (document: ContentSource, timestamp?: number) => {
        // Only set loading if we're actually changing documents
        if (!currentDocument || currentDocument.id !== document.id) {
            setIsLoadingEbook(true);
            console.log(`[EbookContext] Switching to new document: ${document.file_name}${timestamp ? ` at timestamp ${timestamp}s` : ''}`);
        } else {
            console.log(`[EbookContext] Navigating within same document: ${document.file_name} to timestamp ${timestamp || 'null'}`);
        }
        
        setCurrentDocument(document);
        setCurrentTimestamp(timestamp || null);
        console.log(`[EbookContext] Set currentTimestamp to: ${timestamp || null}`);
        setIsEbookPanelOpen(true);
    }

    const navigateToTimestamp = (timestamp: number) => {
        console.log(`[EbookContext] navigateToTimestamp called with: ${timestamp}s`);
        setCurrentTimestamp(timestamp);
        console.log(`[EbookContext] Set currentTimestamp to: ${timestamp}`);
        // No loading needed for timestamp navigation
    }

    return (
        <EbookContext.Provider value={{
            isEbookPanelOpen, 
            currentDocument, 
            currentTimestamp,
            isLoading: isLoadingEbook, 
            openEbookPanel, 
            closeEbookPanel, 
            selectDocument,
            navigateToTimestamp,
            setIsLoadingEbook
        }}>
            {children}
        </EbookContext.Provider>
    )
}

const useEbookContext = () => {
    const context = useContext(EbookContext);
    if (context === undefined) {
        throw new Error('useEbookContext must be used within an EbookProvider');
    }
    return context;
}

export {EbookProvider, useEbookContext}