"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Settings, Palette, Brain, Lock, Globe, Users, ChevronDown, AlertCircle } from 'lucide-react';
import { useFetchChatbotDetails } from '../hooks/useChatbotSettings';
import { useUpdateChatbotVisibility } from '../hooks/useChatbotSharing';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ChatbotVisibility } from '@/app/dashboard/libs/queries';

// Import our section components
import { GeneralSettingsSection } from './components/GeneralSettingsSection';
import { AppearanceSettingsSection } from './components/AppearanceSettingsSection';
import { BehaviorSettingsSection } from './components/BehaviorSettingsSection';

export default function UnifiedSettingsPage() {
  const params = useParams();
  const chatbotId = params.chatbotId as string;
  const [activeTab, setActiveTab] = useState("general");
  const [visibilityPopoverOpen, setVisibilityPopoverOpen] = useState(false);

  const { data: chatbot, isLoading: isLoadingDetails, error: fetchError } = useFetchChatbotDetails(chatbotId);
  const { mutate: updateVisibility, isPending: isUpdatingVisibility } = useUpdateChatbotVisibility(chatbotId);

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

  // Get visibility display info
  const getVisibilityDisplay = () => {
    if (!chatbot) return null;
    
    switch (chatbot.visibility) {
      case 'private':
        return {
          icon: Lock,
          label: 'Private',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200'
        };
      case 'public':
        return {
          icon: Globe,
          label: 'Public',
          color: 'text-green-700',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200'
        };
      case 'shared':
        return {
          icon: Users,
          label: 'Shared',
          color: 'text-blue-700',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200'
        };
      default:
        return null;
    }
  };

  const visibilityDisplay = getVisibilityDisplay();

  if (isLoadingDetails) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        {/* Sticky Header Skeleton */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Skeleton className="h-6 w-24 mb-1" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="flex space-x-6">
                  {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-9 w-20" />
                  ))}
                </div>
              </div>
        </div>
        
        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto p-6 space-y-8">
                {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-4">
                    <Skeleton className="h-6 w-48" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-16">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to load chatbot settings</h3>
              <p className="text-gray-600">
                {fetchError.message || 'An unexpected error occurred'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Sticky Combined Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-3">
            {/* Header Info */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 mb-0.5">Settings</h1>
                <p className="text-sm text-gray-600">
              Configure your chatbot's behavior, appearance, and general settings
            </p>
          </div>

              {/* Visibility Toggle */}
              {!isLoadingDetails && chatbot && visibilityDisplay && (
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
                            <Lock className="h-4 w-4 text-gray-600" />
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

              {/* Tab Navigation */}
            <TabsList className="h-auto p-0 bg-transparent w-full justify-start">
                  <TabsTrigger 
                    value="general" 
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg border border-transparent data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:border-gray-900 bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium transition-all duration-200 mr-2 text-sm"
                  >
                    <Settings className="h-4 w-4" />
                    <span>General</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="appearance" 
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg border border-transparent data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:border-gray-900 bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium transition-all duration-200 mr-2 text-sm"
                  >
                    <Palette className="h-4 w-4" />
                    <span>Appearance</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="behavior" 
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg border border-transparent data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:border-gray-900 bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium transition-all duration-200 text-sm"
                  >
                    <Brain className="h-4 w-4" />
                    <span>Behavior</span>
                  </TabsTrigger>
                </TabsList>
          </div>
              </div>

        {/* Scrollable Content Area with Smooth Transition */}
        <div className="max-w-7xl mx-auto">
                <TabsContent value="general" className="mt-0">
            <div className="px-6 pt-4 pb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-6">
                  <GeneralSettingsSection chatbot={chatbot || undefined} chatbotId={chatbotId} />
              </div>
            </div>
                </TabsContent>

                <TabsContent value="appearance" className="mt-0">
            <div className="px-6 pt-4 pb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-6">
                  <AppearanceSettingsSection chatbot={chatbot || undefined} chatbotId={chatbotId} />
              </div>
            </div>
                </TabsContent>

                <TabsContent value="behavior" className="mt-0">
            <div className="px-6 pt-4 pb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-6">
                  <BehaviorSettingsSection chatbot={chatbot || undefined} chatbotId={chatbotId} />
              </div>
          </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
} 