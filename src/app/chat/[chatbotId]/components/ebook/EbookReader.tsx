import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { XIcon, Disc3 } from "lucide-react";
import { useEbookContext } from '../../lib/context/ebook-context'
import {chapters} from '../../lib/data/ebook-chapters'

export default function EbookReader(){
    const {currentEbookUrl, navigateToChapter, closeEbookPanel, isLoading, setIsLoadingEbook} = useEbookContext();
    // console.log('[EbookReader] Rendering. isLoading:', isLoading, 'currentEbookUrl:', currentEbookUrl); // Log 1

    let iframeSrc = '';
    if (currentEbookUrl) {
        try {
            const urlObject = new URL(currentEbookUrl); // Use URL constructor to parse
            const baseURL = urlObject.origin + urlObject.pathname + urlObject.search; // Base URL excluding hash
            const fragment = urlObject.hash; // Includes the leading #

            iframeSrc = `/api/ebook-proxy?url=${encodeURIComponent(baseURL)}${fragment}`;
        } catch (e) {
            console.error("Error constructing iframe URL:", e);
            // Fallback or handle error - maybe try using the URL directly if parsing fails?
            // For now, leave iframeSrc as '' on error
        }
    }
    // console.log('[EbookReader] iframeSrc calculated:', iframeSrc); // Log 2

    const handleIframeLoad = () => {
        // console.log('[EbookReader] iframe onLoad event fired.'); // Log 3
        setIsLoadingEbook(false);
    };

    return (
        <div className="flex flex-col h-full p-2 gap-2">
            <div className="flex items-center justify-between gap-2 shrink-0">
                <Select
                    value={currentEbookUrl ?? ''}
                    onValueChange={(value: string) => {
                        if (value) {
                            navigateToChapter(value);
                        }
                    }}
                    disabled={isLoading}
                >
                    <SelectTrigger className="flex-grow">
                        <SelectValue placeholder="Select a chapter" />
                    </SelectTrigger>
                    <SelectContent>
                        {chapters.map((chapter, index) => (
                            <SelectItem key={index} value={chapter.url}>
                                {chapter.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost" 
                    size="icon"
                    onClick={closeEbookPanel}
                    aria-label="Close ebook panel"
                    // disabled={isLoading}
                >
                    <XIcon className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex-grow relative">
                {iframeSrc && (
                    <iframe 
                        src = {iframeSrc} 
                        onLoad={handleIframeLoad}
                        className={`w-full h-full border-none bg-white transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                        title="Ebook Content"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    >
                    </iframe>
                )}

                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 text-muted-foreground z-10">
                        <Disc3 className="h-8 w-8 animate-spin text-primary mb-2" />
                        <p>Loading chapter...</p>
                    </div>
                )}

                {!iframeSrc && !isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <p>Select a chapter to view its content.</p>
                    </div>
                )}
            </div>
        </div>
    )
}