"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlowEffect } from "@/components/ui/glow-effect";
import Orb from "@/components/ui/orb";
import { DotsThreeVertical } from '@phosphor-icons/react/dist/csr/DotsThreeVertical';
import { Chat } from '@phosphor-icons/react/dist/csr/Chat';
import { Users } from '@phosphor-icons/react/dist/csr/Users';
import { Gear } from '@phosphor-icons/react/dist/csr/Gear';
import { ArrowSquareOut } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
import { Copy } from '@phosphor-icons/react/dist/csr/Copy';
import { Trash } from '@phosphor-icons/react/dist/csr/Trash';
import { Chatbot } from '@/app/dashboard/libs/queries';
import { getProductionBaseUrl } from '@/utils/url';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Status configuration
const getStatusConfig = (chatbot: Chatbot) => {
  const isActive = chatbot.is_active;
  const hasContent = chatbot.student_facing_name; // Proxy for having content setup
  
  if (!isActive) {
    return { label: 'Draft', dotColor: 'bg-gray-400', variant: 'secondary' as const };
  } else if (hasContent) {
    return { label: 'Active', dotColor: 'bg-green-500', variant: 'default' as const };
  } else {
    return { label: 'Training', dotColor: 'bg-yellow-500', variant: 'secondary' as const };
  }
};

// Generate deterministic background color based on chatbot name and id
const generateCardColor = (chatbot: Chatbot) => {
  const seed = chatbot.name + chatbot.id;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  
  // Better distributed hue generation (avoid blue bias)
  const hueBase = Math.abs(hash) % 360;
  // Add some spreading to avoid clustering
  const hueSpread = (Math.abs(hash >> 16) % 60) - 30; // -30 to +30 degree spread
  const hue = (hueBase + hueSpread + 360) % 360;
  
  // More vibrant colors
  const saturation = 70 + (Math.abs(hash >> 8) % 25); // 70-95% (more saturated)
  const lightness = 50 + (Math.abs(hash >> 12) % 15); // 50-65% (brighter)
  
  return {
    hsl: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    hover: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.85)`, // Rich but not overwhelming
    hue: hue // For the orb effect
  };
};

// Mock analytics data - replace with real data later
const getMockAnalytics = (chatbot: Chatbot) => {
  const conversations = Math.floor(Math.random() * 1500) + 100;
  const users = Math.floor(conversations * 0.7);
  const daysSinceCreated = Math.floor((Date.now() - new Date(chatbot.created_at).getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    conversations,
    users,
    daysSinceCreated
  };
};

interface ChatbotCardsProps {
  chatbots: Chatbot[];
  onEditChatbot: (chatbot: Chatbot) => void;
  onDeleteChatbot: (chatbot: Chatbot) => void;
}

export function ChatbotCards({ chatbots, onEditChatbot, onDeleteChatbot }: ChatbotCardsProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here for better UX
      alert("Link copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy: ", err);
      alert("Failed to copy to clipboard.");
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {chatbots.map((chatbot) => {
        const statusConfig = getStatusConfig(chatbot);
        const analytics = getMockAnalytics(chatbot);
        const colors = generateCardColor(chatbot);
        
        return (
          <div 
            key={chatbot.id} 
            className="group relative h-48"
          >
            {/* Glow Effect Container - Only visible on hover */}
            <div className="absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl">
              <GlowEffect
                colors={['#0894FF', '#C959DD', '#FF2E54', '#FF9004']}
                mode='static'
                blur='medium'
              />
            </div>

            {/* Card Content */}
            <div 
              className="relative h-full rounded-2xl border border-border shadow-md hover:shadow-xl transition-all duration-500 overflow-hidden bg-gray-50 dark:bg-gray-900"
            >
              {/* Background Color Overlay for Hover */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ backgroundColor: colors.hover }}
              />

              {/* Header Section */}
              <div className="relative p-6 pb-5 z-10">
                <div className="flex justify-between items-center">
                  {/* Status Badge */}
                  <Badge variant={statusConfig.variant} className="text-xs group-hover:bg-black/60 group-hover:text-white group-hover:border-white/20 transition-all duration-300">
                    <div className={`w-2 h-2 rounded-full ${statusConfig.dotColor} mr-2`} />
                    {statusConfig.label}
                  </Badge>
                  
                  {/* Kebab Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-foreground group-hover:text-white/80 group-hover:hover:text-white group-hover:hover:bg-white/10 transition-colors duration-300"
                      >
                        <DotsThreeVertical className="h-4 w-4" weight="bold" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEditChatbot(chatbot)}>
                          <Gear className="mr-2 h-4 w-4" weight="bold" />
                          Settings
                        </DropdownMenuItem>
                        
                        {chatbot.visibility !== 'private' && chatbot.shareable_url_slug && (
                          <>
                            <DropdownMenuItem onClick={() => window.open(`/chat/${chatbot.shareable_url_slug}`, '_blank')}>
                              <ArrowSquareOut className="mr-2 h-4 w-4" weight="bold" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyToClipboard(`${getProductionBaseUrl()}/chat/${chatbot.shareable_url_slug}`)}>
                              <Copy className="mr-2 h-4 w-4" weight="bold" />
                              Copy Link
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDeleteChatbot(chatbot)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash className="mr-2 h-4 w-4" weight="bold" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              </div>

              {/* Central Clickable Area - Contains Orb and Name */}
              <div 
                className="absolute inset-0 top-16 bottom-16 flex items-center justify-center z-10 cursor-pointer"
                onClick={() => window.location.href = `/dashboard/chatbots/${chatbot.id}/`}
              >
                {/* Orb Effect (low opacity by default, full on hover) */}
                <div className="absolute inset-0 opacity-25 group-hover:opacity-100 transition-opacity duration-500">
                  <Orb 
                    hue={colors.hue}
                    hoverIntensity={0.3}
                    rotateOnHover={true}
                  />
                </div>
                
                {/* Chatbot Name (always visible, overlaid on top) */}
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <h3 className="font-medium text-foreground group-hover:text-white text-2xl text-center px-6 transition-colors duration-300 drop-shadow-lg">
                    {chatbot.name}
                  </h3>
                </div>
              </div>

              {/* Footer - Analytics & Creation Date (Always visible, clickable) */}
              <div 
                className="absolute bottom-0 left-0 right-0 bg-white/90 group-hover:bg-white backdrop-blur-sm rounded-b-2xl transition-colors duration-300 z-10 cursor-pointer"
                onClick={() => window.location.href = `/dashboard/chatbots/${chatbot.id}/`}
              >
                <div className="px-6 py-3">
                  <div className="flex items-center justify-between text-sm">
                    {/* Analytics Section */}
                    <div className="flex items-center gap-4 text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Chat className="h-4 w-4 text-muted-foreground" weight="bold" />
                        <span>{analytics.conversations.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-muted-foreground" weight="bold" />
                        <span>{analytics.users.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    {/* Creation Date */}
                    <small className="text-muted-foreground">
                      Created {analytics.daysSinceCreated} day{analytics.daysSinceCreated !== 1 ? 's' : ''} ago
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 