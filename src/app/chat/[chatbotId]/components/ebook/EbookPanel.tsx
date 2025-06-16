import React from 'react';
// Panel, PanelGroup, PanelResizeHandle are not used directly in this file yet
// They will be used in layout.tsx where EbookPanel is placed.
// import {Panel, PanelGroup, PanelResizeHandle} from 'react-resizable-panels'; 
import EbookReader from './EbookReader';
import {useEbookContext} from '../../lib/context/ebook-context';

export default function EbookPanel(){
    const {isEbookPanelOpen} = useEbookContext();

    if (!isEbookPanelOpen) return null;

    return (
        <div className="flex flex-col h-full bg-background border-l">
            <EbookReader/>
        </div>
    )
}

