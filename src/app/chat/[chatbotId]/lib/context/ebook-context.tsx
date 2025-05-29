import {createContext, useState, useContext, ReactNode} from 'react';

export interface EbookContextType {
    isEbookPanelOpen:boolean;
    currentEbookUrl: string | null;
    isLoading: boolean;
    openEbookPanel: (url?: string) => void;
    closeEbookPanel: () => void;
    navigateToChapter: (url: string) => void;
    setIsLoadingEbook: (loading: boolean) => void;
}


const EbookContext = createContext<EbookContextType | undefined>(undefined)

const EbookProvider = ({children}:{children:ReactNode})=>{
    const [isEbookPanelOpen, setIsEbookPanelOpen] = useState(false);
    const [currentEbookUrl, setCurrentEbookUrl] = useState<string | null>(null);
    const [isLoadingEbook, setIsLoadingEbook] = useState(false);

    const openEbookPanel = (url?:string)=>{
        let urlToLoad = url;
        let urlChanged = false;
        
        if (!urlToLoad && !currentEbookUrl && chapters.length > 0) {
            urlToLoad = chapters[0].url;
        }

        if (urlToLoad && urlToLoad !== currentEbookUrl) {
            setCurrentEbookUrl(urlToLoad);
            urlChanged = true;
        }
        
        if (urlChanged) {
            setIsLoadingEbook(true);
        }
        
        setIsEbookPanelOpen(true);
    }

    const closeEbookPanel =() => {
        setIsEbookPanelOpen(false);
        setIsLoadingEbook(false);
    }
    
    // Helper function to get base URL (excluding hash)
    const getBaseUrl = (urlString: string | null): string => {
        if (!urlString) return '';
        try {
            const urlObject = new URL(urlString);
            return urlObject.origin + urlObject.pathname + urlObject.search;
        } catch (e) {
            // Handle potential invalid URLs, maybe return the original string or empty
            return urlString.split('#')[0] || ''; // Basic fallback
        }
    };

    const navigateToChapter =  (url:string) => { // url can be full URL with fragment
        const newBaseUrl = getBaseUrl(url);
        const currentBaseUrl = getBaseUrl(currentEbookUrl);

        // Only set loading if the base URL is different
        if (newBaseUrl !== currentBaseUrl) { 
            setIsLoadingEbook(true); 
        } // If only the fragment changes, isLoading remains false
        
        // Always update the current URL state to the full new URL
        // This ensures the iframe src is updated with the new fragment
        setCurrentEbookUrl(url); 
        
        setIsEbookPanelOpen(true); // Ensure panel is open regardless of loading state change
    }

    return (
        <EbookContext.Provider value = {{isEbookPanelOpen, currentEbookUrl, isLoading: isLoadingEbook, openEbookPanel, closeEbookPanel, navigateToChapter, setIsLoadingEbook}}>
            {children}
        </EbookContext.Provider>
    )

}

import { chapters } from '../data/ebook-chapters';

const useEbookContext = () => {
    const context = useContext(EbookContext);
    if (context === undefined) {
        throw new Error('useEbookContext must be used within an EbookProvider');
    }
    return context;
}

export {EbookProvider, useEbookContext}