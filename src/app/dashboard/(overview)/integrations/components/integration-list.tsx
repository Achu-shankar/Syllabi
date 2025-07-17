'use client';

import { useIntegrations, IntegrationConnection } from '../hooks/use-integrations';
import { IntegrationCard } from './integration-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'next/navigation';

// Define all available integrations your platform supports
const AVAILABLE_INTEGRATIONS = [
    {
        type: 'slack' as const,
        name: 'Slack',
        description: 'Connect your workspace to respond to users directly in DMs and channels.',
        docsUrl: '#', // TODO: Add real docs url
    },
    {
        type: 'discord' as const,
        name: 'Discord',
        description: 'Add your AI assistant to Discord servers via slash commands.',
        docsUrl: '#', // TODO: Add real docs url
    },
    {
        type: 'google' as const,
        name: 'Google Workspace',
        description: 'Connect to Gmail, Google Drive, Calendar, and other Google services.',
        docsUrl: '#', // TODO: Add real docs url
    },
    {
        type: 'notion' as const,
        name: 'Notion',
        description: 'Connect your Notion workspace to access pages, databases, and content.',
        docsUrl: '#', // TODO: Add real docs url
    },
    {
        type: 'alexa' as const,
        name: 'Amazon Alexa',
        description: 'Enable voice interactions with your chatbots through Alexa skills.',
        docsUrl: '#', // TODO: Add real docs url
    },
    // Add Notion, Teams, etc. here in the future
];

export function IntegrationList() {
    const { data: connections, isLoading, error } = useIntegrations();
    const searchParams = useSearchParams();
    const justConnectedType = searchParams.get('connected');

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-[200px] rounded-lg" />
                ))}
            </div>
        );
    }
    
    if (error) {
        return <p className="text-destructive">Failed to load integrations.</p>
    }

    // Group connections by type instead of using just the first one
    const connectionsByType = new Map<string, IntegrationConnection[]>();
    connections?.forEach(c => {
        const existing = connectionsByType.get(c.type) || [];
        connectionsByType.set(c.type, [...existing, c]);
    });
    
    console.log("connections: ", connections);
    console.log("connectionsByType: ", connectionsByType);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AVAILABLE_INTEGRATIONS.map(def => (
                <IntegrationCard
                    key={def.type}
                    definition={def}
                    connections={connectionsByType.get(def.type) || []}
                    isJustConnected={justConnectedType === def.type}
                />
            ))}
        </div>
    );
} 