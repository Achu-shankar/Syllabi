'use client';
import ChatArea from "./components/ChatArea";
import { generateUUID } from './lib/utils';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';

export default function ChatHomePage() {
    const params = useParams();
    const searchParams = useSearchParams();

    const currentChatbotSlug = params.chatbotId as string;
    const newSessionTrigger = searchParams.get('newSession');

    const [chatSessionId, setChatSessionId] = useState(() => generateUUID());

    // Store the "context" (slug + trigger) for which the current chatSessionId was generated.
    const sessionContextRef = useRef<{ slug: string | null; trigger: string | null | undefined }>({
        slug: null, // Initially no slug processed
        trigger: undefined, // Initially no trigger processed (undefined is different from null)
    });

    useEffect(() => {
        const newContextSlug = currentChatbotSlug;
        const newContextTrigger = newSessionTrigger;

        // Regenerate session ID if:
        // 1. The chatbot slug has changed from the one that generated the current session.
        // OR
        // 2. A newSessionTrigger is present in the URL (is not null), AND this specific trigger value
        //    is different from the trigger that generated the current session for the current chatbot slug.
        if (
            sessionContextRef.current.slug !== newContextSlug ||
            (newContextTrigger !== null && sessionContextRef.current.trigger !== newContextTrigger)
        ) {
            setChatSessionId(generateUUID());
            sessionContextRef.current = { slug: newContextSlug, trigger: newContextTrigger };
        }
        // This handles the case where newSessionTrigger goes from a value to null (due to replaceState)
        // for the *same* chatbot. We update our stored trigger to null (reflecting it's consumed)
        // but importantly, DON'T generate a new ID.
        else if (sessionContextRef.current.slug === newContextSlug && newContextTrigger === null && sessionContextRef.current.trigger !== null) {
            sessionContextRef.current.trigger = null;
        }
    }, [currentChatbotSlug, newSessionTrigger]);

    const chatbotSlug = currentChatbotSlug || "default-chatbot";

    return (
        <div className="h-full w-full flex">
            <ChatArea
                activeSessionId={chatSessionId}
                initialMessages={[]}
                chatbotSlug={chatbotSlug}
            />
        </div>
    );
}
