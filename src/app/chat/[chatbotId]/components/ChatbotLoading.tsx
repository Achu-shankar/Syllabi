'use client';

import { motion, AnimatePresence } from 'framer-motion';

export function ChatbotLoading() {
  // Animation variants for each of the four blobs.
  // Each blob has a unique animation path to create the chaotic, fluid motion.
  const blobVariants = {
    blob1: {
      x: [-30, 30, -30],
      y: [-10, -40, -10],
      scale: [1, 1.1, 1],
    },
    blob2: {
      x: [20, -20, 20],
      y: [15, -25, 15],
      scale: [1, 0.9, 1],
    },
    blob3: {
      x: [-25, 25, -25],
      y: [25, 0, 25],
      scale: [1.1, 1, 1.1],
    },
    blob4: {
      x: [0, -15, 0],
      y: [-30, 20, -30],
      scale: [0.9, 1.1, 0.9],
    },
  };

  // Common transition settings for all blobs.
  // This makes them loop infinitely with a smooth ease-in-out curve.
  const blobTransition = {
    duration: 4,
    ease: "easeInOut",
    repeat: Infinity,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      
      {/* The main container for the animation. 
        The 'filter' and 'url(#goo)' are the key to the "gooey" effect.
      */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        className="w-32 h-32 relative" 
        style={{ filter: 'url(#goo)' }}
      >
        <AnimatePresence>
          {/* Mapping over the variants to create the blobs */}
          {Object.entries(blobVariants).map(([key, value], index) => (
            <motion.div
              key={key}
              className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1, #8b5cf6, #a855f7, #c084fc, #e879f9, #f0abfc)',
                backgroundSize: '400% 400%',
              }}
              // Animate the gradient position for the flowing color effect
              animate={{
                x: value.x,
                y: value.y,
                scale: value.scale,
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              // Apply the looping transition. We add a delay to stagger the animations.
              transition={{
                ...blobTransition,
                delay: -index * 2, // Staggered delay
                backgroundPosition: { // Separate transition for the gradient
                   duration: 3,
                   ease: "easeInOut",
                   repeat: Infinity,
                }
              }}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* The SVG filter definition. It's hidden but applied via CSS.
        - feGaussianBlur: Blurs everything inside the filtered element.
        - feColorMatrix: Increases the contrast of the alpha channel, which sharpens
          the blurred edges and makes them "stick" together.
      */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
    </div>
  );
} 