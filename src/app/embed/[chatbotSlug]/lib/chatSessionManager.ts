import { generateUUID } from '@/app/chat/[chatbotId]/lib/utils';
import { type Message } from '@ai-sdk/react';

export interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  lastMessage?: string;
  messageCount: number;
}

const STORAGE_PREFIX = 'embedded_chat_sessions_';
const MAX_SESSIONS = 50; // Limit to prevent localStorage overflow

/**
 * Get storage key for a specific chatbot
 */
function getStorageKey(chatbotSlug: string): string {
  return `${STORAGE_PREFIX}${chatbotSlug}`;
}

/**
 * Get all chat sessions for a chatbot
 */
export function getChatSessions(chatbotSlug: string): ChatSession[] {
  try {
    const storageKey = getStorageKey(chatbotSlug);
    const sessionsJson = localStorage.getItem(storageKey);
    if (!sessionsJson) return [];
    
    const sessions: ChatSession[] = JSON.parse(sessionsJson);
    return sessions.sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  } catch (error) {
    console.error('Failed to get chat sessions:', error);
    return [];
  }
}

/**
 * Save chat sessions to localStorage
 */
function saveChatSessions(chatbotSlug: string, sessions: ChatSession[]): void {
  try {
    const storageKey = getStorageKey(chatbotSlug);
    
    // Limit the number of sessions to prevent localStorage overflow
    const limitedSessions = sessions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_SESSIONS);
    
    localStorage.setItem(storageKey, JSON.stringify(limitedSessions));
  } catch (error) {
    console.error('Failed to save chat sessions:', error);
  }
}

/**
 * Create a new chat session
 */
export function createNewChatSession(chatbotSlug: string): ChatSession {
  const now = new Date();
  const sessionId = generateUUID();
  
  const newSession: ChatSession = {
    id: sessionId,
    title: `Chat ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
    timestamp: now.getTime(),
    messageCount: 0
  };

  const existingSessions = getChatSessions(chatbotSlug);
  const updatedSessions = [newSession, ...existingSessions];
  saveChatSessions(chatbotSlug, updatedSessions);

  return newSession;
}

/**
 * Update an existing chat session (e.g., when new messages are added)
 */
export function updateChatSession(
  chatbotSlug: string, 
  sessionId: string, 
  lastMessage?: string,
  messageCount?: number
): void {
  const sessions = getChatSessions(chatbotSlug);
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  
  if (sessionIndex === -1) {
    // Session doesn't exist, create it
    const now = new Date();
    const newSession: ChatSession = {
      id: sessionId,
      title: `Chat ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
      timestamp: now.getTime(),
      lastMessage,
      messageCount: messageCount || 0
    };
    sessions.unshift(newSession);
  } else {
    // Update existing session
    sessions[sessionIndex] = {
      ...sessions[sessionIndex],
      timestamp: Date.now(), // Update to current time
      lastMessage: lastMessage || sessions[sessionIndex].lastMessage,
      messageCount: messageCount !== undefined ? messageCount : sessions[sessionIndex].messageCount
    };
    
    // Move to front (most recent)
    const [updatedSession] = sessions.splice(sessionIndex, 1);
    sessions.unshift(updatedSession);
  }
  
  saveChatSessions(chatbotSlug, sessions);
}

/**
 * Delete a chat session
 */
export function deleteChatSession(chatbotSlug: string, sessionId: string): void {
  const sessions = getChatSessions(chatbotSlug);
  const filteredSessions = sessions.filter(s => s.id !== sessionId);
  saveChatSessions(chatbotSlug, filteredSessions);
  
  // Also remove the actual session data
  const sessionStorageKey = `embedded_session_${chatbotSlug}_${sessionId}`;
  localStorage.removeItem(sessionStorageKey);
}

/**
 * Get the current active session ID for a chatbot
 */
export function getCurrentSessionId(chatbotSlug: string): string | null {
  try {
    const currentSessionKey = `embedded_current_session_${chatbotSlug}`;
    return localStorage.getItem(currentSessionKey);
  } catch (error) {
    console.error('Failed to get current session ID:', error);
    return null;
  }
}

/**
 * Set the current active session ID for a chatbot
 */
export function setCurrentSessionId(chatbotSlug: string, sessionId: string): void {
  try {
    const currentSessionKey = `embedded_current_session_${chatbotSlug}`;
    localStorage.setItem(currentSessionKey, sessionId);
  } catch (error) {
    console.error('Failed to set current session ID:', error);
  }
}

/**
 * Generate a better title from the first message
 */
export function generateChatTitle(firstMessage: string): string {
  // Take first 30 characters and add ellipsis if longer
  const title = firstMessage.length > 30 
    ? `${firstMessage.substring(0, 30)}...` 
    : firstMessage;
  
  return title || `Chat ${new Date().toLocaleDateString()}`;
} 