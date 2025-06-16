"use client";

import React from 'react';
import Image from 'next/image';
import { Paperclip, SendHorizonal, MessageSquareText } from 'lucide-react';
import { ThemeConfig, ThemeColors } from '@/app/dashboard/libs/queries';
import { predefinedThemes } from './themes';

interface ChatMessageProps {
  text: string;
  isUser: boolean;
  avatarUrl?: string | null;
  bubbleColor?: string;
  textColor?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  text, 
  isUser, 
  avatarUrl, 
  bubbleColor, 
  textColor, 
}) => {
  const alignment = isUser ? 'justify-end' : 'justify-start';
  const finalAvatarOrder = isUser ? 'order-2 ml-2' : 'order-1 mr-2'; 
  const finalBubbleOrder = isUser ? 'order-1' : 'order-2';

  return (
    <div className={`flex items-end w-full ${alignment} mb-3`}>
      {!isUser && avatarUrl && (
        <div className={`relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ${finalAvatarOrder}`}>
          <Image src={avatarUrl} alt={"AI Avatar"} layout="fill" objectFit="cover" />
        </div>
      )}
      <div 
        className={`max-w-[70%] p-2.5 rounded-lg shadow-sm ${finalBubbleOrder}`}
        style={{ 
          backgroundColor: bubbleColor,
          color: textColor
        }}
      >
        <p className="text-sm whitespace-pre-wrap">{text}</p>
      </div>
      {isUser && avatarUrl && (
        <div className={`relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ${finalAvatarOrder}`}>
          <Image src={avatarUrl} alt={"User Avatar"} layout="fill" objectFit="cover" />
        </div>
      )}
    </div>
  );
};

interface SuggestedQuestionChipProps {
  text: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
}

const SuggestedQuestionChip: React.FC<SuggestedQuestionChipProps> = ({ text, backgroundColor, textColor, borderColor }) => {
  return (
    <button
      type="button"
      className="px-3 py-2 text-xs font-medium border rounded-lg shadow-sm flex items-center group hover:shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1"
      style={{
        backgroundColor: backgroundColor || 'hsla(var(--card)) / 0.5',
        color: textColor || 'hsl(var(--foreground))',
        borderColor: borderColor || 'hsl(var(--border))',
      }}
    >
      {text}
    </button>
  );
};

export interface ChatPreviewProps {
  studentFacingName?: string | null;
  brandingLogoUrl?: string | null;
  theme?: ThemeConfig | null;
  welcomeMessage?: string | null;
  suggestedQuestions?: string[] | null;
  previewMode?: 'light' | 'dark';
}

const defaultThemeConfigFallback: ThemeConfig = predefinedThemes[0].config;

export const ChatPreview: React.FC<ChatPreviewProps> = ({
  studentFacingName,
  brandingLogoUrl,
  theme,
  welcomeMessage,
  suggestedQuestions,
  previewMode = 'light',
}) => {
  const activeThemeColors: ThemeColors = 
    theme && theme[previewMode] 
      ? theme[previewMode]! 
      : (previewMode === 'dark' ? defaultThemeConfigFallback.dark : defaultThemeConfigFallback.light);

  const effectiveFontFamily = theme?.fontFamily || defaultThemeConfigFallback.fontFamily;
  const aiAvatar = theme?.aiMessageAvatarUrl || defaultThemeConfigFallback.aiMessageAvatarUrl;
  const userAvatar = theme?.userMessageAvatarUrl || defaultThemeConfigFallback.userMessageAvatarUrl;

  const messages = [
    { 
      text: welcomeMessage || "Hello there! Welcome to this assistant! How can I help?", 
      isUser: false, 
      avatarUrl: aiAvatar
    },
    { 
      text: "What is the main topic?", 
      isUser: true, 
      avatarUrl: userAvatar
    },
    { 
      text: "This assistant is here to help you with your questions!", 
      isUser: false, 
      avatarUrl: aiAvatar
    },
  ];

  const displaySuggestedQuestions = suggestedQuestions && suggestedQuestions.length > 0 
    ? suggestedQuestions 
    : ["Quick Question 1", "Another Option", "Help Topic"];

  const getTextColorForBackground = (bgColor?: string): string => {
    if (!bgColor) return activeThemeColors.inputTextColor || '#000000';
    try {
      const color = bgColor.startsWith('#') ? bgColor : '#FFFFFF';
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000000' : '#FFFFFF';
    } catch (e) {
      return activeThemeColors.inputTextColor || '#000000';
    }
  };

  const botTextColor = activeThemeColors.bubbleBotTextColor || getTextColorForBackground(activeThemeColors.bubbleBotBackgroundColor);
  const userTextColor = activeThemeColors.bubbleUserTextColor || getTextColorForBackground(activeThemeColors.bubbleUserBackgroundColor);

  return (
    <div 
      className="h-full flex border border-border bg-card rounded-lg shadow-md overflow-hidden"
      style={{ fontFamily: effectiveFontFamily }}
    >
      <div 
        className="w-1/3 md:w-1/4 p-3 sm:p-4 flex flex-col items-start space-y-4 border-r border-border/60"
        style={{
          backgroundColor: activeThemeColors.sidebarBackgroundColor,
          color: activeThemeColors.sidebarTextColor
        }}
      >
        <div className="flex items-center space-x-2 w-full mb-2">
          {brandingLogoUrl ? (
            <div className="w-8 h-8 sm:w-10 sm:h-10 relative rounded-full overflow-hidden shadow-sm flex-shrink-0 bg-white/20">
              <Image src={brandingLogoUrl} alt={`${studentFacingName || 'Chatbot'} Logo`} layout="fill" objectFit="contain" />
            </div>
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted/40 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
              <MessageSquareText size={20} className="opacity-70" />
            </div>
          )}
          {studentFacingName && (
            <h2 className="text-sm sm:text-base font-semibold break-words line-clamp-2">{studentFacingName}</h2>
          )}
        </div>
        <div className="flex-grow"></div>
        <p className="text-xs opacity-70 text-center w-full">Preview Mode ({previewMode})</p>
      </div>

      <div 
        className="flex-grow flex flex-col"
        style={{ backgroundColor: activeThemeColors.chatWindowBackgroundColor }}
      >
        <div className="flex-grow p-3 sm:p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
          {messages.map((msg, index) => (
            <ChatMessage
              key={index}
              text={msg.text}
              isUser={msg.isUser}
              avatarUrl={msg.avatarUrl}
              bubbleColor={msg.isUser ? activeThemeColors.bubbleUserBackgroundColor : activeThemeColors.bubbleBotBackgroundColor}
              textColor={msg.isUser ? userTextColor : botTextColor}
            />
          ))}
        </div>

        {displaySuggestedQuestions.length > 0 && (
          <div className="px-3 sm:px-4 pt-2 pb-3 border-t border-border/60 bg-background/50">
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {displaySuggestedQuestions.slice(0, 3).map((sq, index) => (
                <SuggestedQuestionChip 
                  key={index} 
                  text={sq}
                  backgroundColor={activeThemeColors.suggestedQuestionChipBackgroundColor}
                  textColor={activeThemeColors.suggestedQuestionChipTextColor}
                  borderColor={activeThemeColors.suggestedQuestionChipBorderColor}
                />
              ))}
            </div>
          </div>
        )}

        <div 
          className="p-2 sm:p-3 border-t border-border/60 flex items-center space-x-2"
          style={{ backgroundColor: activeThemeColors.inputAreaBackgroundColor }}
        >
          <button className="p-1.5 sm:p-2 text-muted-foreground hover:text-primary transition-colors" disabled>
            <Paperclip size={18} />
          </button>
          <input
            type="text"
            placeholder="Send a message..."
            className="flex-grow text-xs sm:text-sm px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed placeholder-muted-foreground"
            style={{ 
              backgroundColor: activeThemeColors.inputBackgroundColor,
              color: activeThemeColors.inputTextColor 
            }}
            disabled
          />
          <button className="p-2 sm:px-3 sm:py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            style={{ backgroundColor: activeThemeColors.primaryColor }}
            disabled
          >
            <SendHorizonal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}; 