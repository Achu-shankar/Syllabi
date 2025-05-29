"use client"; // If we plan to have client-side interactions like fetching data, forms etc.

import React, { useState } from 'react'; // Added useState for dialog
import Link from 'next/link'; // Added for future navigation
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Bot, BookOpen, MessageSquare, Feather, Brain, Zap, Settings2, Palette, Edit3, Trash2, FileText } from 'lucide-react'; // Added more icons
import { useFetchChatbots } from './hooks/useFetchChatbots'; // Import the custom hook
import { CreateChatbotDialog } from './components/create-chatbot-dialog'; // Import the dialog
import { EditChatbotDialog } from './components/edit-chatbot-dialog'; // Import Edit Dialog
import { DeleteConfirmationDialog } from './components/delete-confirmation-dialog'; // Import Delete Dialog
import { ChatbotCardSkeleton } from './components/chatbot-card-skeleton'; // Import Skeleton
import { Chatbot } from '@/app/dashboard/libs/queries'; // Import Chatbot type
import randomColor from 'randomcolor'; // Import randomcolor
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- Helper Functions for Unique Card Styles ---
const iconList = [Bot, BookOpen, MessageSquare, Feather, Brain, Zap, Settings2, Palette, FileText];

const getDeterministicIndex = (id: string, arrayLength: number): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % arrayLength;
};

const getDeterministicGradient = (id: string): string => {
  const color1 = randomColor({
    seed: id,
    luminosity: 'light',
    format: 'hex'
  });

  // Attempt to get a more distinct second color
  // We can try a different luminosity or use a different seed component for the hue
  const color2SeedBase = id + "-pair";
  let color2 = randomColor({
    seed: color2SeedBase,
    luminosity: 'bright', // Try 'bright' for more vibrancy for the second color
    // To make it more different, we can try to pick a hue that's somewhat offset.
    // One simple way: generate a random hue with a different seed.
    hue: randomColor({ seed: id + "-hue-offset", luminosity: 'random', format: 'hex' }), 
    format: 'hex'
  });

  // Basic check to avoid identical colors if the above still results in one
  let attempts = 0;
  while (color1 === color2 && attempts < 5) {
    color2 = randomColor({
      seed: color2SeedBase + `-${attempts}`,
      luminosity: 'bright',
      hue: randomColor({ seed: id + `-hue-offset-${attempts}`, luminosity: 'random', format: 'hex' }),
      format: 'hex'
    });
    attempts++;
  }
  // If still same after attempts, it's a rare case, but we proceed.

  return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
};

const GetDeterministicIcon = ({ id }: { id: string }) => {
  const IconComponent = iconList[getDeterministicIndex(id, iconList.length)];
  return <IconComponent className="h-8 w-8 text-gray-700 dark:text-gray-300" />;
};
// --- End Helper Functions ---

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
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex justify-between items-center mb-8"> {/* Increased margin */}
          <h1 className="text-3xl font-bold">Your Chatbots</h1> {/* Bolder title */}
          <Button onClick={handleCreateNewChatbotClick} size="lg"> {/* Larger button */}
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Chatbot
          </Button>
        </div>

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
            <Bot size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-6" />
            <h2 className="text-2xl font-semibold text-muted-foreground mb-3">No Chatbots Yet</h2>
            <p className="text-muted-foreground mb-6">Get started by creating your first intelligent assistant.</p>
            <Button onClick={handleCreateNewChatbotClick} size="lg" variant="default"> {/* Changed to default variant */}
              <PlusCircle className="mr-2 h-5 w-5" /> Create Your First Chatbot
            </Button>
          </div>
        )}

        {!isLoading && !isError && chatbots.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {chatbots.map((chatbot) => (
              <div 
                key={chatbot.id} 
                className="relative group bg-card rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col max-w-xs"
                // style={{ backgroundImage: getDeterministicGradient(chatbot.id) }} // Apply gradient here if text contrast is managed
              >
                <div 
                  className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ backgroundImage: getDeterministicGradient(chatbot.id) }}
                ></div>

                <div className="relative z-10 p-5 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-2 bg-white/30 dark:bg-black/20 backdrop-blur-sm rounded-lg">
                        <GetDeterministicIcon id={chatbot.id} />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-black/10 h-8 w-8">
                            <MoreHorizontal className="h-5 w-5" />
                            <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openEditDialog(chatbot)}>
                          <Edit3 className="mr-2 h-4 w-4" />
                          Rename / Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openDeleteDialog(chatbot)} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Link href={`/dashboard/chatbots/${chatbot.id}/library`} passHref legacyBehavior className="flex flex-col flex-grow">
                    <a className="block cursor-pointer flex flex-col flex-grow">
                      <h2 
                        className="text-xl font-semibold mb-1 truncate text-gray-800 dark:text-white group-hover:text-primary transition-colors"
                        title={chatbot.name}
                      >
                        {chatbot.name}
                      </h2>
                      {chatbot.student_facing_name && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 truncate" title={chatbot.student_facing_name}>
                          Public: {chatbot.student_facing_name}
                        </p>
                      )}
                      <div className="flex-grow"></div> {/* Spacer to push date to bottom */} 
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-auto">
                        Created: {new Date(chatbot.created_at).toLocaleDateString()}
                      </p>
                    </a>
                  </Link>
                  {/* Manage button can be part of the clickable card area or removed if card itself is the link */}
                   {/* <Button variant="outline" className="w-full mt-4 bg-white/50 dark:bg-black/30 backdrop-blur-sm border-gray-400/50 hover:bg-white/70 dark:hover:bg-black/50 text-gray-700 dark:text-gray-200" asChild>
                     <Link href={`/dashboard/chatbots/${chatbot.id}/library`}>Manage Chatbot</Link>
                  </Button> */}
                </div>
              </div>
            ))}
          </div>
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

