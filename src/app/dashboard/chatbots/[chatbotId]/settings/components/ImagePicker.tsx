"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ImageIcon, UploadCloudIcon, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { PresetAvatar } from './avatarPresets';
import { toast } from 'sonner';

const MAX_FILE_SIZE_MB = 2;

interface ImagePickerProps {
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  presets?: PresetAvatar[];
  pickerId: string;
  compact?: boolean; 
}

export const ImagePicker: React.FC<ImagePickerProps> = (
  { label, value, onChange, presets = [], pickerId, compact = false }
) => {
  // NOTE: URL input functionality is temporarily disabled but preserved for future use
  // To re-enable URL input functionality, uncomment the sections marked with "URL_FEATURE"
  
  // URL_FEATURE: Comment out these state variables when URL input is disabled
  // const [urlInputValue, setUrlInputValue] = useState(value || '');
  const [isProcessing, setIsProcessing] = useState(false);
  // const [showUrlError, setShowUrlError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL_FEATURE: Comment out this useEffect when URL input is disabled
  // useEffect(() => {
  //   if (value !== urlInputValue) {
  //       setUrlInputValue(value || '');
  //       setShowUrlError(false); 
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [value]);

  // URL_FEATURE: Keep this function for future use - validates URL format
  // const validateUrl = (url: string) => {
  //   if (!url) return true;
  //   if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/') || url.startsWith('data:')){
  //       try {
  //           new URL(url, url.startsWith('/') ? 'http://dummybase.com' : undefined);
  //           return true;
  //       } catch (_) {
  //           return true; 
  //       }
  //   }
  //   return false;
  // };

  const handleRemoveImage = () => {
    onChange(null);
    // setUrlInputValue(''); // URL_FEATURE: Uncomment when re-enabling URL input
    // setShowUrlError(false); // URL_FEATURE: Uncomment when re-enabling URL input
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.info("Image removed.");
  };

  // URL_FEATURE: Keep this function for future use - handles URL application and import
  // const handleUrlApplyOrImport = async () => {
  //   const trimmedUrl = urlInputValue.trim();
  //   if (!trimmedUrl) {
  //     onChange(null); // If user clears input and hits apply, treat as removal
  //     setShowUrlError(false);
  //     return;
  //   }
  //   if (!validateUrl(trimmedUrl)) {
  //       setShowUrlError(true);
  //       toast.error("Invalid URL format.");
  //       return;
  //   }
  //   setShowUrlError(false);

  //   const isSupabaseUrl = trimmedUrl.includes('.supabase.co/');
  //   const isPreset = presets.some(p => p.url === trimmedUrl);
  //   const isDataUri = trimmedUrl.startsWith('data:');
  //   const isLikelyExternal = trimmedUrl.startsWith('http') && !isSupabaseUrl && !isPreset;

  //   if (isLikelyExternal && !isDataUri) {
  //     setIsProcessing(true);
  //     try {
  //       const response = await fetch('/api/dashboard/chatbots/import-image-from-url', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ externalUrl: trimmedUrl }),
  //       });
  //       const result = await response.json();
  //       if (!response.ok || !result.success) {
  //         toast.error(result.error || "Failed to import image from URL.");
  //         setIsProcessing(false);
  //         return;
  //       }
  //       onChange(result.url); 
  //       setUrlInputValue(result.url); 
  //       toast.success("Image imported successfully!");
  //     } catch (error) {
  //       toast.error("Error importing image from URL.");
  //     } finally {
  //       setIsProcessing(false);
  //     }
  //   } else {
  //     onChange(trimmedUrl);
  //     if(!isPreset && trimmedUrl) toast.success("Image URL applied.");
  //     else if (!trimmedUrl) toast.info("Image removed.");
  //   }
  // };

  const handlePresetSelect = (presetUrl: string) => {
    onChange(presetUrl);
    // setUrlInputValue(presetUrl); // URL_FEATURE: Uncomment when re-enabling URL input
    // setShowUrlError(false); // URL_FEATURE: Uncomment when re-enabling URL input
    const trigger = document.getElementById(`${pickerId}-preset-trigger`);
    if (trigger) trigger.blur();
    toast.success("Preset selected.");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`File is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }
    setIsProcessing(true); 
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/dashboard/chatbots/upload-asset', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.error || "File upload failed.");
        setIsProcessing(false); 
        return;
      }
      onChange(result.url);
      // setUrlInputValue(result.url); // URL_FEATURE: Uncomment when re-enabling URL input
      // setShowUrlError(false); // URL_FEATURE: Uncomment when re-enabling URL input
      toast.success("Image uploaded successfully!");
    } catch (error) {
      toast.error("Upload failed. Please check console.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const previewSizeClasses = compact ? "w-16 h-16" : "w-20 h-20";
  // const inputHeightClass = compact ? "h-8 text-xs" : "h-9 text-sm"; // URL_FEATURE: For URL input styling
  const buttonSizeClass = compact ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm"; 
  const presetButtonClasses = compact ? "h-7 px-2 text-xs py-0.5" : "h-8 px-2.5 text-sm py-1";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex items-center justify-between">
        <Label htmlFor={`${pickerId}-file-input`} className="text-sm font-medium">{label}</Label>
        <div className="flex items-center space-x-1">
          {value && (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={handleRemoveImage} 
              className="h-7 w-7 text-muted-foreground hover:text-destructive" 
              title="Remove image"
              disabled={isProcessing}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {presets && presets.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  id={`${pickerId}-preset-trigger`} 
                  variant="outline" 
                  size="sm" 
                  className={presetButtonClasses} 
                  disabled={isProcessing}
                >
                  <ImageIcon className="w-3 h-3 mr-1" /> Presets
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 max-h-72 overflow-y-auto shadow-lg" align="end">
                <p className="text-xs font-medium text-muted-foreground mb-3 px-1">Select a preset</p>
                <div className="grid grid-cols-3 gap-2">
                  {presets.map(preset => (
                    <button 
                      key={preset.id} 
                      type="button" 
                      onClick={() => handlePresetSelect(preset.url)} 
                      className="p-1 border rounded hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary bg-background hover:bg-muted aspect-square w-20 h-20 transition-all duration-150 ease-in-out"
                      title={preset.name}
                    >
                      <div className="w-full h-full relative overflow-hidden rounded-sm">
                        <Image 
                          src={preset.url} 
                          alt={preset.name} 
                          layout="fill" 
                          objectFit="contain" 
                          className="p-0.5"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
      
      <div className="flex items-start space-x-3">
        {/* Image Preview */}
        {value ? (
          <div className={`p-1 border border-border rounded bg-background aspect-square ${previewSizeClasses} relative overflow-hidden flex-shrink-0 shadow-sm`}>
            <Image 
              src={value} 
              alt={`${label} preview`} 
              layout="fill" 
              objectFit={value.endsWith('.svg') || value.startsWith('data:image/svg+xml') ? 'scale-down' : 'contain'} 
            />
          </div>
        ) : (
          <div className={`border border-dashed border-border/50 rounded bg-muted/30 aspect-square ${previewSizeClasses} relative flex-shrink-0 shadow-sm flex items-center justify-center`}>
            <ImageIcon className="w-1/2 h-1/2 text-muted-foreground/50" />
          </div>
        )}

        {/* Upload Actions */}
        <div className="flex-grow space-y-2">
          {/* URL_FEATURE: This section was the URL input - commented out but preserved for future use */}
          {/* 
          <div className="flex items-center space-x-1.5">
            <div className="relative flex-grow">
              <Input 
                id={`${pickerId}-url-input`}
                type="text" 
                placeholder="Enter URL or upload an image"
                value={urlInputValue}
                onChange={(e) => { 
                  const newUrl = e.target.value;
                  setUrlInputValue(newUrl);
                  if (validateUrl(newUrl)) setShowUrlError(false);
                }}
                onBlur={() => {
                  if (urlInputValue && !validateUrl(urlInputValue)) {
                    setShowUrlError(true);
                  }
                }}
                className={`${inputHeightClass} ${showUrlError && urlInputValue ? 'border-destructive focus-visible:ring-destructive' : 'border-border'} pr-7 bg-background text-foreground`}
                disabled={isProcessing}
              />
              {urlInputValue && !showUrlError && validateUrl(urlInputValue) && <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none"/>}
              {showUrlError && urlInputValue && <XCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive pointer-events-none"/>}
            </div>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleUrlApplyOrImport} 
              className={`${buttonSizeClass} flex-shrink-0`}
              disabled={isProcessing || urlInputValue === value || (!!urlInputValue && !validateUrl(urlInputValue))}
              title={
                urlInputValue === value 
                  ? "URL is current" 
                  : (!!urlInputValue && !validateUrl(urlInputValue) 
                    ? "Invalid URL" 
                    : "Apply URL")
              }
            >
              {isProcessing && urlInputValue ? "Wait..." : "Set"}
            </Button>
          </div>
          */}
          
          {/* File Upload Button - Now the primary action */}
          <Button 
            type="button" 
            variant="outline" 
            onClick={triggerFileUpload} 
            className={`${buttonSizeClass} w-full text-muted-foreground hover:text-foreground ${isProcessing && 'opacity-50 cursor-not-allowed'}`}
            disabled={isProcessing}
          >
            <UploadCloudIcon className="w-4 h-4 mr-2" /> 
            {isProcessing ? "Uploading..." : "Upload Image"}
          </Button>
          
          <Input 
            ref={fileInputRef}
            id={`${pickerId}-file-input`}
            type="file" 
            accept="image/png, image/jpeg, image/gif, image/svg+xml, image/webp" 
            onChange={handleFileUpload} 
            className="sr-only"
            disabled={isProcessing}
          />
          
          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            Max file: {MAX_FILE_SIZE_MB}MB. PNG, JPG, GIF, SVG, WebP supported.
          </p>
        </div>
      </div>
      
      {/* URL_FEATURE: Error message for URL validation - commented out but preserved */}
      {/* 
      {(showUrlError && urlInputValue && !validateUrl(urlInputValue)) && (
        <p className="mt-1 text-xs text-destructive">Please enter a valid image URL.</p>
      )}
      */}
    </div>
  );
};