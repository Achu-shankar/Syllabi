export type BubblePosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type BubbleSize = 'small' | 'medium' | 'large';
export type BubbleStyle = 'circular' | 'rounded' | 'square';
export type ChatDisplayMode = 'modal' | 'popover';
export type ChatSessionMode = 'stateless' | 'persistent';

export interface BubbleColors {
  backgroundColor: string;
  textColor: string;
  hoverBackgroundColor: string;
  modalBackgroundColor: string;
  modalOverlayColor: string;
}

export interface BubbleConfig {
  position: BubblePosition;
  size: BubbleSize;
  style: BubbleStyle;
  colors: BubbleColors;
  icon: string;
  tooltip: string;
  showTooltip: boolean;
  displayMode: ChatDisplayMode;
  modalWidth: string;
  modalHeight: string;
  zIndex: number;
  sessionMode: ChatSessionMode;
}

export interface BubbleTemplate {
  id: string;
  name: string;
  description: string;
  previewImage?: string;
  defaultConfig: Partial<BubbleConfig>;
  generateCode: (config: BubbleConfig, chatbotSlug: string, embeddedUrl: string) => string;
}

export const DEFAULT_BUBBLE_CONFIG: BubbleConfig = {
  position: 'bottom-right',
  size: 'medium',
  style: 'circular',
  colors: {
    backgroundColor: '#3b82f6',
    textColor: '#ffffff',
    hoverBackgroundColor: '#2563eb',
    modalBackgroundColor: '#ffffff',
    modalOverlayColor: 'rgba(0, 0, 0, 0.5)',
  },
  icon: '💬',
  tooltip: 'Chat with us!',
  showTooltip: true,
  displayMode: 'modal',
  modalWidth: '400px',
  modalHeight: '600px',
  zIndex: 1000,
  sessionMode: 'persistent', // Default to persistent for better UX
}; 