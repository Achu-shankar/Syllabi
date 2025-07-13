'use client';

import { Card, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { IntegrationConnection } from '../hooks/use-integrations';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type IntegrationDefinition = {
    type: 'slack' | 'discord' | 'alexa'; // Add more as you go
    name: string;
    description: string;
    docsUrl: string;
};

interface IntegrationCardProps {
    definition: IntegrationDefinition;
    connections: IntegrationConnection[]; // Changed from single connection to array
    isJustConnected?: boolean;
}

async function disconnectIntegration(integrationId: string): Promise<{ success: boolean }> {
    const response = await fetch(`/api/dashboard/integrations/${integrationId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect');
    }
    return response.json();
}

function WorkspaceRow({ connection }: { connection: IntegrationConnection }) {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { mutate, isPending } = useMutation({
        mutationFn: disconnectIntegration,
        onSuccess: () => {
            let additionalInfo = '';
            switch (connection.type) {
                case 'slack':
                    additionalInfo = 'To fully remove the bot, uninstall it from Slack → Manage Apps → SyllabiBot → Uninstall.';
                    break;
                case 'discord':
                    additionalInfo = 'To fully remove the bot, go to Discord → Server Settings → Integrations → Bots & Apps → SyllabiBot → Remove.';
                    break;
                case 'alexa':
                    additionalInfo = 'The Alexa skill has been unlinked from your account.';
                    break;
            }
            
            toast.success(`${connection.name} disconnected from Syllabi. ${additionalInfo}`, {
                duration: 8000, // keep visible for 8 seconds
            });
            queryClient.invalidateQueries({ queryKey: ['integrations'] });
            setIsDialogOpen(false);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleDisconnect = () => {
        if (connection?.id) {
            mutate(connection.id);
        } else {
            toast.error('Could not disconnect: Missing connection ID.');
        }
    };

    return (
        <div className="flex items-center justify-between gap-4 p-4 border rounded-lg bg-card border-border">
            <div className="min-w-0">
                <div className="font-medium truncate max-w-xs sm:max-w-sm md:max-w-md">
                    {connection.name}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                    {connection.type === 'discord' && connection.metadata.guild_id && (
                        <>Guild ID: {connection.metadata.guild_id}</>
                    )}
                    {connection.type === 'slack' && connection.metadata.team_id && (
                        <>Team ID: {connection.metadata.team_id}</>
                    )}
                    {connection.type === 'alexa' && connection.metadata.amazon_user_id && (
                        <>Amazon ID: {connection.metadata.amazon_user_id}</>
                    )}
                </div>
                <div className="text-xs text-muted-foreground">
                    Connected {new Date(connection.connectedAt).toLocaleDateString()}
                </div>
            </div>
            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="whitespace-nowrap" disabled={isPending}>
                        {isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Disconnect
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will disconnect the <strong>{connection.name}</strong> {
                                connection.type === 'discord' ? 'server' : 
                                connection.type === 'alexa' ? 'account' : 'workspace'
                            }. Your chatbot will no longer be able to respond {
                                connection.type === 'discord' ? 'in Discord' : 
                                connection.type === 'alexa' ? 'to Alexa voice commands' : 'in Slack'
                            }. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisconnect} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Disconnect
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export function IntegrationCard({ definition, connections, isJustConnected = false }: IntegrationCardProps) {
    const [showHighlight, setShowHighlight] = useState(isJustConnected);
    const hasConnections = connections.length > 0;

    useEffect(() => {
        if (isJustConnected) {
            const timer = setTimeout(() => setShowHighlight(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isJustConnected]);

    return (
        <Card className={cn(
            "flex flex-col justify-between transition-all duration-300",
            showHighlight && "ring-2 ring-offset-2 ring-offset-background ring-success"
        )}>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="bg-secondary p-1 rounded-md">
                        {definition.type === 'slack' ? (
                            <Image src="/Slack_Mark_Web.png" alt="Slack" width={32} height={32} />
                        ) : definition.type === 'discord' ? (
                            <Image src="/Discord_logo.png" alt="Discord" width={32} height={32} />
                        ) : definition.type === 'alexa' ? (
                            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded flex items-center justify-center text-white text-xs font-bold">
                                A
                            </div>
                        ) : (
                            <div className="h-6 w-6 bg-muted-foreground rounded" />
                        )}
                    </div>
                    <div className="flex-1">
                        <CardTitle className="flex items-center justify-between">
                            {definition.name}
                            {hasConnections && (
                                <span className="text-sm font-normal text-muted-foreground">
                                    {connections.length}{' '}
                                    {definition.type === 'discord' ? 'server' : 
                                     definition.type === 'alexa' ? 'account' : 'workspace'}{connections.length !== 1 ? 's' : ''} connected
                                </span>
                            )}
                        </CardTitle>
                    </div>
                </div>
                <CardDescription className="pt-2">{definition.description}</CardDescription>
                
                {hasConnections && (
                    <Accordion type="single" collapsible className="mt-4">
                        <AccordionItem value="workspaces" className="border-none">
                            <AccordionTrigger className="py-2 hover:no-underline">
                                <span className="text-sm font-medium">
                                    {definition.type === 'discord' ? 'Manage servers' : 
                                     definition.type === 'alexa' ? 'Manage accounts' : 'Manage workspaces'}
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 max-h-72 overflow-y-auto pr-2">
                                <div className="space-y-3">
                                    {connections.map((connection) => (
                                        <WorkspaceRow key={connection.id} connection={connection} />
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
            </CardHeader>
            
            <CardFooter className="flex justify-between items-center bg-secondary/50 py-3">
                <a href={definition.docsUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        Docs <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                </a>

                {/* Always show the connect button so users can link another workspace */}
                {definition.type === 'alexa' ? (
                    <div title="Linking via dashboard is only available after the skill is published. Use the Alexa app to link in development.">
                        <Button size="sm" variant={hasConnections ? 'ghost' : 'default'} disabled>
                            {hasConnections ? 'Link account' : 'Connect'}
                        </Button>
                    </div>
                ) : (
                    <a href={
                        definition.type === 'discord' 
                            ? process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || '#'
                            : `/api/integrations/${definition.type}/oauth/start`
                    }>
                        <Button size="sm" variant={hasConnections ? 'ghost' : 'default'}>
                            {hasConnections ? (
                                definition.type === 'discord' ? 'Add server' : 'Add workspace'
                            ) : 'Connect'}
                        </Button>
                    </a>
                )}
            </CardFooter>
        </Card>
    );
} 