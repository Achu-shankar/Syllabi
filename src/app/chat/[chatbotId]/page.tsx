'use client';
import ChatArea from "./components/ChatArea";
import { generateUUID } from './lib/utils';
import { useParams } from 'next/navigation';

export default function ChatHomePage() {
    const id  = generateUUID();
    const params = useParams();
    const chatbotSlug = params.chatbotId as string;
    return (
        <div className="h-full w-full flex">
            <ChatArea 
                activeSessionId={id} 
                initialMessages={[]}
                chatbotSlug={chatbotSlug}
            />
        </div>
    );
}
