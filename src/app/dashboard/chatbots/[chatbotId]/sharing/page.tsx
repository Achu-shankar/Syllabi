"use client";

import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Link as LinkIcon, Users, Globe, Lock, Search, X, UserPlus, Code, Monitor } from 'lucide-react';
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

export default function ChatbotSharingPage() {
  const params = useParams();
  const chatbotId = params.chatbotId as string;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState<ChatbotVisibility>('private');

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

  const iframeCode = `<iframe src="${publicUrl}" width="100%" height="600px" frameborder="0"></iframe>`;
  const scriptCode = `<script src="https://app.syllabi.io/embed.js" data-chatbot-id="${chatbotId}"></script>`;

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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Sharing & Embedding</h1>
        <p className="text-muted-foreground">
          Control who can access your chatbot and generate sharing links.
        </p>
      </div>

      {/* Visibility Settings Section */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <div className="h-6 w-6 bg-indigo-100 dark:bg-indigo-900 rounded flex items-center justify-center text-sm">
            👁️
          </div>
          <h2 className="text-lg font-medium text-foreground">Visibility Settings</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Choose who can access and interact with your chatbot
        </p>
        
        <RadioGroup 
          value={selectedVisibility} 
          onValueChange={handleVisibilityChange}
          disabled={isUpdatingVisibility}
          className="space-y-3"
        >
          {/* Private Option */}
          <div className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
            selectedVisibility === 'private' 
              ? 'border-gray-300 bg-gray-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <RadioGroupItem value="private" id="private" className="absolute top-4 right-4" />
            <Label htmlFor="private" className="cursor-pointer block">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Lock className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Private</h3>
                  <p className="text-sm text-muted-foreground">Only you can access this chatbot</p>
                </div>
              </div>
            </Label>
          </div>

          {/* Public Option */}
          <div className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
            selectedVisibility === 'public' 
              ? 'border-green-300 bg-green-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <RadioGroupItem value="public" id="public" className="absolute top-4 right-4" />
            <Label htmlFor="public" className="cursor-pointer block">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Globe className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Public</h3>
                  <p className="text-sm text-muted-foreground">Anyone with the link can access your chatbot</p>
                </div>
              </div>
            </Label>
          </div>

          {/* Shared Option */}
          <div className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
            selectedVisibility === 'shared' 
              ? 'border-blue-300 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <RadioGroupItem value="shared" id="shared" className="absolute top-4 right-4" />
            <Label htmlFor="shared" className="cursor-pointer block">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Shared</h3>
                  <p className="text-sm text-muted-foreground">Only invited users can access your chatbot</p>
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* User Management Section - Only show when visibility is 'shared' */}
      {selectedVisibility === 'shared' && (
        <>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-6 w-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center text-sm">
                👥
              </div>
              <h2 className="text-lg font-medium text-foreground">Manage Access</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Search and invite users to collaborate with your chatbot
            </p>
            
            <div className="space-y-6">
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
          </div>
        </>
      )}

      {/* Shareable Link Section */}
      {(selectedVisibility === 'public' || selectedVisibility === 'shared') && (
        <>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-6 w-6 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center text-sm">
                🔗
              </div>
              <h2 className="text-lg font-medium text-foreground">Shareable Link</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Share this link with your {selectedVisibility === 'public' ? 'audience' : 'invited users'}
            </p>
            
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <Input 
                readOnly 
                value={publicUrl} 
                className="flex-1 font-mono text-sm" 
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(publicUrl)}
              >
            <Copy className="h-4 w-4" />
          </Button>
            </div>
          </div>
        </>
      )}

      {/* Embedding Section - Only show when visibility is 'public' */}
      {selectedVisibility === 'public' && (
        <>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-6 w-6 bg-purple-100 dark:bg-purple-900 rounded flex items-center justify-center text-sm">
                💻
              </div>
              <h2 className="text-lg font-medium text-foreground">Embed Chatbot</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Integrate your chatbot directly into your website
            </p>

      <Tabs defaultValue="iframe" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="iframe" className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Iframe
                </TabsTrigger>
                <TabsTrigger value="script" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Script
                </TabsTrigger>
        </TabsList>
              
              <TabsContent value="iframe" className="space-y-3">
                <Label className="text-sm font-medium">HTML Iframe Code</Label>
                <div className="relative">
                  <pre className="p-3 bg-gray-900 text-gray-100 rounded-md text-sm overflow-x-auto">
                        <code>{iframeCode}</code>
                    </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(iframeCode)}
                    className="absolute top-2 right-2 h-6 px-2 text-xs bg-white/10 text-white border-white/20"
                  >
                    <Copy className="h-3 w-3" />
                    </Button>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(scriptCode)}
                    className="absolute top-2 right-2 h-6 px-2 text-xs bg-white/10 text-white border-white/20"
                  >
                    <Copy className="h-3 w-3" />
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Place this script tag before the closing &lt;/body&gt; tag.
                </p>
        </TabsContent>
      </Tabs>
          </div>
        </>
      )}
    </div>
  );
}
