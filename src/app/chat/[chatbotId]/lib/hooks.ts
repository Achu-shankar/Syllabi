'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { convertDbMessagesToUiMessages } from './utils';
import type { ChatSession, DBMessage } from './db/queries';
import type { Message } from '@ai-sdk/react';



const fetchMessages = async (sessionId: string): Promise<DBMessage[]> => {
    const response = await fetch(`/api/sessions/${sessionId}/messages`);
    if (!response.ok) {
        throw new Error('Failed to fetch messages');
    }
    const data: DBMessage[] = await response.json();
    return data;
}

const fetchSessionList = async (userId: string, chatbotSlug: string): Promise<ChatSession[]> => {
    const response = await fetch(`/api/chat/sessions?chatbotSlug=${chatbotSlug}`);
    if (!response.ok) {
        throw new Error('Failed to fetch session list');
    }
    const data = await response.json();
    return data.sessions; // The API returns { sessions: [...] }
}

const deleteSession = async (sessionId: string, chatbotSlug: string): Promise<void> => {
    const response = await fetch(`/api/chat/sessions`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, chatbotSlug }),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete chat');
    }
}

const renameSession = async (sessionId: string, name: string, chatbotSlug: string): Promise<void> => {
    const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, chatbotSlug }),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rename chat');
    }
}

export function useFetchInitialMessages(sessionId: string | null){
    const queryKey = ['chatMessages', sessionId];

    if (!sessionId) {
        return {
            initialMessages: [],
            isLoading: false,
            isFetching: false,
            error: null,
        };
    }

    const {data:rawMessages, error, isFetching, isLoading} = useQuery<DBMessage[], Error>({
        queryKey: queryKey,
        queryFn: () => 
            {
                if (!sessionId) {
                    throw new Error('Session ID is required');
                }
                return fetchMessages(sessionId);
            },
            enabled: !!sessionId,
            staleTime: 5*60*1000,
            refetchOnWindowFocus: false,
            retry:1,
    });

    const initialMessages: Message[] = !isLoading && rawMessages
    ? convertDbMessagesToUiMessages(rawMessages)
    : []; // Return empty array while loading or if no data

    return {
        initialMessages,
        isLoading: isLoading, // Use isLoading for initial load status
        isFetching: isFetching, // Use isFetching for background refetch status
        error: error, // Pass the error object
      };

}

export function useFetchSessionList(userId: string, chatbotSlug: string) {
    const queryKey = ['sessionList', userId, chatbotSlug];

    const {data:sessions, error, isFetching, isLoading} = useQuery<ChatSession[], Error>({
        queryKey: queryKey,
        queryFn: () => {
            if (!userId) {
                throw new Error('User ID is required');
            }
            if (!chatbotSlug) {
                throw new Error('Chatbot slug is required');
            }
            return fetchSessionList(userId, chatbotSlug);
        },
        enabled: !!userId && !!chatbotSlug,
        staleTime: 15*60*1000,
        refetchOnWindowFocus: false,
    });

    return {
        sessions: sessions ?? [],
        error: error,
        isFetching: isFetching,
        isLoading: isLoading,
    };
}

export function useDeleteSession() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { sessionId: string; chatbotSlug: string }>({
        mutationFn: ({ sessionId, chatbotSlug }) => deleteSession(sessionId, chatbotSlug),
        onSuccess: () => {
            // Invalidate the session list queries when a session is successfully deleted
            queryClient.invalidateQueries({ queryKey: ['sessionList'] });
        },
    });
}

export function useRenameSession() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ sessionId, name, chatbotSlug }: { sessionId: string; name: string; chatbotSlug: string }) => 
            renameSession(sessionId, name, chatbotSlug),
        onSuccess: (_, { sessionId, name, chatbotSlug }) => {
            // Invalidate all session list queries to refresh them
            queryClient.invalidateQueries({ queryKey: ['sessionList'] });
            
            // Also update the cache directly for immediate UI update
            // We need to update all possible query keys that might exist
            queryClient.setQueriesData<ChatSession[]>(
                { queryKey: ['sessionList'] },
                (oldData) => {
                    if (!oldData) return undefined;
                    return oldData.map(session => 
                        session.id === sessionId 
                            ? { ...session, name: name } // Use 'name' property, not 'title'
                            : session
                    );
                }
            );
        }
    });
}



