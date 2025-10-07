/**
 * Local storage helper for tracking read announcements
 * Uses localStorage to store which announcements a user has read
 */

const STORAGE_KEY = 'syllabi_read_announcements';

interface ReadAnnouncementsStore {
  [chatbotId: string]: string[]; // chatbotId -> array of announcement IDs
}

/**
 * Get all read announcements from localStorage
 */
function getReadAnnouncementsStore(): ReadAnnouncementsStore {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading announcements from localStorage:', error);
    return {};
  }
}

/**
 * Save read announcements to localStorage
 */
function saveReadAnnouncementsStore(store: ReadAnnouncementsStore): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('Error saving announcements to localStorage:', error);
  }
}

/**
 * Mark an announcement as read
 */
export function markAnnouncementAsRead(chatbotId: string, announcementId: string): void {
  const store = getReadAnnouncementsStore();

  if (!store[chatbotId]) {
    store[chatbotId] = [];
  }

  // Add announcement ID if not already present
  if (!store[chatbotId].includes(announcementId)) {
    store[chatbotId].push(announcementId);
    saveReadAnnouncementsStore(store);
  }
}

/**
 * Check if an announcement has been read
 */
export function isAnnouncementRead(chatbotId: string, announcementId: string): boolean {
  const store = getReadAnnouncementsStore();
  return store[chatbotId]?.includes(announcementId) || false;
}

/**
 * Get all read announcement IDs for a chatbot
 */
export function getReadAnnouncementIds(chatbotId: string): string[] {
  const store = getReadAnnouncementsStore();
  return store[chatbotId] || [];
}

/**
 * Clear read announcements for a specific chatbot
 */
export function clearReadAnnouncements(chatbotId: string): void {
  const store = getReadAnnouncementsStore();
  delete store[chatbotId];
  saveReadAnnouncementsStore(store);
}

/**
 * Clear all read announcements (useful for logout)
 */
export function clearAllReadAnnouncements(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing announcements from localStorage:', error);
  }
}

/**
 * Get count of unread announcements
 */
export function getUnreadCount(chatbotId: string, allAnnouncementIds: string[]): number {
  const readIds = getReadAnnouncementIds(chatbotId);
  return allAnnouncementIds.filter(id => !readIds.includes(id)).length;
}
