'use client';

import { useQuery } from '@tanstack/react-query';

export type IntegrationConnection = {
    id: string;              // Our internal UUID
    type: string;            // Integration type: 'slack', 'discord', 'alexa', etc.
    name: string;            // Human-readable display name
    connectedAt: string;     // ISO timestamp
    metadata: Record<string, any>;  // Integration-specific data
};

async function fetchIntegrations(): Promise<IntegrationConnection[]> {
    const response = await fetch('/api/dashboard/integrations');
    if (!response.ok) {
        throw new Error('Failed to fetch integrations');
    }
    const data = await response.json();
    
    // --- FINAL DEBUG STEP ---
    console.log('Raw data received in fetchIntegrations hook:', data);
    // --- END DEBUG STEP ---
    
    return data;
}

export function useIntegrations() {
    return useQuery<IntegrationConnection[], Error>({
        queryKey: ['integrations'],
        queryFn: fetchIntegrations,
    });
} 