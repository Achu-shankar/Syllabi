"use client";

import React, { useState, ChangeEvent, KeyboardEvent, useEffect } from 'react';
// import { CorePdfViewerRef } from './CorePdfViewer'; // Assuming CorePdfViewerRef is exported
import { CorePdfViewerPdfJsRef } from './CorePdfViewerPdfJs'; // Import the new ref type
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    ChevronLeftIcon, 
    ChevronRightIcon, 
    ZoomInIcon, 
    ZoomOutIcon, 
    SearchIcon, 
    ArrowUpIcon, // For Previous Match
    ArrowDownIcon, // For Next Match
    XIcon // For clearing search
} from 'lucide-react'; 
import { usePdfViewerStore, SearchOptions } from '../store/pdfViewerStore'; // Import the store and SearchOptions type
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

// Using text for icons until suitable Lucide icons are found or SVGs are made
const IconMatchCase = () => <span className="font-serif">Aa</span>;
const IconWholeWord = () => <span className="font-bold">W</span>;
// For diacritics, perhaps a more abstract icon or a simple text representation initially
// const IconMatchDiacritics = () => <span className="italic">á</span>;

interface PdfToolbarProps {
  viewerRef: React.RefObject< CorePdfViewerPdfJsRef | null>;
  onNextPage: () => void;
  onPrevPage: () => void;
}

const ZOOM_LEVELS = [
  { value: '0.5', label: '50%' },
  { value: '0.75', label: '75%' },
  { value: '1.0', label: '100%' },
  { value: '1.25', label: '125%' },
  { value: '1.5', label: '150%' },
  { value: '2.0', label: '200%' },
  { value: 'auto', label: 'Zoom Auto' },
  { value: 'page-fit', label: 'Page Fit' },
  { value: 'page-width', label: 'Page Width' },
];

const PdfToolbar: React.FC<PdfToolbarProps> = ({
  viewerRef,
  onNextPage,
  onPrevPage,
}) => {
  // Individually select state and actions from Zustand store
  const currentPage = usePdfViewerStore(state => state.currentPage);
  const numPages = usePdfViewerStore(state => state.numPages);
  const zoomScale = usePdfViewerStore(state => state.zoomScale);
  const searchQuery = usePdfViewerStore(state => state.searchQuery);
  const searchOptions = usePdfViewerStore(state => state.searchOptions);
  const searchResults = usePdfViewerStore(state => state.searchResults);
  const currentSearchResultIndex = usePdfViewerStore(state => state.currentSearchResultIndex);
  const searchStatus = usePdfViewerStore(state => state.searchStatus);
  
  const setSearchQuery = usePdfViewerStore(state => state.setSearchQuery);
  const setZoomScale = usePdfViewerStore(state => state.setZoomScale);
  const setSearchOptions = usePdfViewerStore(state => state.setSearchOptions);
  const executeSearch = usePdfViewerStore(state => state.executeSearch);
  const navigateToNextMatch = usePdfViewerStore(state => state.navigateToNextMatch);
  const navigateToPrevMatch = usePdfViewerStore(state => state.navigateToPrevMatch);
  const clearSearch = usePdfViewerStore(state => state.clearSearch);

  const [pageInput, setPageInput] = useState<string>(currentPage.toString());
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);

  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  // Effect to control Popover visibility based on search state
  useEffect(() => {
    if (searchQuery.trim() && (searchStatus === 'PENDING' || searchStatus === 'RESULTS_FOUND' || searchStatus === 'NO_RESULTS')) {
      setIsSearchPopoverOpen(true);
    } else {
      setIsSearchPopoverOpen(false);
    }
  }, [searchQuery, searchStatus]);

  const handlePageInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const pageNum = parseInt(pageInput, 10);
      if (!isNaN(pageNum) && pageNum > 0 && pageNum <= numPages) {
        viewerRef.current?.scrollToPage(pageNum);
      } else {
        setPageInput(currentPage.toString());
      }
    }
  };
  
  const handleLocalSearchQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleLocalSearchSubmit = () => {
    if (searchQuery.trim()) {
      executeSearch();
    } else {
      clearSearch(); // Clear results if search query is empty
    }
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLocalSearchSubmit();
    }
    if (e.key === 'Escape') {
        clearSearch();
    }
  };

  const handleToggleOption = (option: keyof SearchOptions) => {
    setSearchOptions({ [option]: !searchOptions[option] });
  };

  const totalResults = searchResults.length;
  const currentResultNumber = currentSearchResultIndex + 1;

  return (
    <div className="flex items-center justify-between p-2 bg-background border-b border-muted sticky top-0 z-50 w-full">
      {/* Page Navigation */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrevPage}
          disabled={currentPage <= 1}
          aria-label="Previous Page"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Button>
        <div className="flex items-center">
          <Input
            type="text"
            value={pageInput}
            onChange={handlePageInputChange}
            onKeyDown={handlePageInputSubmit}
            className="w-12 text-center h-9"
            aria-label="Current Page"
          />
          <span className="mx-1 text-sm">/ {numPages > 0 ? numPages : '-'}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onNextPage}
          disabled={currentPage >= numPages || numPages === 0}
          aria-label="Next Page"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </Button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            const currentZoom = usePdfViewerStore.getState().zoomScale;
            const newZoom = Math.max(0.25, currentZoom - 0.25);
            setZoomScale(newZoom);
          }}
          aria-label="Zoom Out"
        >
          <ZoomOutIcon className="h-5 w-5" />
        </Button>
        <Select
          value={zoomScale.toString()}
          onValueChange={(value) => {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              setZoomScale(numValue);
            }
          }}
        >
          <SelectTrigger className="w-[110px] h-9" aria-label="Select Zoom Level">
            <SelectValue placeholder="Zoom">
              {zoomScale > 0 ? `${Math.round(zoomScale * 100)}%` : "Zoom"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ZOOM_LEVELS.map(level => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            const currentZoom = usePdfViewerStore.getState().zoomScale;
            const newZoom = Math.min(3.0, currentZoom + 0.25);
            setZoomScale(newZoom);
          }}
          aria-label="Zoom In"
        >
          <ZoomInIcon className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Search Input and Popover */}
      <Popover open={isSearchPopoverOpen} onOpenChange={setIsSearchPopoverOpen}>
        <PopoverTrigger asChild>
          <div className="flex items-center space-x-1 relative min-w-[200px]"> {/* Ensure trigger has some width */} 
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search document..."
              value={searchQuery}
              onChange={handleLocalSearchQueryChange}
              onKeyDown={handleSearchKeyDown}
              className="w-full h-9 pl-8 pr-6" // w-full to take space of its relative parent
              aria-label="Search Document"
              onClick={() => {
                if (searchQuery.trim() && (searchStatus === 'PENDING' || searchStatus === 'RESULTS_FOUND' || searchStatus === 'NO_RESULTS')) {
                    setIsSearchPopoverOpen(true); // Explicitly open on click if search is active
                }
              }}
            />
            {searchQuery && (
              <Button 
                variant="ghost"
                size="icon"
                onClick={(e) => { // Added event arg
                  e.stopPropagation(); // Prevent popover from re-opening due to click on input via trigger
                  clearSearch();
                  // inputRef.current?.focus(); // Optional: re-focus input
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7 mr-1"
                aria-label="Clear search"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent 
            className="w-[300px] p-3 bg-secondary text-secondary-foreground rounded-md shadow-lg mt-1" 
            side="bottom" 
            align="end" // Align to the end of the trigger (search input)
            onOpenAutoFocus={(e) => e.preventDefault()} // Prevent auto-focusing first element in popover
        >
          {searchStatus === 'PENDING' && (
            <div className="text-sm py-2">Searching...</div>
          )}
          {searchStatus === 'NO_RESULTS' && (
            <div className="text-sm py-2">No results found for "{searchQuery}"</div>
          )}
          {searchStatus === 'RESULTS_FOUND' && totalResults > 0 && (
             <div className="flex items-center justify-between mb-2">
                <span className="text-sm">
                    Result {currentResultNumber} of {totalResults}
                </span>
                <div className="flex items-center space-x-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={navigateToPrevMatch}
                        disabled={totalResults === 0}
                        className="h-7 w-7"
                        aria-label="Previous Result"
                    >
                        <ArrowUpIcon className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={navigateToNextMatch}
                        disabled={totalResults === 0}
                        className="h-7 w-7"
                        aria-label="Next Result"
                    >
                        <ArrowDownIcon className="h-5 w-5" />
                    </Button>
                </div>
            </div>
          )}
          {searchStatus === 'ERROR' && (
            <div className="text-sm text-destructive py-2">Search error.</div>
          )}

          {/* Search Options - Always show if popover is open and there was a search attempt*/}
          {(searchStatus !== 'IDLE' || searchQuery.trim()) && (
             <div className="border-t border-muted pt-2 mt-2 flex items-center space-x-1 justify-start">
                <Button
                    variant={searchOptions.caseSensitive ? "default" : "ghost"} 
                    size="icon" 
                    onClick={() => handleToggleOption('caseSensitive')}
                    className="h-7 w-7"
                    title="Match Case"
                >
                    <IconMatchCase />
                </Button>
                <Button
                    variant={searchOptions.wholeWord ? "default" : "ghost"}
                    size="icon" 
                    onClick={() => handleToggleOption('wholeWord')}
                    className="h-7 w-7"
                    title="Match Whole Word"
                >
                    <IconWholeWord />
                </Button>
                {/* <Button ... for diacritics ... /> */}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Placeholder for Annotation Tools - to be added in later phases */}
      {/* <div className="flex items-center space-x-2">
        <Button variant="outline">Select</Button>
        <Button variant="outline">Highlight</Button>
        <Button variant="outline">Area</Button>
        <Button variant="outline">Note</Button>
      </div> */}
    </div>
  );
};

export default PdfToolbar;
