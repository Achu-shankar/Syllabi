import { BubbleTemplate, BubbleConfig, DEFAULT_BUBBLE_CONFIG } from '../types/chatBubble';

// Helper function to get size dimensions
const getSizeDimensions = (size: string) => {
  switch (size) {
    case 'small': return { width: '50px', height: '50px', fontSize: '20px' };
    case 'large': return { width: '70px', height: '70px', fontSize: '28px' };
    default: return { width: '60px', height: '60px', fontSize: '24px' }; // medium
  }
};

// Helper function to get position styles for bubble
const getPositionStyles = (position: string, size: string) => {
  const offset = '20px';
  
  switch (position) {
    case 'bottom-left':
      return `bottom: ${offset}; left: ${offset};`;
    case 'top-right':
      return `top: ${offset}; right: ${offset};`;
    case 'top-left':
      return `top: ${offset}; left: ${offset};`;
    default: // bottom-right
      return `bottom: ${offset}; right: ${offset};`;
  }
};

// Helper function to get popover position styles
const getPopoverPositionStyles = (position: string, modalWidth: string, modalHeight: string) => {
  const bubbleOffset = '20px';
  const popoverGap = '10px';
  
  switch (position) {
    case 'bottom-left':
      return `bottom: calc(${bubbleOffset} + 70px + ${popoverGap}); left: ${bubbleOffset};`;
    case 'top-right':
      return `top: calc(${bubbleOffset} + 70px + ${popoverGap}); right: ${bubbleOffset};`;
    case 'top-left':
      return `top: calc(${bubbleOffset} + 70px + ${popoverGap}); left: ${bubbleOffset};`;
    default: // bottom-right
      return `bottom: calc(${bubbleOffset} + 70px + ${popoverGap}); right: ${bubbleOffset};`;
  }
};

// Helper function to get border radius
const getBorderRadius = (style: string) => {
  switch (style) {
    case 'square': return '4px';
    case 'rounded': return '16px';
    default: return '50%'; // circular
  }
};

// Standard Chat Bubble Template
const standardBubbleTemplate: BubbleTemplate = {
  id: 'standard',
  name: 'Standard Bubble',
  description: 'Classic chat bubble with smooth animations',
  defaultConfig: {
    ...DEFAULT_BUBBLE_CONFIG,
  },
  generateCode: (config: BubbleConfig, chatbotSlug: string, embeddedUrl: string) => {
    const dimensions = getSizeDimensions(config.size);
    const positionStyles = getPositionStyles(config.position, config.size);
    const borderRadius = getBorderRadius(config.style);
    
    const chatContainerStyles = config.displayMode === 'modal' 
      ? `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: ${config.colors.modalOverlayColor};
        z-index: ${config.zIndex + 1};
        align-items: center;
        justify-content: center;
      `
      : `
        display: none;
        position: fixed;
        ${getPopoverPositionStyles(config.position, config.modalWidth, config.modalHeight)}
        width: ${config.modalWidth};
        height: ${config.modalHeight};
        max-width: 380px;
        max-height: 600px;
        z-index: ${config.zIndex + 1};
      `;

    const chatContentStyles = config.displayMode === 'modal'
      ? `
        width: ${config.modalWidth};
        height: ${config.modalHeight};
        max-width: 90vw;
        max-height: 90vh;
        background-color: ${config.colors.modalBackgroundColor};
        border-radius: 24px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        position: relative;
      `
      : `
        width: 100%;
        height: 100%;
        background-color: ${config.colors.modalBackgroundColor};
        border-radius: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        position: relative;
        border: 1px solid rgba(0, 0, 0, 0.1);
      `;

    return `<!-- Chat Bubble Widget -->
<div id="syllabi-chat-bubble-${chatbotSlug}" style="
  position: fixed;
  ${positionStyles}
  width: ${dimensions.width};
  height: ${dimensions.height};
  background-color: ${config.colors.backgroundColor};
  color: ${config.colors.textColor};
  border-radius: ${borderRadius};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${dimensions.fontSize};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  z-index: ${config.zIndex};
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
" 
onmouseover="this.style.backgroundColor='${config.colors.hoverBackgroundColor}'; this.style.transform='scale(1.1)';"
onmouseout="this.style.backgroundColor='${config.colors.backgroundColor}'; this.style.transform='scale(1)';"
onclick="
  const chatContainer = document.getElementById('syllabi-chat-container-${chatbotSlug}');
  if (chatContainer.style.display === 'none' || chatContainer.style.display === '') {
    chatContainer.style.display = '${config.displayMode === 'modal' ? 'flex' : 'block'}';
  } else {
    chatContainer.style.display = 'none';
  }
">
  ${config.icon}
  ${config.showTooltip ? `
  <div id="syllabi-tooltip-${chatbotSlug}" style="
    position: absolute;
    ${config.position.includes('right') ? 'right: 100%; margin-right: 10px;' : 'left: 100%; margin-left: 10px;'}
    top: 50%;
    transform: translateY(-50%);
    background-color: #333;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  ">${config.tooltip}</div>
  ` : ''}
</div>

<!-- Chat Container (Modal or Popover) -->
<div id="syllabi-chat-container-${chatbotSlug}" style="${chatContainerStyles}" ${config.displayMode === 'modal' ? `onclick="if(event.target === this) this.style.display='none';"` : ''}>
  <div style="${chatContentStyles}">
    <!-- Close Button - Positioned to avoid header conflicts -->
    <button onclick="document.getElementById('syllabi-chat-container-${chatbotSlug}').style.display='none';" style="
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(0, 0, 0, 0.1);
      font-size: 18px;
      cursor: pointer;
      color: #666;
      z-index: 20;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
      backdrop-filter: blur(4px);
    " onmouseover="this.style.backgroundColor='rgba(0, 0, 0, 0.1)'; this.style.color='#333';" onmouseout="this.style.backgroundColor='rgba(255, 255, 255, 0.9)'; this.style.color='#666';">
      ×
    </button>
    
    <!-- Chat Iframe -->
    <iframe 
      src="${embeddedUrl}?session=${config.sessionMode}&theme=light" 
      style="
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 24px;
        display: block;
        overflow: hidden;
      "
      allow="microphone; camera"
      onload="this.style.opacity='1';"
    ></iframe>
  </div>
</div>

${config.showTooltip ? `
<script>
  // Tooltip functionality
  const bubble = document.getElementById('syllabi-chat-bubble-${chatbotSlug}');
  const tooltip = document.getElementById('syllabi-tooltip-${chatbotSlug}');
  
  bubble.addEventListener('mouseenter', () => {
    tooltip.style.opacity = '1';
  });
  
  bubble.addEventListener('mouseleave', () => {
    tooltip.style.opacity = '0';
  });
</script>
` : ''}`;
  }
};

// Minimal Chat Bubble Template
const minimalBubbleTemplate: BubbleTemplate = {
  id: 'minimal',
  name: 'Minimal Bubble',
  description: 'Clean and simple design with subtle animations',
  defaultConfig: {
    ...DEFAULT_BUBBLE_CONFIG,
    colors: {
      backgroundColor: '#1f2937',
      textColor: '#ffffff',
      hoverBackgroundColor: '#374151',
      modalBackgroundColor: '#ffffff',
      modalOverlayColor: 'rgba(0, 0, 0, 0.3)',
    },
    style: 'rounded' as const,
  },
  generateCode: (config: BubbleConfig, chatbotSlug: string, embeddedUrl: string) => {
    const dimensions = getSizeDimensions(config.size);
    const positionStyles = getPositionStyles(config.position, config.size);
    
    const chatContainerStyles = config.displayMode === 'modal' 
      ? `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: ${config.colors.modalOverlayColor};
        z-index: ${config.zIndex + 1};
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
      `
      : `
        display: none;
        position: fixed;
        ${getPopoverPositionStyles(config.position, config.modalWidth, config.modalHeight)}
        width: ${config.modalWidth};
        height: ${config.modalHeight};
        max-width: 380px;
        max-height: 600px;
        z-index: ${config.zIndex + 1};
      `;

    const chatContentStyles = config.displayMode === 'modal'
      ? `
        width: ${config.modalWidth};
        height: ${config.modalHeight};
        max-width: 90vw;
        max-height: 90vh;
        background-color: ${config.colors.modalBackgroundColor};
        border-radius: 24px;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        position: relative;
        border: 1px solid rgba(255, 255, 255, 0.1);
      `
      : `
        width: 100%;
        height: 100%;
        background-color: ${config.colors.modalBackgroundColor};
        border-radius: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        position: relative;
        border: 1px solid rgba(0, 0, 0, 0.1);
      `;
    
    return `<!-- Minimal Chat Bubble Widget -->
<div id="syllabi-chat-bubble-${chatbotSlug}" style="
  position: fixed;
  ${positionStyles}
  width: ${dimensions.width};
  height: ${dimensions.height};
  background-color: ${config.colors.backgroundColor};
  color: ${config.colors.textColor};
  border-radius: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${dimensions.fontSize};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  z-index: ${config.zIndex};
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  border: 1px solid rgba(255, 255, 255, 0.1);
" 
onmouseover="this.style.backgroundColor='${config.colors.hoverBackgroundColor}'; this.style.boxShadow='0 4px 16px rgba(0, 0, 0, 0.2)';"
onmouseout="this.style.backgroundColor='${config.colors.backgroundColor}'; this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.1)';"
onclick="
  const chatContainer = document.getElementById('syllabi-chat-container-${chatbotSlug}');
  if (chatContainer.style.display === 'none' || chatContainer.style.display === '') {
    chatContainer.style.display = '${config.displayMode === 'modal' ? 'flex' : 'block'}';
  } else {
    chatContainer.style.display = 'none';
  }
">
  ${config.icon}
</div>

<!-- Chat Container (Modal or Popover) -->
<div id="syllabi-chat-container-${chatbotSlug}" style="${chatContainerStyles}" ${config.displayMode === 'modal' ? `onclick="if(event.target === this) this.style.display='none';"` : ''}>
  <div style="${chatContentStyles}">
    <!-- Close Button - Positioned to avoid header conflicts -->
    <button onclick="document.getElementById('syllabi-chat-container-${chatbotSlug}').style.display='none';" style="
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(0, 0, 0, 0.1);
      font-size: 18px;
      cursor: pointer;
      color: #666;
      z-index: 20;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: all 0.2s ease;
      backdrop-filter: blur(4px);
    " onmouseover="this.style.backgroundColor='rgba(0, 0, 0, 0.1)'; this.style.color='#333';" onmouseout="this.style.backgroundColor='rgba(255, 255, 255, 0.9)'; this.style.color='#666';">
      ×
    </button>
    
    <!-- Chat Iframe -->
    <iframe 
      src="${embeddedUrl}?session=${config.sessionMode}&theme=light" 
      style="
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 24px;
        display: block;
        overflow: hidden;
      "
      allow="microphone; camera"
      onload="this.style.opacity='1';"
    ></iframe>
  </div>
</div>`;
  }
};

// Floating Action Button Template
const fabBubbleTemplate: BubbleTemplate = {
  id: 'fab',
  name: 'Floating Action Button',
  description: 'Material Design inspired floating action button',
  defaultConfig: {
    ...DEFAULT_BUBBLE_CONFIG,
    colors: {
      backgroundColor: '#10b981',
      textColor: '#ffffff',
      hoverBackgroundColor: '#059669',
      modalBackgroundColor: '#ffffff',
      modalOverlayColor: 'rgba(0, 0, 0, 0.4)',
    },
    size: 'large' as const,
  },
  generateCode: (config: BubbleConfig, chatbotSlug: string, embeddedUrl: string) => {
    const dimensions = getSizeDimensions(config.size);
    const positionStyles = getPositionStyles(config.position, config.size);
    
    const chatContainerStyles = config.displayMode === 'modal' 
      ? `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: ${config.colors.modalOverlayColor};
        z-index: ${config.zIndex + 1};
        align-items: center;
        justify-content: center;
      `
      : `
        display: none;
        position: fixed;
        ${getPopoverPositionStyles(config.position, config.modalWidth, config.modalHeight)}
        width: ${config.modalWidth};
        height: ${config.modalHeight};
        max-width: 380px;
        max-height: 600px;
        z-index: ${config.zIndex + 1};
      `;

    const chatContentStyles = config.displayMode === 'modal'
      ? `
        width: ${config.modalWidth};
        height: ${config.modalHeight};
        max-width: 90vw;
        max-height: 90vh;
        background-color: ${config.colors.modalBackgroundColor};
        border-radius: 24px;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
        overflow: hidden;
        position: relative;
        animation: syllabi-modal-enter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      `
      : `
        width: 100%;
        height: 100%;
        background-color: ${config.colors.modalBackgroundColor};
        border-radius: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        position: relative;
        border: 1px solid rgba(0, 0, 0, 0.1);
        animation: syllabi-modal-enter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      `;
    
    return `<!-- FAB Chat Bubble Widget -->
<div id="syllabi-chat-bubble-${chatbotSlug}" style="
  position: fixed;
  ${positionStyles}
  width: ${dimensions.width};
  height: ${dimensions.height};
  background-color: ${config.colors.backgroundColor};
  color: ${config.colors.textColor};
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${dimensions.fontSize};
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: ${config.zIndex};
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
" 
onmouseover="this.style.backgroundColor='${config.colors.hoverBackgroundColor}'; this.style.transform='scale(1.1)'; this.style.boxShadow='0 8px 25px rgba(0, 0, 0, 0.2)';"
onmouseout="this.style.backgroundColor='${config.colors.backgroundColor}'; this.style.transform='scale(1)'; this.style.boxShadow='0 6px 20px rgba(0, 0, 0, 0.15)';"
onclick="
  const chatContainer = document.getElementById('syllabi-chat-container-${chatbotSlug}');
  if (chatContainer.style.display === 'none' || chatContainer.style.display === '') {
    chatContainer.style.display = '${config.displayMode === 'modal' ? 'flex' : 'block'}';
  } else {
    chatContainer.style.display = 'none';
  }
  this.style.transform='scale(0.95)'; 
  setTimeout(() => this.style.transform='scale(1)', 150);
">
  ${config.icon}
</div>

<!-- Chat Container (Modal or Popover) -->
<div id="syllabi-chat-container-${chatbotSlug}" style="${chatContainerStyles}" ${config.displayMode === 'modal' ? `onclick="if(event.target === this) this.style.display='none';"` : ''}>
  <div style="${chatContentStyles}">
    <!-- Close Button - Positioned to avoid header conflicts -->
    <button onclick="document.getElementById('syllabi-chat-container-${chatbotSlug}').style.display='none';" style="
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(0, 0, 0, 0.1);
      font-size: 18px;
      cursor: pointer;
      color: #666;
      z-index: 20;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
      backdrop-filter: blur(4px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    " onmouseover="this.style.backgroundColor='rgba(0, 0, 0, 0.1)'; this.style.color='#333'; this.style.transform='scale(1.05)';" onmouseout="this.style.backgroundColor='rgba(255, 255, 255, 0.9)'; this.style.color='#666'; this.style.transform='scale(1)';">
      ×
    </button>
    
    <!-- Chat Iframe -->
    <iframe 
      src="${embeddedUrl}?session=${config.sessionMode}&theme=light" 
      style="
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 24px;
      "
      allow="microphone; camera"
    ></iframe>
  </div>
</div>

<style>
@keyframes syllabi-modal-enter {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>`;
  }
};

// Export all templates
export const BUBBLE_TEMPLATES: BubbleTemplate[] = [
  standardBubbleTemplate,
  minimalBubbleTemplate,
  fabBubbleTemplate,
];

export const getBubbleTemplateById = (id: string): BubbleTemplate | undefined => {
  return BUBBLE_TEMPLATES.find(template => template.id === id);
}; 