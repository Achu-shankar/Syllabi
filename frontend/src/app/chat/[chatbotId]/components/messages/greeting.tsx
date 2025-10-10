import { motion } from 'framer-motion';
import { useChatConfig, useChatbotDisplayName } from '../../../contexts/ChatbotContext';
import { useChatThemeVars } from '../ThemeApplicator';
import { useState, useEffect } from 'react';

export const Greeting = () => {
  const { chatbot } = useChatConfig();
  const displayName = useChatbotDisplayName();
  const themeVars = useChatThemeVars();
  
  const welcomeText = `Hello! Welcome to ${displayName}`;
  const [displayedText, setDisplayedText] = useState("");
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  // Typing animation effect
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let currentIndex = 0;

    const typeText = () => {
      if (currentIndex < welcomeText.length) {
        setDisplayedText(welcomeText.slice(0, currentIndex + 1));
        currentIndex++;
        timeoutId = setTimeout(typeText, 60); // Faster, more AI-like typing
      } else {
        setIsTypingComplete(true);
      }
    };

    // Start typing after initial delay
    timeoutId = setTimeout(typeText, 300);

    return () => clearTimeout(timeoutId);
  }, [welcomeText]);

  return (
    <div className="text-center">
      {/* Main welcome message with typing effect */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent relative"
          style={{
          backgroundImage: `linear-gradient(to right, ${themeVars.primaryColor}, #f97316)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
          filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.3))',
        }}
      >
        {displayedText}
        {/* Blinking cursor - always visible */}
        <motion.span
          key={isTypingComplete ? 'slow-blink' : 'fast-blink'}
          className="inline-block ml-1 w-0.5 h-8"
          animate={{
            opacity: [1, 0, 1],
          }}
          transition={{
            duration: isTypingComplete ? 1.5 : 0.6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ 
            backgroundColor: '#f97316',
            filter: 'drop-shadow(0 0 4px rgba(249, 115, 22, 0.5))'
          }}
        />
      </motion.div>
    </div>
  );
};
