"use client";

import React, { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useFetchChatbotDetails } from './hooks/useChatbotSettings';
import { useUpdateChatbotVisibility } from './hooks/useChatbotSharing';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertCircle, Monitor, Smartphone, ExternalLink, RotateCcw, Lock, Globe, Users, ChevronDown, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { ChatbotVisibility } from '@/app/dashboard/libs/queries';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import { GlowEffect } from '@/components/ui/glow-effect';

type ViewMode = 'web' | 'mobile';

export default function ChatbotOverviewPage() {
  const params = useParams();
  const chatbotId = params.chatbotId as string;
  const [viewMode, setViewMode] = useState<ViewMode>('web');
  const [visibilityPopoverOpen, setVisibilityPopoverOpen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const { data: chatbot, isLoading, error } = useFetchChatbotDetails(chatbotId);
  const { mutate: updateVisibility, isPending: isUpdatingVisibility } = useUpdateChatbotVisibility(chatbotId);

  const handleReload = () => {
    if (iframeRef.current) {
      setIframeLoaded(false);
      // Force reload by changing the src
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc;
        }
      }, 10);
      toast.success('Chatbot reloaded');
    }
  };

  const handleCopyLink = () => {
    if (!chatbot?.shareable_url_slug) return;
    const url = `${window.location.origin}/chat/${chatbot.shareable_url_slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch(err => {
      toast.error('Failed to copy link.');
    });
  };

  const handleVisibilityChange = (newVisibility: ChatbotVisibility) => {
    updateVisibility(newVisibility, {
      onSuccess: () => {
        toast.success(`Chatbot visibility changed to ${newVisibility}`);
        setVisibilityPopoverOpen(false);
      },
      onError: (error) => {
        toast.error('Failed to update visibility');
      }
    });
  };

  // Check if chatbot is accessible (not private)
  const isAccessible = chatbot?.visibility !== 'private';

  // Device dimensions and styling
  const getDeviceStyle = () => {
    if (viewMode === 'mobile') {
      return {
        width: '345px',
        height: '667px', // iPhone-like proportions
        maxWidth: '90vw',
        maxHeight: '80vh',
        borderRadius: '24px',
        boxShadow: '0 0 0 8px hsl(var(--border)), 0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      };
    } else {
      return {
        width: '960px',
        height: '540px', // Laptop-like proportions
        maxWidth: '90vw',
        maxHeight: '80vh',
        borderRadius: '12px',
        boxShadow: '0 0 0 6px hsl(var(--border)), 0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      };
    }
  };

  // Get visibility display info
  const getVisibilityDisplay = () => {
    if (!chatbot) return null;
    
    switch (chatbot.visibility) {
      case 'private':
        return {
          icon: Lock,
          label: 'Private',
          color: 'text-muted-foreground',
          bgColor: 'bg-secondary',
          borderColor: 'border-border'
        };
      case 'public':
        return {
          icon: Globe,
          label: 'Public',
          color: 'text-green-700',
          bgColor: 'bg-secondary',
          borderColor: 'border-border'
        };
      case 'shared':
        return {
          icon: Users,
          label: 'Shared',
          color: 'text-blue-700',
          bgColor: 'bg-secondary',
          borderColor: 'border-border'
        };
      default:
        return null;
    }
  };

  const visibilityDisplay = getVisibilityDisplay();
  
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Chatbot Preview</h1>
            <p className="text-base text-muted-foreground mt-1">
              Test and interact with your chatbot in real-time
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Reload Button */}
            {!isLoading && chatbot && chatbot.shareable_url_slug && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReload}
                className="h-8 px-3"
                title="Reload chatbot"
                aria-label="Reload chatbot"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}

            {/* Copy Link Button */}
            {!isLoading && chatbot && chatbot.shareable_url_slug && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyLink}
                className="h-8 px-3"
                aria-label="Copy chatbot link"
                title="Copy chatbot link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}

            {/* Open Chatbot Button - Always show if shareable_url_slug exists */}
            {!isLoading && chatbot && chatbot.shareable_url_slug && (
               <div className="relative group">
                <GlowEffect
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  colors={['#9c40ff', '#ffaa40', '#3357FF']}
                  mode='rotate'
                  blur='strong'
                  duration={5}
                  scale={1.2}
                />
                <RainbowButton
                  size="sm"
                  onClick={() => window.open(`/chat/${chatbot.shareable_url_slug}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Chatbot
                </RainbowButton>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'web' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('web')}
                className={`h-8 px-3 ${viewMode === 'web' ? 'bg-primary shadow-sm' : 'hover:bg-gray-200'}`}
              >
                <Monitor className="h-4 w-4 mr-2" />
                Web
              </Button>
              <Button
                variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('mobile')}
                className={`h-8 px-3 ${viewMode === 'mobile' ? 'bg-primary shadow-sm' : 'hover:bg-gray-200'}`}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Mobile
              </Button>
            </div>

            {/* Visibility Toggle Popover */}
            {!isLoading && chatbot && visibilityDisplay && (
              <Popover open={visibilityPopoverOpen} onOpenChange={setVisibilityPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 px-3 ${visibilityDisplay.bgColor} ${visibilityDisplay.color} ${visibilityDisplay.borderColor} border hover:opacity-80 transition-opacity`}
                    disabled={isUpdatingVisibility}
                  >
                    <visibilityDisplay.icon className="h-4 w-4 mr-2" />
                    {visibilityDisplay.label}
                    <ChevronDown className="h-3 w-3 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="end">
                  <div className="p-4">
                    <h4 className="font-medium text-sm mb-3">Change Visibility</h4>
                    <RadioGroup
                      value={chatbot.visibility}
                      onValueChange={handleVisibilityChange}
                      disabled={isUpdatingVisibility}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="private" id="private-option" />
                        <Label htmlFor="private-option" className="flex items-center gap-2 text-sm cursor-pointer">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">Private</div>
                            <div className="text-xs text-muted-foreground">Only you can access</div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="public" id="public-option" />
                        <Label htmlFor="public-option" className="flex items-center gap-2 text-sm cursor-pointer">
                          <Globe className="h-4 w-4 text-green-600" />
                          <div>
                            <div className="font-medium">Public</div>
                            <div className="text-xs text-muted-foreground">Anyone with link</div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="shared" id="shared-option" />
                        <Label htmlFor="shared-option" className="flex items-center gap-2 text-sm cursor-pointer">
                          <Users className="h-4 w-4 text-blue-600" />
                          <div>
                            <div className="font-medium">Shared</div>
                            <div className="text-xs text-muted-foreground">Invited users only</div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Dotted Grid Background */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            backgroundPosition: '10px 10px'
          }}
        />
        
        {/* Content Area */}
        <div className="relative h-full flex items-center justify-center p-12">
          {isLoading ? (
            <div className="bg-card rounded-lg shadow-md border border-border p-8 max-w-md w-full">
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ) : error || !chatbot ? (
            <div className="bg-card rounded-lg shadow-md border border-border p-8 max-w-md w-full text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                {error ? 'Failed to load chatbot' : 'Chatbot not found'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'The chatbot may not exist or you may not have access to it.'}
              </p>
            </div>
          ) : !chatbot.shareable_url_slug ? (
            <div className="bg-card rounded-lg shadow-md border border-border p-8 max-w-md w-full text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                No shareable URL
              </h3>
              <p className="text-sm text-muted-foreground">
                This chatbot doesn't have a shareable URL configured yet.
              </p>
            </div>
          ) : (
            <div 
              className="relative overflow-hidden bg-white transition-all duration-300 ease-in-out"
              style={getDeviceStyle()}
            >
              <iframe
                ref={iframeRef}
                src={`/chat/${chatbot.shareable_url_slug}?preview=true&isolated=true`}
                className={`w-full h-full border-0 transition-opacity duration-300 ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}
                title="Chatbot Preview"
                onLoad={() => setIframeLoaded(true)}
              />
            </div>
          )}
        </div>
        
        {/* Floating Status Indicator */}
        {chatbot && visibilityDisplay && (
          <div className="absolute top-4 left-4">
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-normal ${visibilityDisplay.bgColor} ${visibilityDisplay.color} ${visibilityDisplay.borderColor} border`}>
              <div className={`w-1.5 h-1.5 rounded-full ${chatbot.visibility === 'private' ? 'bg-muted-foreground' : 'bg-green-500 animate-pulse'}`} />
              <visibilityDisplay.icon className="h-2.5 w-2.5" />
              {chatbot.visibility === 'private' ? 'Private - Owner Only' : 'Live Preview'}
            </div>
          </div>
        )}

        {/* Device Label */}
        {chatbot && chatbot.shareable_url_slug && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1 text-sm font-normal text-muted-foreground">
              {viewMode === 'mobile' ? '📱 Mobile View' : '💻 Desktop View'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
