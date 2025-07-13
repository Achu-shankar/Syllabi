import { BubbleStyle } from './BubbleStyleSelector';
import { DEFAULT_BUBBLE_CONFIG } from '../types/chatBubble';

export const BUBBLE_STYLES: BubbleStyle[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Classic bubble, rounded',
    preview: '💬',
    tags: ['Smooth'],
    config: {
      ...DEFAULT_BUBBLE_CONFIG,
      style: 'rounded',
      colors: {
        ...DEFAULT_BUBBLE_CONFIG.colors,
        backgroundColor: '#6366f1',
        hoverBackgroundColor: '#4f46e5',
        textColor: '#ffffff',
      },
      icon: '💬',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean square bubble',
    preview: '◻️',
    tags: ['Backdrop'],
    config: {
      ...DEFAULT_BUBBLE_CONFIG,
      style: 'square',
      colors: {
        ...DEFAULT_BUBBLE_CONFIG.colors,
        backgroundColor: '#ffffff',
        hoverBackgroundColor: '#e5e7eb',
        textColor: '#111827',
      },
      icon: '◻️',
    },
  },
  {
    id: 'fab',
    name: 'Floating Action',
    description: 'Material FAB circle',
    preview: '🔵',
    tags: ['Material'],
    config: {
      ...DEFAULT_BUBBLE_CONFIG,
      style: 'circular',
      colors: {
        ...DEFAULT_BUBBLE_CONFIG.colors,
        backgroundColor: '#3b82f6',
        hoverBackgroundColor: '#2563eb',
        textColor: '#ffffff',
      },
      icon: '➕',
    },
  },
]; 