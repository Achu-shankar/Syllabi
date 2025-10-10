"use client";

import React, { useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2, AlertTriangle, Video, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCheckDuplicateFile } from '../hooks/useContentSources';
import FileConflictDialog from './FileConflictDialog';
import BatchConflictDialog, { type BatchConflictResolution } from './BatchConflictDialog';
import { type ConflictResolution } from '../hooks/useSupabaseUpload';
import { ContentSource } from '../lib/queries';

// File type detection utilities
export type FileType = 'document' | 'multimedia' | 'unknown';
export type MultimediaType = 'video' | 'audio';

interface FileTypeInfo {
  type: FileType;
  multimediaType?: MultimediaType;
  icon: React.ReactNode;
  description: string;
}

const MULTIMEDIA_EXTENSIONS = {
  video: ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v', '.flv', '.wmv'],
  audio: ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac', '.wma', '.opus']
};

const MULTIMEDIA_MIME_TYPES = {
  video: [
    'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 
    'video/webm', 'video/x-matroska', 'video/x-flv', 'video/x-ms-wmv'
  ],
  audio: [
    'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac', 'audio/ogg',
    'audio/aac', 'audio/x-ms-wma', 'audio/opus', 'audio/webm'
  ]
};

const DOCUMENT_EXTENSIONS = ['.pdf', '.txt', '.md'];
const DOCUMENT_MIME_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];

export const detectFileType = (file: File): FileTypeInfo => {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();

  // Check for multimedia files first
  for (const [mediaType, extensions] of Object.entries(MULTIMEDIA_EXTENSIONS)) {
    if (extensions.some(ext => fileName.endsWith(ext))) {
      return {
        type: 'multimedia',
        multimediaType: mediaType as MultimediaType,
        icon: mediaType === 'video' ? <Video className="h-4 w-4" /> : <Music className="h-4 w-4" />,
        description: mediaType === 'video' ? 'Video file' : 'Audio file'
      };
    }
  }

  // Check MIME types for multimedia
  for (const [mediaType, mimeTypes] of Object.entries(MULTIMEDIA_MIME_TYPES)) {
    if (mimeTypes.includes(mimeType)) {
      return {
        type: 'multimedia',
        multimediaType: mediaType as MultimediaType,
        icon: mediaType === 'video' ? <Video className="h-4 w-4" /> : <Music className="h-4 w-4" />,
        description: mediaType === 'video' ? 'Video file' : 'Audio file'
      };
    }
  }

  // Check for document files
  if (DOCUMENT_EXTENSIONS.some(ext => fileName.endsWith(ext)) || 
      DOCUMENT_MIME_TYPES.includes(mimeType)) {
    return {
      type: 'document',
      icon: <FileText className="h-4 w-4" />,
      description: 'Document file'
    };
  }

  return {
    type: 'unknown',
    icon: <FileText className="h-4 w-4 text-muted-foreground" />,
    description: 'Unknown file type'
  };
};

interface FileUploadAreaProps {
  chatbotId: string;
  userId: string | null;
  onUploadStart?: () => void;
  startDocumentIngestion: (file: File, conflictResolution?: any, existingContentSourceId?: string) => Promise<void>;
  startMultimediaIngestion?: (file: File, conflictResolution?: any, existingContentSourceId?: string) => Promise<void>;
}

interface FileWithConflict {
  file: File;
  existingFile: ContentSource | null;
}

interface ConflictingFile {
  file: File;
  existingFile: ContentSource;
}

export default function FileUploadArea({ chatbotId, userId, onUploadStart, startDocumentIngestion, startMultimediaIngestion }: FileUploadAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedLocalFiles, setSelectedLocalFiles] = useState<File[]>([]); // For temporary display before processing starts
  const [isProcessingBatch, setIsProcessingBatch] = useState(false); // To disable button during batch add
  
  // Batch conflict resolution state
  const [conflictingFiles, setConflictingFiles] = useState<ConflictingFile[]>([]);
  const [nonConflictingFiles, setNonConflictingFiles] = useState<File[]>([]);
  const [showBatchConflictDialog, setShowBatchConflictDialog] = useState(false);
  
  // Individual conflict resolution state (for review individually)
  const [conflictFile, setConflictFile] = useState<FileWithConflict | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentBatchResolution, setCurrentBatchResolution] = useState<BatchConflictResolution | null>(null);

  const checkDuplicateFile = useCheckDuplicateFile(chatbotId);

  // Comprehensive file type support
  const acceptedFileTypes = [
    // Documents
    '.pdf', '.txt', '.md',
    // Video files
    '.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v', '.flv', '.wmv',
    // Audio files
    '.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac', '.wma', '.opus'
  ].join(',');

  const acceptedMimeTypes = [
    // Documents
    ...DOCUMENT_MIME_TYPES,
    // Video
    ...MULTIMEDIA_MIME_TYPES.video,
    // Audio
    ...MULTIMEDIA_MIME_TYPES.audio
  ];

  const isFileTypeSupported = (file: File): boolean => {
    const fileTypeInfo = detectFileType(file);
    return fileTypeInfo.type !== 'unknown';
  };

  const handleFileSelection = useCallback((files: FileList | null) => {
    if (!userId) return;
    if (files) {
      const newFileArray = Array.from(files).filter(file => isFileTypeSupported(file));
      
      // Log file type detection for debugging
      Array.from(files).forEach(file => {
        const fileTypeInfo = detectFileType(file);
        console.log(`[FileUpload] File: ${file.name}, Type: ${fileTypeInfo.type}, Multimedia: ${fileTypeInfo.multimediaType || 'N/A'}, MIME: ${file.type}`);
      });
      
      // Log unsupported files for user feedback
      const unsupportedFiles = Array.from(files).filter(file => !isFileTypeSupported(file));
      if (unsupportedFiles.length > 0) {
        console.warn('Unsupported files:', unsupportedFiles.map(f => f.name));
        // TODO: Show user notification about unsupported files
      }
      
      setSelectedLocalFiles(prev => [...prev, ...newFileArray]);
    }
  }, [userId]);

  const handleFileSelectEvent = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId) return;
    handleFileSelection(event.target.files);
    if (event.target) event.target.value = ''; 
  };

  const handleDragOver = (event: React.DragEvent) => {
    if (!userId) return;
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    if (!userId) return;
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    if (!userId) return;
    event.preventDefault();
    setIsDragOver(false);
    handleFileSelection(event.dataTransfer.files);
  };

  const removeLocalFile = (index: number) => {
    setSelectedLocalFiles(prev => prev.filter((_, i) => i !== index));
  };

  const scanForConflicts = (files: File[]) => {
    const conflicts: ConflictingFile[] = [];
    const nonConflicts: File[] = [];

    files.forEach(file => {
      const existingFile = checkDuplicateFile(file.name);
      if (existingFile) {
        conflicts.push({ file, existingFile });
      } else {
        nonConflicts.push(file);
      }
    });

    return { conflicts, nonConflicts };
  };

  const processFileWithResolution = async (file: File, resolution: ConflictResolution, existingContentSourceId?: string) => {
    if (resolution === 'cancel') return;
    
    const fileTypeInfo = detectFileType(file);
    
    try {
      switch (fileTypeInfo.type) {
        case 'document':
          console.log(`[FileUpload] Processing document: ${file.name}`);
    await startDocumentIngestion(file, resolution, existingContentSourceId);
          break;
          
        case 'multimedia':
          console.log(`[FileUpload] Processing multimedia (${fileTypeInfo.multimediaType}): ${file.name}`);
          if (startMultimediaIngestion) {
            await startMultimediaIngestion(file, resolution, existingContentSourceId);
          } else {
            console.error('Multimedia ingestion handler not provided');
            throw new Error('Multimedia processing is not available. Please contact support.');
          }
          break;
          
        default:
          console.error(`[FileUpload] Unsupported file type: ${file.name}`);
          throw new Error(`Unsupported file type: ${fileTypeInfo.description}`);
      }
    } catch (error) {
      console.error(`[FileUpload] Error processing file ${file.name}:`, error);
      // Re-throw to let the calling code handle the error
      throw error;
    }
  };

  const handleBatchConflictResolution = async (resolution: BatchConflictResolution) => {
    setShowBatchConflictDialog(false);
    setCurrentBatchResolution(resolution);

    // Process non-conflicting files first
    for (const file of nonConflictingFiles) {
      await processFileWithResolution(file, 'original');
    }

    // Handle conflicting files based on resolution
    switch (resolution) {
      case 'replace-all':
        for (const conflictingFile of conflictingFiles) {
          await processFileWithResolution(conflictingFile.file, 'replace', conflictingFile.existingFile.id);
        }
        break;
        
      case 'keep-all':
        for (const conflictingFile of conflictingFiles) {
          await processFileWithResolution(conflictingFile.file, 'keep-both');
        }
        break;
        
      case 'skip-all':
        // Do nothing with conflicting files, they're skipped
        break;
        
      case 'review-individually':
        // Start individual review process
        if (conflictingFiles.length > 0) {
          const firstConflict = conflictingFiles[0];
          setConflictFile({ file: firstConflict.file, existingFile: firstConflict.existingFile });
          setShowConflictDialog(true);
          setPendingFiles(conflictingFiles.slice(1).map(cf => cf.file));
        }
        break;
    }

    // Clean up if not reviewing individually
    if (resolution !== 'review-individually') {
      setConflictingFiles([]);
      setNonConflictingFiles([]);
      setSelectedLocalFiles([]);
      setIsProcessingBatch(false);
    }
  };

  const handleIndividualConflictResolution = async (resolution: ConflictResolution) => {
    setShowConflictDialog(false);
    
    if (conflictFile && conflictFile.existingFile) {
      const existingContentSourceId = resolution === 'replace' ? conflictFile.existingFile.id : undefined;
      await processFileWithResolution(conflictFile.file, resolution, existingContentSourceId);
      setConflictFile(null);
    }

    // Process remaining files in individual review mode
    if (pendingFiles.length > 0) {
      const nextFile = pendingFiles[0];
      const existingFile = checkDuplicateFile(nextFile.name);
      
      if (existingFile) {
        // Found another conflict, show individual dialog
        setConflictFile({ file: nextFile, existingFile });
        setShowConflictDialog(true);
        setPendingFiles(pendingFiles.slice(1));
      } else {
        // No conflict, process with original name and continue
        await processFileWithResolution(nextFile, 'original');
        
        // Check remaining files
        const remainingFiles = pendingFiles.slice(1);
        if (remainingFiles.length > 0) {
          await processRemainingIndividualFiles(remainingFiles);
        } else {
          // All done with individual review
          finishBatchProcessing();
        }
      }
    } else {
      // All done with individual review
      finishBatchProcessing();
    }
  };

  const processRemainingIndividualFiles = async (files: File[]) => {
    for (const file of files) {
      const existingFile = checkDuplicateFile(file.name);
      if (existingFile) {
        // Found another conflict, show dialog
        setConflictFile({ file, existingFile });
        setShowConflictDialog(true);
        setPendingFiles(files.slice(files.indexOf(file) + 1));
        return; // Stop processing and wait for user input
      } else {
        // No conflict, process with original name
        await processFileWithResolution(file, 'original');
      }
    }
    finishBatchProcessing();
  };

  const finishBatchProcessing = () => {
    setConflictingFiles([]);
    setNonConflictingFiles([]);
    setSelectedLocalFiles([]);
    setIsProcessingBatch(false);
    setCurrentBatchResolution(null);
  };

  const handleProcessUploads = async () => {
    if (!userId) {
        console.warn("Cannot process uploads: userId not available.");
        return;
    }
    if (selectedLocalFiles.length === 0) {
      console.log('No files selected to process');
      return;
    }
    
    setIsProcessingBatch(true);
    
    // Auto-close modal when upload processing starts
    onUploadStart?.();
    
    // Scan for conflicts in all files
    const { conflicts, nonConflicts } = scanForConflicts(selectedLocalFiles);
    
    setConflictingFiles(conflicts);
    setNonConflictingFiles(nonConflicts);
    
    if (conflicts.length > 0) {
      // Show batch conflict dialog
      setShowBatchConflictDialog(true);
    } else {
      // No conflicts, process all files directly
      for (const file of nonConflicts) {
        await processFileWithResolution(file, 'original');
      }
      setSelectedLocalFiles([]);
      setIsProcessingBatch(false);
    }
  };

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Files
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" />
            <p className="text-muted-foreground">User information is not available. Please ensure you are logged in.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4 flex flex-col max-h-[500px]">
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors flex-shrink-0",
            isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            "hover:border-primary/50 hover:bg-primary/5",
            (isProcessingBatch || !userId) && "cursor-not-allowed opacity-70"
          )}
          onDragOver={(isProcessingBatch || !userId) ? undefined : handleDragOver}
          onDragLeave={(isProcessingBatch || !userId) ? undefined : handleDragLeave}
          onDrop={(isProcessingBatch || !userId) ? undefined : handleDrop}
        >
          <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Drag & drop or click to browse</p>
            <p className="text-xs text-muted-foreground">Documents (PDF, TXT, MD) • Video (MP4, AVI, MOV) • Audio (MP3, WAV, M4A)</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedFileTypes}
            onChange={handleFileSelectEvent}
            className="hidden"
            disabled={isProcessingBatch || !userId}
          />
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => !(isProcessingBatch || !userId) && fileInputRef.current?.click()}
            disabled={isProcessingBatch || !userId}
          >
            Browse Files
          </Button>
        </div>

        {selectedLocalFiles.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <h4 className="text-sm font-medium mb-3 flex-shrink-0">Files to Process ({selectedLocalFiles.length})</h4>
            <div className="overflow-y-scroll pr-2 space-y-2 h-[200px]">
              {selectedLocalFiles.map((file, index) => {
                const fileTypeInfo = detectFileType(file);
                const fileSizeKB = (file.size / 1024).toFixed(1);
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
                const displaySize = file.size > 1024 * 1024 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;
                
                return (
                <div
                  key={index}
                  className="flex items-center justify-between p-1 border-none rounded-md text-sm border"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 text-muted-foreground">
                        {fileTypeInfo.icon}
                      </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ width: '300px' }}>
                        <p className="truncate font-medium">{file.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                          {fileTypeInfo.description} • {displaySize}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => removeLocalFile(index)}
                    disabled={isProcessingBatch || !userId}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                );
              })}
            </div>
          </div>
        )}

        <Button
          onClick={handleProcessUploads}
          disabled={isProcessingBatch || selectedLocalFiles.length === 0 || !userId}
          className="w-full flex-shrink-0"
        >
          {isProcessingBatch ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {isProcessingBatch ? 'Processing...' : `Process ${selectedLocalFiles.length} File${selectedLocalFiles.length !== 1 ? 's' : ''}`}
        </Button>
      </div>

      {/* Batch Conflict Resolution Dialog */}
      <BatchConflictDialog
        isOpen={showBatchConflictDialog}
        onResolution={handleBatchConflictResolution}
        conflictingFiles={conflictingFiles}
        nonConflictingCount={nonConflictingFiles.length}
      />

      {/* Individual Conflict Resolution Dialog (for review individually) */}
      {conflictFile && (
        <FileConflictDialog
          isOpen={showConflictDialog}
          onResolution={handleIndividualConflictResolution}
          fileName={conflictFile.file.name}
          existingFile={conflictFile.existingFile!}
        />
      )}
    </>
  );
} 