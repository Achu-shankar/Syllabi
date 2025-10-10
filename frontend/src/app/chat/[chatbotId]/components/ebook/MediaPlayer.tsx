'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { ContentSource } from '../../lib/db/content_queries';
import { useParams } from 'next/navigation';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

// Import Video.js plugins for quality control and seek buttons
import 'videojs-contrib-quality-levels';
import 'videojs-http-source-selector';
import 'videojs-seek-buttons';

// Extend Video.js player type to include plugins
declare module 'video.js' {
  interface VideoJsPlayer {
    httpSourceSelector?: () => void;
    seekButtons?: (options?: any) => void;
  }
}

interface MediaPlayerProps {
  document: ContentSource;
  timestamp?: number | null;
  onTimeUpdate?: (currentTime: number) => void;
}

// Video.js component wrapper
const VideoJSPlayer: React.FC<{
  options: any;
  onReady?: (player: any) => void;
}> = ({ options, onReady }) => {
  const placeholderRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Memoize the onReady callback to prevent unnecessary re-renders
  const stableOnReady = useCallback((player: any) => {
    onReady?.(player);
  }, [onReady]);

  useEffect(() => {
    // Only initialize if we don't have a player and we have a valid placeholder
    if (!playerRef.current && placeholderRef.current && options.sources.length > 0) {
      const placeholderEl = placeholderRef.current;
      
      // Clear any existing content
      placeholderEl.innerHTML = '';
      
      const videoElement = placeholderEl.appendChild(
        document.createElement('video-js')
      );

      const player = videojs(videoElement, options, () => {
        console.log('Video.js player is ready');
        stableOnReady(player);
      });

      playerRef.current = player;

      // Enable quality selector plugin if available
      if (typeof player.httpSourceSelector === 'function') {
        player.httpSourceSelector();
      }

      // Enable seek buttons plugin if available
      if (typeof player.seekButtons === 'function') {
        player.seekButtons({
          forward: 10,
          back: 10
        });
      }

      // Add keyboard shortcuts similar to YouTube
      const handleKeyDown = (e: KeyboardEvent) => {
        // Only handle shortcuts when the player is focused or when no input is focused
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' || 
          (activeElement as HTMLElement).contentEditable === 'true'
        );

        if (isInputFocused) return;

        switch (e.key) {
          case ' ':
          case 'k':
          case 'K':
            e.preventDefault();
            if (player.paused()) {
              player.play();
            } else {
              player.pause();
            }
            break;
          case 'ArrowLeft':
            e.preventDefault();
            player.currentTime(Math.max(0, player.currentTime() - 10));
            break;
          case 'ArrowRight':
            e.preventDefault();
            player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
            break;
          case 'ArrowUp':
            e.preventDefault();
            player.volume(Math.min(1, player.volume() + 0.1));
            break;
          case 'ArrowDown':
            e.preventDefault();
            player.volume(Math.max(0, player.volume() - 0.1));
            break;
          case 'j':
          case 'J':
            e.preventDefault();
            player.currentTime(Math.max(0, player.currentTime() - 10));
            break;
          case 'l':
          case 'L':
            e.preventDefault();
            player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
            break;
          case 'm':
          case 'M':
            e.preventDefault();
            player.muted(!player.muted());
            break;
          case 'f':
          case 'F':
            e.preventDefault();
            if (player.isFullscreen()) {
              player.exitFullscreen();
            } else {
              player.requestFullscreen();
            }
            break;
          case '0':
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
            e.preventDefault();
            const percentage = parseInt(e.key) / 10;
            player.currentTime(player.duration() * percentage);
            break;
        }
      };

      // Add event listener for keyboard shortcuts
      document.addEventListener('keydown', handleKeyDown);

      // Store the cleanup function
      (player as any).keydownHandler = handleKeyDown;
    }
  }, [options.sources, stableOnReady]); // Only depend on sources, not the entire options object

  // Update player source when URL changes
  useEffect(() => {
    if (playerRef.current && options.sources.length > 0) {
      const player = playerRef.current;
      const currentSrc = player.currentSrc();
      const newSrc = options.sources[0].src;
      
      // Only update if the source actually changed
      if (currentSrc !== newSrc) {
        player.src(options.sources);
      }
    }
  }, [options.sources]);

  // Dispose the Video.js player when the component unmounts
  useEffect(() => {
    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        // Remove keyboard event listener
        if ((playerRef.current as any).keydownHandler) {
          document.removeEventListener('keydown', (playerRef.current as any).keydownHandler);
        }
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return <div ref={placeholderRef} className="video-js-container" />;
};

const MediaPlayer: React.FC<MediaPlayerProps> = ({
  document,
  timestamp,
  onTimeUpdate
}) => {
  const params = useParams();
  const chatbotSlug = params.chatbotId as string;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  
  // Add player ref to access Video.js player instance
  const playerRef = useRef<any>(null);

  // Determine if this is video or audio based on file extension
  const isVideo = document.file_name?.toLowerCase().match(/\.(mp4|webm|ogg|mov|avi)$/);
  const isAudio = document.file_name?.toLowerCase().match(/\.(mp3|wav|ogg|m4a|aac)$/);

  // Fetch signed URL for media content
  useEffect(() => {
    const fetchMediaUrl = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/content-sources/${chatbotSlug}/${document.id}/view`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch media URL: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.url) {
          throw new Error('Invalid response from media URL API');
        }
        
        setMediaUrl(data.url);
        setIsLoading(false);
        
      } catch (err) {
        console.error('[MediaPlayer] Error fetching media URL:', err);
        setError(err instanceof Error ? err.message : 'Failed to load media');
        setIsLoading(false);
      }
    };

    if (document.id && chatbotSlug) {
      fetchMediaUrl();
    }
  }, [document.id, chatbotSlug, document.file_name, document.source_type]);

  // Handle timestamp navigation - this is the key addition
  useEffect(() => {
    console.log(`[MediaPlayer] Timestamp effect triggered - timestamp: ${timestamp}, playerRef.current: ${!!playerRef.current}`);
    
    if (playerRef.current && timestamp !== null && timestamp !== undefined && timestamp >= 0) {
      const player = playerRef.current;
      
      // Only seek if the player is ready and the timestamp is different from current time
      if (player.readyState() >= 1) { // HAVE_METADATA or higher
        const currentPlayerTime = player.currentTime();
        const timeDifference = Math.abs(currentPlayerTime - timestamp);
        
        console.log(`[MediaPlayer] Player ready - current: ${currentPlayerTime}s, target: ${timestamp}s, difference: ${timeDifference}s`);
        
        // Only seek if the difference is significant (more than 1 second) to avoid unnecessary seeks
        if (timeDifference > 1) {
          console.log(`[MediaPlayer] Seeking to timestamp: ${timestamp}s (current: ${currentPlayerTime}s)`);
          player.currentTime(timestamp);
        } else {
          console.log(`[MediaPlayer] Skipping seek - difference too small: ${timeDifference}s`);
        }
      } else {
        // If player is not ready yet, wait for it to be ready
        console.log(`[MediaPlayer] Player not ready (readyState: ${player.readyState()}), waiting for ready state`);
        player.ready(() => {
          console.log(`[MediaPlayer] Player ready, seeking to timestamp: ${timestamp}s`);
          player.currentTime(timestamp);
        });
      }
    } else if (timestamp !== null && timestamp !== undefined) {
      console.log(`[MediaPlayer] Cannot seek - playerRef.current: ${!!playerRef.current}, timestamp: ${timestamp}`);
    }
  }, [timestamp]); // Watch for timestamp changes

  // Cleanup player ref when document changes
  useEffect(() => {
    // Clear player ref when document changes to ensure we don't try to control old players
    playerRef.current = null;
  }, [document.id]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Memoize Video.js options to prevent unnecessary re-renders
  const videoJsOptions = useMemo(() => ({
    controls: true,
    responsive: true,
    fluid: true,
    preload: 'metadata',
    playbackRates: [0.5, 1, 1.25, 1.5, 2],
    sources: mediaUrl ? [
      {
        src: mediaUrl,
        type: isVideo ? 'video/mp4' : 'audio/mp3',
      },
    ] : [],
    plugins: {
      httpSourceSelector: {
        default: 'auto',
      },
    },
  }), [mediaUrl, isVideo]);

  // Memoize the player ready handler
  const handlePlayerReady = useCallback((player: any) => {
    // Store player reference for timestamp navigation
    playerRef.current = player;
    
    // Set up event listeners
    player.on('loadedmetadata', () => {
      setDuration(player.duration());
      
      // Seek to initial timestamp if provided and player is ready
      if (timestamp && timestamp > 0) {
        console.log(`[MediaPlayer] Initial seek to timestamp: ${timestamp}s`);
        player.currentTime(timestamp);
      }
    });

    player.on('timeupdate', () => {
      const time = player.currentTime();
      setCurrentTime(time);
      onTimeUpdate?.(time);
    });

    player.on('error', (e: any) => {
      console.error('Video.js error:', e);
      setError('Error playing media');
    });
  }, [timestamp, onTimeUpdate]);

  // Show error state
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-full max-w-4xl">
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">{document.file_name}</h3>
                <p className="text-sm text-white text-opacity-80">Media Error</p>
              </div>
            </div>
            
            <div className="bg-black bg-opacity-20 rounded-lg p-8 text-center">
              <div className="text-white mb-2">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-white font-medium mb-2">Failed to Load Media</p>
              <p className="text-white text-opacity-80 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading || !mediaUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-full max-w-4xl">
          <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">{document.file_name}</h3>
                <p className="text-sm text-white text-opacity-80">Loading Media...</p>
              </div>
            </div>
            
            <div className="bg-black bg-opacity-20 rounded-lg p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-opacity-30 border-t-white mx-auto mb-6"></div>
              <p className="text-white font-medium mb-2">Preparing Media Player</p>
              <p className="text-white text-opacity-80 text-sm">Please wait while we load your content...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render video player
  if (isVideo) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-full max-w-4xl">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">{document.file_name}</h3>
                <p className="text-sm text-white text-opacity-80">Video Content</p>
              </div>
            </div>
            
            <div className="bg-black rounded-lg overflow-hidden">
              <VideoJSPlayer
                options={videoJsOptions}
                onReady={handlePlayerReady}
              />
            </div>
            
            <div className="mt-4 flex items-center justify-between text-sm text-white text-opacity-80">
              <span>Current: {formatTime(currentTime)}</span>
              <span>Duration: {formatTime(duration)}</span>
            </div>
            {timestamp && (
              <div className="mt-2 text-sm text-white">
                Navigated to: {formatTime(timestamp)}
              </div>
            )}
            
            {/* Keyboard shortcuts info */}
            <div className="mt-3 text-xs text-white text-opacity-60">
              <p><strong>Keyboard shortcuts:</strong> Space/K = Play/Pause, ←/→ = Skip 10s, ↑/↓ = Volume, J/L = Skip, M = Mute, F = Fullscreen</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render audio player
  if (isAudio) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-full max-w-4xl">
          <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">{document.file_name}</h3>
                <p className="text-sm text-white text-opacity-80">Audio Content</p>
              </div>
            </div>
            
            <VideoJSPlayer
              options={videoJsOptions}
              onReady={handlePlayerReady}
            />
            
            <div className="mt-4 flex items-center justify-between text-sm text-white text-opacity-80">
              <span>Current: {formatTime(currentTime)}</span>
              <span>Duration: {formatTime(duration)}</span>
            </div>
            {timestamp && (
              <div className="mt-2 text-sm text-white">
                Navigated to: {formatTime(timestamp)}
              </div>
            )}
            
            {/* Keyboard shortcuts info */}
            <div className="mt-3 text-xs text-white text-opacity-60">
              <p><strong>Keyboard shortcuts:</strong> Space/K = Play/Pause, ←/→ = Skip 10s, ↑/↓ = Volume, J/L = Skip, M = Mute</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for unsupported media types
  return (
    <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </div>
        <p className="text-gray-600 font-medium">Unsupported Media Type</p>
        <p className="text-gray-500 text-sm">{document.file_name}</p>
      </div>
    </div>
  );
};

export default MediaPlayer; 