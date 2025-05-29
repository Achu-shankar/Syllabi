import React from 'react';
import { motion } from 'framer-motion';
import { LoaderIcon } from 'lucide-react'; // Or another suitable icon

interface StatusIndicatorProps {
  text: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ text }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-start gap-2 my-2 ml-11" // Align with assistant messages
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
         <LoaderIcon size={16} className="text-gray-500 dark:text-gray-300 animate-spin" />
      </div>
      <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 text-sm italic">
        {text}
      </div>
    </motion.div>
  );
};

export default StatusIndicator;
