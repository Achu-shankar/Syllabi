'use client';

import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, MessageSquare, MoreHorizontal } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFetchSessionList, useDeleteSession, useRenameSession } from '../../lib/hooks';
import type { ChatSession } from '../../lib/db/queries';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type GroupedChats = {
  today: ChatSession[];
  yesterday: ChatSession[];
  lastWeek: ChatSession[];
  lastMonth: ChatSession[];
  older: ChatSession[];
};

const groupChatsByDate = (chats: ChatSession[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.updated_at);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats,
  );
};

interface SidebarHistoryProps {
  user: any;
  sidebarState: string;
}

interface ChatItemGroupProps {
  chats: ChatSession[];
  activeChatId: string | undefined;
  chatbotSlug: string;
  editingChatId: string | null;
  editingChatName: string;
  hoveredChatId: string | null;
  onStartRename: (chatId: string, title: string) => void;
  onSubmitRename: () => void;
  onEditNameChange: (newName: string) => void;
  onCancelRename: () => void;
  onDelete: (chatId: string) => void;
  onMouseEnterItem: (chatId: string) => void;
  onMouseLeaveItem: () => void;
  router: AppRouterInstance;
}

function ChatItemGroup({
  chats,
  activeChatId,
  chatbotSlug,
  editingChatId,
  editingChatName,
  hoveredChatId,
  onStartRename,
  onSubmitRename,
  onEditNameChange,
  onCancelRename,
  onDelete,
  onMouseEnterItem,
  onMouseLeaveItem,
  router,
}: ChatItemGroupProps) {
  return (
    <SidebarMenu>
      {chats.map((chat) => (
        <SidebarMenuItem 
          key={chat.id} 
          onMouseEnter={() => onMouseEnterItem(chat.id)}
          onMouseLeave={onMouseLeaveItem}
        >
          {editingChatId === chat.id ? (
            <div className="px-2 py-1 flex gap-2">
              <Input
                value={editingChatName}
                onChange={(e) => onEditNameChange(e.target.value)}
                onBlur={onSubmitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSubmitRename();
                  if (e.key === 'Escape') onCancelRename();
                }}
                className="h-8"
                autoFocus
              />
              <Button size="sm" onClick={onSubmitRename}>Save</Button>
            </div>
          ) : (
            <SidebarMenuButton
              tooltip={chat.name || "New Chat"}
              className={chat.id === activeChatId ? 'bg-accent text-accent-foreground' : ''}
              onClick={() => router.push(`/chat/${chatbotSlug}/${chat.id}`)}
            >
              <div className="flex flex-col overflow-hidden w-full">
                <span className="truncate">{chat.name || "New Chat"}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button 
                    asChild={true}
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 ml-auto ${hoveredChatId === chat.id ? 'visible' : 'invisible'}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onStartRename(chat.id, chat.name);
                  }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    <span>Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onDelete(chat.id);
                  }} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function SidebarHistory({ user, sidebarState }: SidebarHistoryProps) {
  const params = useParams();
  const chatbotSlug = params.chatbotId as string;
  const activeChatId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatName, setEditingChatName] = useState('');
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);

  // Use the hooks for session list and mutations
  const { sessions, isLoading, error } = useFetchSessionList(user?.id || '', chatbotSlug);
  const deleteSessionMutation = useDeleteSession();
  const renameSessionMutation = useRenameSession();

  const isCollapsed = sidebarState === "collapsed";

  const handleDeleteClick = (chatId: string) => {
    setDeleteId(chatId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    
    deleteSessionMutation.mutate({ sessionId: deleteId, chatbotSlug }, {
      onSuccess: () => {
        toast.success("Chat deleted successfully");
        if (deleteId === activeChatId) {
          router.push(`/chat/${chatbotSlug}`);
        }
        setDeleteId(null); // Clear deleteId after successful deletion
        setShowDeleteDialog(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete chat");
        setDeleteId(null); // Also clear deleteId on error
        setShowDeleteDialog(false);
      }
    });
  };

  const handleStartRename = (chatId: string, title: string) => {
    setEditingChatId(chatId);
    setEditingChatName(title || 'New Chat');
  };

  const handleCancelRename = () => {
    setEditingChatId(null);
    setEditingChatName(''); // Clear name on cancel
  };

  const handleSubmitRename = async () => {
    if (!editingChatId || !editingChatName.trim()) {
      handleCancelRename(); // Use cancel logic if name is empty
      return;
    }
    
    renameSessionMutation.mutate(
      { sessionId: editingChatId, name: editingChatName, chatbotSlug },
      {
        onSuccess: () => {
          toast.success("Chat renamed successfully");
          handleCancelRename(); // Use cancel logic on success
        },
        onError: (error) => {
          toast.error(error.message || "Failed to rename chat");
          // Keep editing state on error? Or cancel? Let's cancel for now.
          handleCancelRename(); 
        }
      }
    );
  };

  const handleMouseEnterItem = (chatId: string) => {
    setHoveredChatId(chatId);
  };

  const handleMouseLeaveItem = () => {
    setHoveredChatId(null);
  };

  if (!user) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          {!isCollapsed && (
            <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
              Login to save and revisit previous chats!
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    if (isCollapsed) return null;
    
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Today</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                key={item}
                className="rounded-md h-8 flex gap-2 px-2 items-center"
              >
                <div
                  className="h-4 rounded-md flex-1 max-w-[--skeleton-width] bg-sidebar-accent-foreground/10"
                  style={
                    {
                      '--skeleton-width': `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (sessions.length === 0) {
    if (isCollapsed) return null;
    
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Your conversations will appear here once you start chatting!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  // Sort sessions by updated_at descending before grouping
  sessions.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const groupedChats = groupChatsByDate(sessions);

  const chatItemGroupProps = {
    activeChatId,
    editingChatId,
    editingChatName,
    hoveredChatId,
    onStartRename: handleStartRename,
    onSubmitRename: handleSubmitRename,
    onEditNameChange: setEditingChatName,
    onCancelRename: handleCancelRename,
    onDelete: handleDeleteClick,
    onMouseEnterItem: handleMouseEnterItem,
    onMouseLeaveItem: handleMouseLeaveItem,
    router,
  };

  return (
    <>
      {groupedChats.today.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Today</SidebarGroupLabel>
          <ChatItemGroup chats={groupedChats.today} chatbotSlug={chatbotSlug} {...chatItemGroupProps} />
        </SidebarGroup>
      )}

      {groupedChats.yesterday.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Yesterday</SidebarGroupLabel>
          <ChatItemGroup chats={groupedChats.yesterday} chatbotSlug={chatbotSlug} {...chatItemGroupProps} />
        </SidebarGroup>
      )}

      {groupedChats.lastWeek.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Last 7 days</SidebarGroupLabel>
          <ChatItemGroup chats={groupedChats.lastWeek} chatbotSlug={chatbotSlug} {...chatItemGroupProps} />
        </SidebarGroup>
      )}

      {groupedChats.lastMonth.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Last 30 days</SidebarGroupLabel>
           <ChatItemGroup chats={groupedChats.lastMonth} chatbotSlug={chatbotSlug} {...chatItemGroupProps} />
        </SidebarGroup>
      )}

      {groupedChats.older.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Older than last month</SidebarGroupLabel>
           <ChatItemGroup chats={groupedChats.older} chatbotSlug={chatbotSlug} {...chatItemGroupProps} />
        </SidebarGroup>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel> {/* Clear deleteId on cancel */}
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={deleteSessionMutation.isPending}
            >
              {deleteSessionMutation.isPending ? "Deleting..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
