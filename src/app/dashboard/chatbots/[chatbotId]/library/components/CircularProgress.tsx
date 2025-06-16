"use client";

import React from 'react';
import { CheckCircle2 as CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number;
  isComplete?: boolean;
  className?: string;
  showPercentage?: boolean;
}

export default function CircularProgress({
  progress,
  size = 32,
  strokeWidth = 3,
  isComplete = false,
  className,
  showPercentage = true
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (progress / 100) * circumference;

  if (isComplete) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <CheckIcon 
          className="text-green-500" 
          size={size} 
        />
      </div>
    );
  }

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          className="text-green-500 transition-all duration-300 ease-in-out"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: progressOffset,
          }}
        />
      </svg>
      {/* Percentage text in center */}
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8px] font-medium text-gray-700 dark:text-gray-300">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
} 