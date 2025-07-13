"use client"; // If we plan to have client-side interactions like fetching data, forms etc.

import React, { useState, useMemo } from 'react'; // Added useMemo for filtering
import Link from 'next/link'; // Added for future navigation
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Added Input component
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { PlusCircle } from '@phosphor-icons/react/dist/csr/PlusCircle';
import { Robot } from '@phosphor-icons/react/dist/csr/Robot';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { useFetchChatbots } from './hooks/useFetchChatbots'; // Import the custom hook
import { CreateChatbotDialog } from './components/create-chatbot-dialog'; // Import the dialog
import { EditChatbotDialog } from './components/edit-chatbot-dialog'; // Import Edit Dialog
import { DeleteConfirmationDialog } from './components/delete-confirmation-dialog'; // Import Delete Dialog
import { ChatbotCardSkeleton } from './components/chatbot-card-skeleton'; // Import Skeleton
import { ChatbotCards } from './components/chatbot-cards'; // Import the new ChatbotCards component
import { Chatbot } from '@/app/dashboard/libs/queries'; // Import Chatbot type

export default function DashboardOverviewPage() {
  const {
    data: chatbots = [], // Default to an empty array if data is undefined
    isLoading,
    isError,
    error,
  } = useFetchChatbots();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedChatbot, setSelectedChatbot] = useState<Chatbot | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); // Added search state

  // Filter chatbots based on search query
  const filteredChatbots = useMemo(() => {
    if (!searchQuery.trim()) {
      return chatbots;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return chatbots.filter((chatbot) => {
      const nameMatch = chatbot.name.toLowerCase().includes(query);
      const studentFacingNameMatch = chatbot.student_facing_name?.toLowerCase().includes(query);
      return nameMatch || studentFacingNameMatch;
    });
  }, [chatbots, searchQuery]);

  const handleCreateNewChatbotClick = () => {
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (chatbot: Chatbot) => {
    setSelectedChatbot(chatbot);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (chatbot: Chatbot) => {
    setSelectedChatbot(chatbot);
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-2 ">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Your Chatbots</h1>
          <div className="flex items-center gap-4">
            {!isLoading && !isError && chatbots.length > 0 && (
              <div className="relative w-72">
                <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" weight="bold" />
                <Input
                  type="text"
                  placeholder="Search chatbots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
            <RainbowButton onClick={handleCreateNewChatbotClick} size="lg">
              <PlusCircle className="mr-2 h-5 w-5" weight="bold" /> Create New Chatbot
            </RainbowButton>
          </div>
        </div>

        {/* Search Results Text */}
        {!isLoading && !isError && chatbots.length > 0 && searchQuery.trim() && (
          <div className="mb-6 -mt-4">
            <p className="text-sm text-muted-foreground">
              Found {filteredChatbots.length} chatbot{filteredChatbots.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </p>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <ChatbotCardSkeleton key={index} />
            ))}
          </div>
        )}
        {isError && <p className="text-red-500 text-center py-10">Error: {error?.message || "An unexpected error occurred."}</p>}
        
        {!isLoading && !isError && chatbots.length === 0 && (
          <div className="text-center py-20"> {/* Increased padding */}
            <Robot size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-6" weight="thin" />
            <h2 className="text-2xl font-semibold text-muted-foreground mb-3">No Chatbots Yet</h2>
            <p className="text-muted-foreground mb-6">Get started by creating your first intelligent assistant.</p>
            <RainbowButton onClick={handleCreateNewChatbotClick} size="lg">
              <PlusCircle className="mr-2 h-5 w-5" weight="bold" /> Create Your First Chatbot
            </RainbowButton>
          </div>
        )}

        {!isLoading && !isError && chatbots.length > 0 && filteredChatbots.length === 0 && searchQuery.trim() && (
          <div className="text-center py-20">
            <MagnifyingGlass size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-6" weight="thin" />
            <h2 className="text-2xl font-semibold text-muted-foreground mb-3">No Results Found</h2>
            <p className="text-muted-foreground mb-6">No chatbots match your search "{searchQuery}"</p>
            <Button 
              onClick={() => setSearchQuery('')} 
              variant="outline"
            >
              Clear Search
            </Button>
          </div>
        )}

        {!isLoading && !isError && filteredChatbots.length > 0 && (
          <ChatbotCards 
            chatbots={filteredChatbots}
            onEditChatbot={openEditDialog}
            onDeleteChatbot={openDeleteDialog}
          />
        )}
      </div>
      <CreateChatbotDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
        onSuccess={() => {
          console.log("Chatbot created successfully, list will refetch.");
        }}
      />
      <EditChatbotDialog 
        chatbot={selectedChatbot} 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen} 
      />
      <DeleteConfirmationDialog 
        chatbot={selectedChatbot} 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen} 
      />
    </>
  );
}

