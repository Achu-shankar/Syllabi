'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Link2, PlusCircle, Trash2 } from 'lucide-react';
import { useIntegrations, IntegrationConnection } from '@/app/dashboard/(overview)/integrations/hooks/use-integrations';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  useChatbotChannels, 
  useCreateChannelLink, 
  useUpdateChannelLink, 
  useDeleteChannelLink 
} from './hooks/use-chatbot-channels';

// Alexa-specific link form component
function AlexaLinkForm({ 
    conn, 
    onLink, 
    isPending 
}: { 
    conn: IntegrationConnection; 
    onLink: (conn: IntegrationConnection, trigger: string | null, isDefault: boolean) => void; 
    isPending: boolean; 
}) {
    const [trigger, setTrigger] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLink(conn, trigger.trim() || null, isDefault);
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input 
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="trigger phrase (optional)"
                className="font-mono w-40 h-8" 
            />
            <div className="flex items-center space-x-2">
                <Checkbox 
                    id={`default-${conn.id}`}
                    checked={isDefault}
                    onCheckedChange={(checked) => setIsDefault(checked as boolean)}
                />
                <label 
                    htmlFor={`default-${conn.id}`} 
                    className="text-xs text-muted-foreground cursor-pointer"
                >
                    Default
                </label>
            </div>
            <Button type="submit" size="sm" disabled={isPending}>
                <Link2 className="h-4 w-4 mr-2" />Link Bot
            </Button>
        </form>
    );
}

export default function ChannelsPage() {
    const params = useParams();
    const chatbotId = params.chatbotId as string;
    
    // Fetch integrations and channel links
    const { data: connectionsData, isLoading: isLoadingIntegrations } = useIntegrations();
    const { data: channelLinks, isLoading: isLoadingChannels } = useChatbotChannels(chatbotId);
    
    // Mutations for channel operations
    const createMutation = useCreateChannelLink();
    const updateMutation = useUpdateChannelLink();
    const deleteMutation = useDeleteChannelLink();
    
    const connections = (connectionsData || []) as IntegrationConnection[];
    const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

    // Create a map of integration_id -> channel link for quick lookup
    const channelLinkMap = new Map(
        (channelLinks || []).map(link => [link.integration_id, link])
    );

    const handleLink = (conn: IntegrationConnection, command: string) => {
        const config: any = {};
        
        if (conn.type === 'slack') {
            config.slash_command = command;
            config.is_default = false;
        } else if (conn.type === 'discord') {
            config.slash_command = command;
            config.is_default = false;
        }

        createMutation.mutate({
            chatbotId,
            integrationId: conn.id,
            config
        });
    };

    const handleAlexaLink = (conn: IntegrationConnection, trigger: string | null, isDefault: boolean = false) => {
        const config: any = {
            is_default: isDefault
        };
        
        if (trigger) {
            config.trigger = trigger;
        }

        createMutation.mutate({
            chatbotId,
            integrationId: conn.id,
            config
        });
    };

    const handleUnlink = (channelLinkId: string) => {
        deleteMutation.mutate({
            chatbotId,
            linkId: channelLinkId
        });
    };

    const getCommandDisplay = (conn: IntegrationConnection, link: any) => {
        if (conn.type === 'slack') {
            return `/ask ${link.config?.slash_command}`;
        } else if (conn.type === 'discord') {
            return (
                <span>
                    /ask bot:{link.config?.slash_command} <em className="text-xs text-muted-foreground/70">or</em> /{link.config?.slash_command}
                </span>
            );
        } else if (conn.type === 'alexa') {
            const trigger = link.config?.trigger;
            const isDefault = link.config?.is_default;
            return (
                <span>
                    {trigger ? `"ask ${trigger}"` : 'Default bot'} 
                    {isDefault && <em className="text-xs text-green-600 ml-2">• Default</em>}
                </span>
            );
        }
        return 'Unknown';
    };

    return (
        <div className="space-y-6 px-4 md:px-8 py-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Channel Integrations</h1>
                <p className="text-muted-foreground mt-1">
                    Connect this chatbot to your integrated channels. All connections are managed centrally in the <Link href="/dashboard/integrations" className="underline">Integrations Hub</Link>.
                </p>
            </div>
            
            <div className="space-y-3">
                {(isLoadingIntegrations || isLoadingChannels) && <Skeleton className="h-16 w-full rounded-lg" />}
                {!isLoadingIntegrations && !isLoadingChannels && connections?.filter(conn => conn.type === 'slack' || conn.type === 'discord' || conn.type === 'alexa').map(conn => {
                    const channelLink = channelLinkMap.get(conn.id);
                    const isLinked = !!channelLink;
                    
                    return (
                        <div key={conn.id} className="border border-border rounded-lg p-4 flex items-center justify-between bg-card">
                            <div className="flex items-center gap-3 min-w-0">
                                {conn.type === 'alexa' ? (
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        A
                                    </div>
                                ) : (
                                    <Image 
                                        src={conn.type === 'discord' ? '/Discord_logo.png' : '/Slack_Mark_Web.png'}
                                        alt={conn.type === 'discord' ? 'Discord' : 'Slack'}
                                        width={32} 
                                        height={32} 
                                        className="flex-shrink-0"
                                    />
                                )}
                                <div className="min-w-0">
                                    <h3 className="font-medium truncate max-w-xs sm:max-w-sm md:max-w-md">{conn.name || `Unnamed ${conn.type === 'discord' ? 'Server' : conn.type === 'alexa' ? 'Account' : 'Workspace'}`}</h3>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {conn.type === 'discord' ? 'Server' : conn.type === 'alexa' ? 'Account' : 'Workspace'} ID: {(conn.metadata?.guild_id || conn.metadata?.team_id || conn.metadata?.amazon_user_id || 'Unknown').slice(0, 60)}
                                    </p>
                                </div>
                            </div>
                            {isLinked ? (
                                <div className="flex items-center gap-2">
                                    <div className="text-sm text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded-md whitespace-nowrap">
                                        {getCommandDisplay(conn, channelLink)}
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleUnlink(channelLink.id)} 
                                        disabled={isPending} 
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />Unlink
                                    </Button>
                                </div>
                            ) : conn.type === 'alexa' ? (
                                <AlexaLinkForm 
                                    conn={conn} 
                                    onLink={handleAlexaLink} 
                                    isPending={isPending} 
                                />
                            ) : (
                                <form onSubmit={(e) => { e.preventDefault(); handleLink(conn, e.currentTarget.command.value); }} className="flex items-center gap-2">
                                    <Input 
                                        name="command" 
                                        placeholder={conn.type === 'discord' ? 'bot-name' : 'chatbot-name'}
                                        className="font-mono w-36 h-8" 
                                        required 
                                    />
                                    <Button type="submit" size="sm" disabled={isPending}>
                                        <Link2 className="h-4 w-4 mr-2" />Link Chatbot
                                    </Button>
                                </form>
                            )}
                        </div>
                    )
                })}
                {!isLoadingIntegrations && !isLoadingChannels && connections?.filter(conn => conn.type === 'slack' || conn.type === 'discord' || conn.type === 'alexa').length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg border-border bg-secondary/20">
                        <p className="text-muted-foreground">No Slack, Discord, or Alexa integrations connected yet.</p>
                        <Link href="/dashboard/integrations">
                            <Button variant="default" className="mt-4">
                                <PlusCircle className="mr-2 h-4 w-4" /> Go to Integrations Hub
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
} 