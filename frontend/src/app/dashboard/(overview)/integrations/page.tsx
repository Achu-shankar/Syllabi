import { Suspense } from 'react';
import { IntegrationList } from './components/integration-list';
import { Skeleton } from '@/components/ui/skeleton';

function IntegrationListFallback() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-[200px] rounded-lg" />
            ))}
        </div>
    );
}

export default function IntegrationsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Integrations Hub</h1>
                <p className="text-muted-foreground mt-1">
                    Connect your workspace to external apps and services to extend your chatbot's capabilities.
                </p>
            </div>
            <Suspense fallback={<IntegrationListFallback />}>
                <IntegrationList />
            </Suspense>
        </div>
    );
} 