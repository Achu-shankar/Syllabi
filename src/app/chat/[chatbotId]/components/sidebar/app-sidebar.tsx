'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { PlusIcon, MessageSquareText, AlertCircle, Bell, MessageSquare, Star } from 'lucide-react';
import { SidebarHistory } from './sidebar-history';
import { SidebarUserNav } from './sidebar-user-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatConfig, useChatbotDisplayName } from '../../../contexts/ChatbotContext';
import { useChatThemeVars } from '../ThemeApplicator';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  markAnnouncementAsRead,
  isAnnouncementRead,
  getUnreadCount,
} from '@/utils/announcements/localStorage';

interface Announcement {
  id: string;
  title: string;
  content: string;
  published_at: string;
  created_at: string;
}

export function AppSidebar() {
  const router = useRouter();
  const { state, toggleSidebar } = useSidebar();
  const params = useParams();
  const chatbotSlug = params.chatbotId as string;
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Get chatbot configuration and theme vars
  const { chatbot, isLoading, error } = useChatConfig();
  const displayName = useChatbotDisplayName();
  const themeVars = useChatThemeVars();

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Feedback state
  const [feedbackType, setFeedbackType] = useState('');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!chatbotSlug) return;

      setAnnouncementsLoading(true);
      try {
        const response = await fetch(`/api/chat/${chatbotSlug}/announcements`);
        if (response.ok) {
          const data = await response.json();
          setAnnouncements(data);

          // Calculate unread count
          const allIds = data.map((a: Announcement) => a.id);
          const unread = getUnreadCount(chatbotSlug, allIds);
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Failed to fetch announcements:', err);
      } finally {
        setAnnouncementsLoading(false);
      }
    };

    fetchAnnouncements();
  }, [chatbotSlug]);

  // Mark announcement as read when viewing
  const handleAnnouncementClick = (announcementId: string) => {
    if (!isAnnouncementRead(chatbotSlug, announcementId)) {
      markAnnouncementAsRead(chatbotSlug, announcementId);
      // Recalculate unread count
      const allIds = announcements.map(a => a.id);
      const unread = getUnreadCount(chatbotSlug, allIds);
      setUnreadCount(unread);
    }
  };

  // Handle feedback submission
  const handleSubmitFeedback = async () => {
    if (!feedbackType || !feedbackMessage.trim()) {
      toast.error('Please select a feedback type and enter a message');
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      // Get session ID from localStorage or generate one
      let sessionId = localStorage.getItem('chat_session_id');
      if (!sessionId) {
        sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('chat_session_id', sessionId);
      }

      const response = await fetch(`/api/chat/${chatbotSlug}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          feedback_type: feedbackType,
          subject: feedbackSubject || null,
          message: feedbackMessage,
          rating: feedbackRating,
          metadata: {
            userAgent: navigator.userAgent,
            url: window.location.href,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      toast.success('Thank you for your feedback!');
      setFeedbackOpen(false);

      // Reset form
      setFeedbackType('');
      setFeedbackSubject('');
      setFeedbackMessage('');
      setFeedbackRating(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const renderChatbotHeader = () => {
    if (isLoading) {
      return (
        <div className={`flex items-center py-2`}>
          <Skeleton className="w-6 h-6 rounded-full" />
          <div
            className={`transition-all duration-300 ease-in-out ${
              state === "collapsed"
                ? 'opacity-0 max-w-0 overflow-hidden'
                : 'opacity-100 max-w-full ml-2'
            }`}
          >
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={`flex items-center py-2`}>
          <div className="flex rounded-full items-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <span
            className={`text-xl font-bold whitespace-nowrap transition-all duration-300 ease-in-out text-destructive ${
              state === "collapsed"
                ? 'opacity-0 max-w-0 overflow-hidden'
                : 'opacity-100 max-w-full ml-2'
            }`}
          >
            Error
          </span>
        </div>
      );
    }

    return (
      <div className={`flex items-center py-2`}>
        <div className="flex rounded-full items-center">
          {chatbot?.logo_url ? (
            <div className="w-8 h-8 relative rounded-full overflow-hidden bg-white drop-shadow-md border border-gray-200">
              <Image 
                src={chatbot.logo_url} 
                alt={`${displayName} Logo`} 
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <MessageSquareText className="w-4 h-4 text-primary" />
            </div>
          )}
        </div>
        <span
          className="font-bold text-lg whitespace-nowrap transition-all duration-300 ease-in-out group-data-[collapsible=icon]:hidden ml-3"
        >
          {displayName}
        </span>
      </div>
    );
  };

  return (
    <Sidebar 
      collapsible="icon" 
      data-chat-sidebar="true"
      style={{
        '--sidebar-background': themeVars.sidebarBackgroundColor,
        '--sidebar': themeVars.sidebarBackgroundColor,
        '--sidebar-foreground': themeVars.sidebarTextColor,
        backgroundColor: themeVars.sidebarBackgroundColor,
        color: themeVars.sidebarTextColor,
      } as React.CSSProperties}
      className="border-none"
    >
      <SidebarHeader className="flex flex-row justify-between items-center pt-0 pr-1">
         {renderChatbotHeader()}
         <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      
      {/* <SidebarHeader className="pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="New Chat"
              onClick={() => {
                router.push(`/chat/${chatbotSlug}?newSession=${Date.now()}`);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/20"
            >
              <PlusIcon className="mr-1" />
              <span className="font-medium">New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader> */}
      <div className="px-2">
        <Separator style={{ backgroundColor: themeVars.sidebarTextColor, opacity: 0.05 }} />
      </div>
      
      <SidebarContent>
        <SidebarGroup>
        <SidebarGroupContent>        
          <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip="New Chat"
                  onClick={() => {
                    router.push(`/chat/${chatbotSlug}?newSession=${Date.now()}`);
                  }}
                  className="hover:opacity-80 transition-opacity"
                  style={{
                    color: themeVars.primaryColor,
                  }}
                >
                  <PlusIcon className="mr-1" />
                  <span className="font-medium">New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroupContent>
        </SidebarGroup>
        {/* <Separator className="px-2"/> */}
          <SidebarHistory />
        {/* <SidebarTrigger className="group-data-[collapsible=icon]:visible" /> */}
      </SidebarContent>
      
        <div className="px-2">
          <Separator style={{ backgroundColor: themeVars.sidebarTextColor, opacity: 0.05 }} />
        </div>
        
        <SidebarFooter className="text-xs text-center p-2 border-none space-y-1">
          {/* Announcement Section */}
          <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
            <DialogTrigger asChild>
              <SidebarMenuButton
                className="w-full justify-start text-muted-foreground hover:text-foreground transition-colors relative"
                onClick={() => setAnnouncementOpen(true)}
              >
                <Bell className="mr-2 h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Announcements</span>
                {unreadCount > 0 && (
                  <Badge
                    className="ml-auto group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:-right-1 group-data-[collapsible=icon]:-top-1 bg-red-500 text-white"
                    variant="default"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </SidebarMenuButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[600px] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Announcements
                </DialogTitle>
                <DialogDescription>
                  Stay updated with the latest news and updates.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {announcementsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No announcements yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((announcement, index) => {
                      const isRead = isAnnouncementRead(chatbotSlug, announcement.id);
                      const borderColors = ['border-blue-500', 'border-green-500', 'border-purple-500', 'border-orange-500', 'border-pink-500'];
                      const borderColor = borderColors[index % borderColors.length];

                      return (
                        <div
                          key={announcement.id}
                          className={`border-l-4 ${borderColor} pl-4 py-2 cursor-pointer hover:bg-muted/50 rounded transition-colors ${
                            !isRead ? 'bg-muted/30' : ''
                          }`}
                          onClick={() => handleAnnouncementClick(announcement.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm">{announcement.title}</h4>
                            {!isRead && (
                              <Badge variant="default" className="bg-blue-500 text-white text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {announcement.content}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(announcement.published_at), { addSuffix: true })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Feedback Section */}
          <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
            <DialogTrigger asChild>
              <SidebarMenuButton
                className="w-full justify-start text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setFeedbackOpen(true)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Feedback</span>
              </SidebarMenuButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Send Feedback
                </DialogTitle>
                <DialogDescription>
                  Help us improve by sharing your thoughts and suggestions.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="feedback-type" className="text-sm font-medium block mb-2">
                      Feedback Type *
                    </label>
                    <Select value={feedbackType} onValueChange={setFeedbackType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feedback type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="improvement">Improvement</SelectItem>
                        <SelectItem value="question">Question</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="feedback-subject" className="text-sm font-medium block mb-2">
                      Subject (Optional)
                    </label>
                    <Input
                      id="feedback-subject"
                      value={feedbackSubject}
                      onChange={(e) => setFeedbackSubject(e.target.value)}
                      placeholder="Brief subject line..."
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label htmlFor="feedback-rating" className="text-sm font-medium block mb-2">
                      Rating (Optional)
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFeedbackRating(rating)}
                          className="transition-all"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              feedbackRating && rating <= feedbackRating
                                ? 'fill-yellow-500 text-yellow-500'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                      {feedbackRating && (
                        <button
                          type="button"
                          onClick={() => setFeedbackRating(null)}
                          className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="feedback-message" className="text-sm font-medium block mb-2">
                      Message *
                    </label>
                    <Textarea
                      id="feedback-message"
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Tell us what's on your mind..."
                      rows={5}
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {feedbackMessage.length}/1000 characters
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1"
                      onClick={handleSubmitFeedback}
                      disabled={isSubmittingFeedback}
                    >
                      {isSubmittingFeedback ? 'Sending...' : 'Send Feedback'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setFeedbackOpen(false)}
                      disabled={isSubmittingFeedback}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <SidebarUserNav />  
      </SidebarFooter>
      
      <SidebarRail 
        style={{
          '--sidebar-border': themeVars.sidebarTextColor,
          opacity: 0.3,
        } as React.CSSProperties}
        className="hover:opacity-50 transition-opacity border-none focus:border-none"
      />
    </Sidebar>
  );
}
