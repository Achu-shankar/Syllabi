'use client';
import { useParams, useRouter } from "next/navigation";
import ChatArea from "../components/ChatArea";
import { useFetchInitialMessages } from "../lib/hooks";
import { useEffect } from "react";
import { AlertTriangle } from 'lucide-react';

export default function ChatPage() {
    const params = useParams();
    const sessionId = params.id as string;
    const chatbotSlug = params.chatbotId as string;
    const router = useRouter();

    // 1. Fetch initial messages using the custom hook
    const { initialMessages, isLoading: isLoadingMessages, error: fetchError } = useFetchInitialMessages(
        sessionId
    );

    useEffect(() => {
        let timer: NodeJS.Timeout | undefined;
        if (fetchError) {
            console.error("Error loading chat history:", fetchError.message);
            timer = setTimeout(() => {
                router.push(`/chat/${chatbotSlug}`);
            }, 2500);
        }

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [fetchError, router]);

    // TODO: Handle fetchError appropriately (e.g., show a toast notification)
    // 3. Show loading state while fetching initial messages
    if (isLoadingMessages) {
        return (
            <div className="flex-1 h-full flex items-center justify-center p-4 bg-background ">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
        );
    }
  
    if (fetchError) {
        return (
             <div className="flex flex-1 flex-col items-center justify-center m-auto p-4">
                <div className="flex max-w-md items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Error Loading Chat</p>
                        <p>{fetchError.message}</p>
                        <p className="mt-1 text-xs">Redirecting shortly...</p>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="h-full w-full flex">
            <ChatArea 
                activeSessionId={sessionId} 
                initialMessages={initialMessages}
                chatbotSlug={chatbotSlug}
            />
        </div>
    );
}
