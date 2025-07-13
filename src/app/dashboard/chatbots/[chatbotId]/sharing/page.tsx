"use client";

import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link as LinkIcon, Users, Globe, Lock, Search, X, UserPlus, Code, Monitor, MessageCircle, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useParams } from 'next/navigation';
import { useFetchChatbotDetails } from '../hooks/useChatbotSettings';
import { 
  useUpdateChatbotVisibility,
  useSearchUsers,
  useGrantChatbotPermission,
  useChatbotPermissions,
  useRemoveChatbotPermission,
  generateShareableUrl
} from '../hooks/useChatbotSharing';
import { ChatbotVisibility } from '@/app/dashboard/libs/queries';
import { toast } from 'sonner';
import { getProductionBaseUrl, getCurrentBaseUrl } from '@/utils/url';

// Chat Bubble Components
import { ChatBubblePreview } from './components/ChatBubblePreview';
import { ChatBubbleConfigurator } from './components/ChatBubbleConfigurator';
import { ChatBubbleCodeDisplay } from './components/ChatBubbleCodeDisplay';
import { BubbleStyleSelector } from './components/BubbleStyleSelector';
import { BUBBLE_STYLES } from './components/bubbleStyles';
import { BubbleConfig, DEFAULT_BUBBLE_CONFIG } from './types/chatBubble';
import { FieldsetBlock } from '../settings/components/FieldsetBlock';
import { VisibilityCard } from './components/VisibilityCard';
import { ChatBubbleDrawer } from './components/ChatBubbleDrawer';

// Copy button with icon swap feedback
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className={className}
    >
      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export default function ChatbotSharingPage() {
  const params = useParams();
  const chatbotId = params.chatbotId as string;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState<ChatbotVisibility>('private');
  
  // Chat Bubble State
  const [bubbleConfig, setBubbleConfig] = useState<BubbleConfig>(DEFAULT_BUBBLE_CONFIG);
  const [selectedStyleId, setSelectedStyleId] = useState('standard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftConfig, setDraftConfig] = useState<BubbleConfig>(bubbleConfig);
  const [draftStyleId, setDraftStyleId] = useState(selectedStyleId);
  const prevConfigRef = React.useRef<BubbleConfig>(bubbleConfig);
  const prevTemplateRef = React.useRef(selectedStyleId);

  // Hooks for chatbot data and sharing functionality
  const { data: chatbot, isLoading: isLoadingChatbot } = useFetchChatbotDetails(chatbotId);
  const { mutate: updateVisibility, isPending: isUpdatingVisibility } = useUpdateChatbotVisibility(chatbotId);
  const { data: searchResults = [], isLoading: isSearching } = useSearchUsers(searchQuery);
  const { mutate: grantPermission, isPending: isGrantingPermission } = useGrantChatbotPermission(chatbotId);
  const { data: permissions = [], isLoading: isLoadingPermissions } = useChatbotPermissions(chatbotId);
  const { mutate: removePermission, isPending: isRemovingPermission } = useRemoveChatbotPermission(chatbotId);

  // Update selected visibility when chatbot data loads
  React.useEffect(() => {
    if (chatbot?.visibility) {
      setSelectedVisibility(chatbot.visibility);
    }
  }, [chatbot?.visibility]);

  const handleVisibilityChange = (visibility: ChatbotVisibility) => {
    setSelectedVisibility(visibility);
    updateVisibility(visibility);
  };

  const handleGrantPermission = (userId: string) => {
    grantPermission({ userId, role: 'viewer' });
    setSearchQuery(''); // Clear search after granting
  };

  const handleRemovePermission = (userId: string) => {
    removePermission(userId);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy: ", err);
      toast.error("Failed to copy to clipboard.");
    });
  };

  // Generate URLs
  const publicUrl = chatbot?.shareable_url_slug 
    ? generateShareableUrl(chatbotId, chatbot.shareable_url_slug)
    : generateShareableUrl(chatbotId);

  // Generate embedded URLs
  // Use production URL for generated code (so it works when users copy/paste)
  const embeddedUrlForCode = `${getProductionBaseUrl()}/embed/${chatbot?.shareable_url_slug}?session=persistent&theme=light`;
  // Use current URL for preview (so preview works in development)
  const embeddedUrlForPreview = `${getCurrentBaseUrl()}/embed/${chatbot?.shareable_url_slug}?session=persistent&theme=light`;
  
  const iframeCode = `<iframe src="${embeddedUrlForCode}" width="100%" height="600px" frameborder="0" style="border: none; border-radius: 8px;"></iframe>`;
  const scriptCode = `<script src="${getProductionBaseUrl()}/embed.js" data-chatbot-slug="${chatbot?.shareable_url_slug}" data-session="persistent" data-theme="light"></script>`;

  if (isLoadingChatbot) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto">
        <div>
          <Skeleton className="h-8 w-1/2 mb-2 bg-muted" />
          <Skeleton className="h-4 w-3/4 bg-muted" />
        </div>
        <hr className="my-6 border-border" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/4 mb-1 bg-muted" />
          <Skeleton className="h-10 w-full bg-muted" />
          <Skeleton className="h-4 w-2/3 bg-muted" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/4 mb-1 bg-muted" />
          <Skeleton className="h-20 w-full bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-10 mb-20">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Sharing & Embedding</h1>
        <p className="text-muted-foreground">
          Control who can access your chatbot and generate sharing links.
        </p>
      </div>

      {/* Visibility Settings Section */}
      <FieldsetBlock title="Visibility Settings" icon={<Eye className="h-4 w-4" />} index={0}>
        <p className="text-sm text-muted-foreground mb-4">Choose who can access and interact with your chatbot</p>
        <RadioGroup
          value={selectedVisibility}
          onValueChange={handleVisibilityChange}
          disabled={isUpdatingVisibility}
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <VisibilityCard
            value="private"
            selected={selectedVisibility === 'private'}
            label="Private"
            description="Only you"
          />
          <VisibilityCard
            value="public"
            selected={selectedVisibility === 'public'}
            label="Public"
            description="Anyone with link"
          />
          <VisibilityCard
            value="shared"
            selected={selectedVisibility === 'shared'}
            label="Shared"
            description="Invited users"
          />
        </RadioGroup>
      </FieldsetBlock>

      {/* User Management Section - Only show when visibility is 'shared' */}
      {selectedVisibility === 'shared' && (
        <>
          <Separator />
          <FieldsetBlock title="Manage Access" icon={<Users className="h-4 w-4" />} index={2}>
            <div className="space-y-4">
              {/* User Search */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchQuery.length >= 2 && (
                <div className="border rounded-lg overflow-hidden">
                  {isSearching ? (
                    <div className="p-4 space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="space-y-1 flex-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                          <Skeleton className="h-8 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="divide-y">
                      {searchResults.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {user.full_name || user.email || 'Unknown User'}
                              </p>
                              {user.email && (
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              )}
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleGrantPermission(user.id)}
                            disabled={isGrantingPermission || permissions.some(p => p.user_id === user.id)}
                          >
                            {permissions.some(p => p.user_id === user.id) ? 'Added' : 'Invite'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <Search className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No users found matching "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Current Permissions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Users with Access</Label>
                  <Badge variant="secondary">
                    {permissions.length}
                  </Badge>
                </div>
                
                {isLoadingPermissions ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-6 w-6" />
                      </div>
                    ))}
                  </div>
                ) : permissions.length > 0 ? (
                  <div className="space-y-2">
                    {permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={permission.user?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {permission.user?.full_name?.charAt(0) || permission.user?.email?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {permission.user?.full_name || permission.user?.email || 'Unknown User'}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {permission.role}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(permission.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemovePermission(permission.user_id)}
                          disabled={isRemovingPermission}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                    <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No users invited yet</p>
                  </div>
                )}
              </div>
            </div>
          </FieldsetBlock>
        </>
      )}

      {/* Shareable Link Section */}
      {(selectedVisibility === 'public' || selectedVisibility === 'shared') && (
        <>
          <Separator />
          <FieldsetBlock title="Shareable Link" icon={<LinkIcon className="h-4 w-4" />} index={1}>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input readOnly value={publicUrl} className="flex-1 font-mono text-sm" />
              <CopyButton text={publicUrl} />
            </div>
          </FieldsetBlock>
        </>
      )}

      {/* Embedding Section - Only show when visibility is 'public' */}
      {selectedVisibility === 'public' && (
        <>
          <Separator />
          <FieldsetBlock title="Embed Chatbot" icon={<Monitor className="h-4 w-4" />} index={2}>
            <Tabs defaultValue="iframe" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger
                  value="iframe"
                  className="relative flex items-center gap-2.5 px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:scale-x-0 after:bg-gradient-to-r after:from-purple-500 after:via-pink-500 after:to-yellow-500 data-[state=active]:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  <Monitor className="h-4 w-4" />
                  Iframe
                </TabsTrigger>
                <TabsTrigger
                  value="script"
                  className="relative flex items-center gap-2.5 px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:scale-x-0 after:bg-gradient-to-r after:from-purple-500 after:via-pink-500 after:to-yellow-500 data-[state=active]:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  <Code className="h-4 w-4" />
                  Script
                </TabsTrigger>
                <TabsTrigger
                  value="chat-bubble"
                  className="relative flex items-center gap-2.5 px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:scale-x-0 after:bg-gradient-to-r after:from-purple-500 after:via-pink-500 after:to-yellow-500 data-[state=active]:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat Bubble
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="iframe" className="space-y-3">
                <Label className="text-sm font-medium">HTML Iframe Code</Label>
                <div className="relative">
                  <pre className="p-3 bg-gray-900 text-gray-100 rounded-md text-sm overflow-x-auto">
                        <code>{iframeCode}</code>
                    </pre>
                  <CopyButton text={iframeCode} className="absolute top-2 right-2" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Copy and paste this code where you want the chatbot to appear.
                </p>
              </TabsContent>
              
              <TabsContent value="script" className="space-y-3">
                <Label className="text-sm font-medium">JavaScript Embed Code</Label>
                <div className="relative">
                  <pre className="p-3 bg-gray-900 text-gray-100 rounded-md text-sm overflow-x-auto">
                        <code>{scriptCode}</code>
                    </pre>
                  <CopyButton text={scriptCode} className="absolute top-2 right-2" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Place this script tag before the closing &lt;/body&gt; tag.
                </p>
              </TabsContent>

              <TabsContent value="chat-bubble" className="space-y-8">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Chat Bubble Widget
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Create a floating chat bubble that opens your chatbot. Perfect for customer support and lead generation.
                  </p>
                </div>

                {/* Preview */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Live Preview</h3>
                  <div className="sticky top-4">
                    <ChatBubblePreview 
                      config={bubbleConfig}
                      embeddedUrl={`${getCurrentBaseUrl()}/embed/${chatbot?.shareable_url_slug}`}
                    />
                  </div>
                </div>

                <Button variant="outline" onClick={() => {
                  prevConfigRef.current = bubbleConfig;
                  prevTemplateRef.current = selectedStyleId;
                  setDraftConfig(bubbleConfig);
                  setDraftStyleId(selectedStyleId);
                  setDrawerOpen(true);
                }}>Customize Bubble</Button>

                {/* Generated Code Section */}
                <div className="border-t pt-8">
                  <h3 className="text-xl font-semibold mb-6">Generated Code</h3>
                  <ChatBubbleCodeDisplay
                    config={bubbleConfig}
                    selectedTemplateId={selectedStyleId}
                    chatbotSlug={chatbot?.shareable_url_slug || 'chatbot'}
                    embeddedUrl={`${getProductionBaseUrl()}/embed/${chatbot?.shareable_url_slug}`}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </FieldsetBlock>
        </>
      )}

      {/* Drawer */}
      <ChatBubbleDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSave={() => {
          setDrawerOpen(false);
        }}
        saving={false}
        onCancel={() => {
          setBubbleConfig(prevConfigRef.current);
          setSelectedStyleId(prevTemplateRef.current);
          setDrawerOpen(false);
        }}
      >
        <div className="space-y-6">
          <BubbleStyleSelector
            styles={BUBBLE_STYLES}
            selectedId={draftStyleId}
            onSelect={(style)=>{
              setDraftStyleId(style.id);
              setDraftConfig({...style.config});
              setBubbleConfig({...style.config});
            }}
          />
          <ChatBubbleConfigurator
            config={draftConfig}
            onChange={(cfg)=>{setDraftConfig(cfg); setBubbleConfig(cfg);}}
          />
        </div>
      </ChatBubbleDrawer>
    </div>
  );
}
