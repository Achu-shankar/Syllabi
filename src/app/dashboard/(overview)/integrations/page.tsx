import { IntegrationList } from './components/integration-list';

export default function IntegrationsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Integrations Hub</h1>
                <p className="text-muted-foreground mt-1">
                    Connect your workspace to external apps and services to extend your chatbot's capabilities.
                </p>
            </div>
            <IntegrationList />
        </div>
    );
} 