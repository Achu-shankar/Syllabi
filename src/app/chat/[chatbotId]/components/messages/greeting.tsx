import { motion } from 'framer-motion';
import { useChatConfig, useChatbotDisplayName } from '../../../contexts/ChatbotContext';
import { useChatThemeVars } from '../ThemeApplicator';

export const Greeting = () => {
  const { chatbot } = useChatConfig();
  const displayName = useChatbotDisplayName();
  const themeVars = useChatThemeVars();

  return (
    <div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20 px-8 size-full flex flex-col items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="text-4xl font-semibold"
      >
        <span 
          className="text-4xl font-bold font-display bg-gradient-to-r bg-clip-text text-transparent"
          style={{
            backgroundImage: `linear-gradient(to right, ${themeVars.primaryColor}, ${themeVars.primaryColor}cc)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
          }}
        >
          {chatbot?.welcome_message || `Hello there!`}
        </span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
        className="text-3xl"
        style={{ color: 'var(--chat-bubble-bot-text-color, #6b7280)' }}
      >
        Welcome to {displayName}!
      </motion.div>
    </div>
  );
};
