'use client';

import type { Attachment, UIMessage } from 'ai';
import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  memo,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { PaperclipIcon, StopIcon, SendIcon, DocIcon } from './icons';
import { PreviewAttachment } from './messages/preview-attachment';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { SuggestedActions } from './suggested-actions';
import type { UseChatHelpers } from '@ai-sdk/react';
import { useContentSources } from '../lib/hooks/useContentSources';
import { Search, X, FolderOpen } from 'lucide-react';
import equal from 'fast-deep-equal';

function PureMultimodalInput({
  chatId,
  chatbotSlug,
  input,
  setInput,
  status,
  stop,
  attachments = [],
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
}: {
  chatId: string;
  chatbotSlug: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: () => void;
  attachments?: Array<Attachment>;
  setAttachments?: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { width } = useWindowSize();
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  // Document selection state
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [isDocumentPopoverOpen, setIsDocumentPopoverOpen] = useState(false);

  // Fetch available documents
  const { 
    data: contentSources = [], 
    isLoading: isLoadingDocuments 
  } = useContentSources(chatbotSlug);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  // FUTURE: Re-enable for file uploads
  // const fileInputRef = useRef<HTMLInputElement>(null);
  // const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  // Document selection handlers
  const handleDocumentToggle = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const removeSelectedDocument = (documentId: string) => {
    setSelectedDocuments(prev => prev.filter(id => id !== documentId));
  };

  const clearAllSelectedDocuments = () => {
    setSelectedDocuments([]);
  };

  // Filter documents based on search query
  const filteredDocuments = contentSources.filter(doc => 
    doc.file_name?.toLowerCase().includes(documentSearchQuery.toLowerCase())
  );

  const submitForm = useCallback(() => {
    // Don't submit if there's no input and no attachments
    if (!input.trim() && (!attachments || attachments.length === 0)) {
      toast.error('Please enter a message or attach a file');
      return;
    }

    // Update the URL to reflect the current chat session
    window.history.replaceState({}, '', `/chat/${chatbotSlug}/${chatId}`);

    try {
      // Submit the form with any configured body parameters (including chatbotSlug and selected documents)
      handleSubmit(undefined, {
        body: {
          chatbotSlug: chatbotSlug,
          selectedDocuments: selectedDocuments.length > 0 ? selectedDocuments : undefined,
        },
        experimental_attachments: attachments,
      });

      // Clear attachments after successful submission
      if (setAttachments) {
        setAttachments([]);
      }
      setLocalStorageInput('');
      resetHeight();

      if (width && width > 768) {
        textareaRef.current?.focus();
      }
    } catch (error) {
      console.error('Error submitting message:', error);
      toast.error('Failed to send message');
    }
  }, [
    input,
    attachments,
    handleSubmit,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
    chatbotSlug,
    selectedDocuments,
  ]);

  // File upload handling
  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', chatId); // Pass the session ID

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, name, contentType, size } = data;

        return {
          url,
          name: name || file.name,
          contentType: contentType || file.type,
          size,
        };
      }
      
      // Handle error response
      const errorData = await response.json();
      const errorMessage = errorData.error || 'Upload failed';
      toast.error(errorMessage);
      console.error('Upload failed:', errorMessage);
      return null;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file, please try again!');
      return null;
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      if (!setAttachments) return;
      
      const files = Array.from(event.target.files || []);

      if (files.length === 0) return;

      // Show upload toast
      const uploadToast = toast.loading(
        `Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`
      );

      try {
        // Upload files sequentially to avoid overwhelming the server
        const uploadedAttachments: Array<Attachment> = [];
        
        for (const file of files) {
          const result = await uploadFile(file);
          if (result) {
            uploadedAttachments.push(result);
          }
        }

        if (uploadedAttachments.length > 0) {
          setAttachments((currentAttachments) => [
            ...currentAttachments,
            ...uploadedAttachments,
          ]);
          
          // Update success toast
          toast.success(
            `Successfully uploaded ${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? 's' : ''}`,
            { id: uploadToast }
          );
        } else {
          toast.error('No files were uploaded successfully', { id: uploadToast });
        }

        // Handle partial failures
        const failedCount = files.length - uploadedAttachments.length;
        if (failedCount > 0 && uploadedAttachments.length > 0) {
          toast.warning(`${failedCount} file${failedCount > 1 ? 's' : ''} failed to upload`);
        }

      } catch (error) {
        console.error('Error uploading files!', error);
        toast.error('Failed to upload files', { id: uploadToast });
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [setAttachments, chatId],
  );

  const removeAttachment = (index: number) => {
    if (setAttachments) {
      setAttachments((current) => current.filter((_, i) => i !== index));
    }
  };

  return (
    <div 
      className="relative w-full flex flex-col gap-4 mb-4"
      // style={{ backgroundColor: 'var(--chat-input-area-background-color, transparent)' }}
    >
      {/* Removed SuggestedActions from here */}

      {/* File input for uploads */}
      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
        accept="image/*,application/pdf,.txt,.md,.csv,.xls,.xlsx"
      />

      {/* Attachment Preview Area */}
      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div
          data-testid="attachments-preview"
          className="flex flex-row gap-2 overflow-x-scroll items-end p-3 bg-muted/30 rounded-lg border border-border"
        >
          {attachments.map((attachment, index) => (
            <PreviewAttachment 
              key={attachment.url} 
              attachment={attachment} 
              showActions={true}
              onRemove={() => removeAttachment(index)}
            />
          ))}

          {uploadQueue.map((filename) => (
            <PreviewAttachment
              key={filename}
              attachment={{
                url: '',
                name: filename,
                contentType: '',
              }}
              isUploading={true}
            />
          ))}
        </div>
      )}

      <div className="relative ">
        {/* Selected Documents - Separated section above input */}
        {selectedDocuments.length > 0 && (
          <div className="px-3 py-2 rounded-t-3xl border-2 border-b-0" style={{
            borderColor: 'var(--chat-primary-color, rgb(0, 255, 0))',
            backgroundColor: 'var(--chat-input-background-color, #ffffff)',
          }}>
            <div className="flex flex-wrap gap-1.5">
              {selectedDocuments.slice(0, 4).map(docId => {
                const doc = contentSources.find(d => d.id === docId);
                return doc && doc.file_name ? (
                  <span key={docId} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded-md text-xs transition-colors shadow-sm">
                    <DocIcon size={14} />
                    <span className="text-gray-700 max-w-[120px] truncate">
                      {doc.file_name.length > 18 ? `${doc.file_name.substring(0, 18)}...` : doc.file_name}
                    </span>
                    <button
                      onClick={() => removeSelectedDocument(docId)}
                      className="hover:bg-gray-100 rounded p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3 text-gray-500" />
                    </button>
                  </span>
                ) : null;
              })}
              {selectedDocuments.length > 4 && (
                <span className="inline-flex items-center px-2 py-1 bg-white border border-gray-300 rounded-md text-xs text-gray-600 shadow-sm">
                  +{selectedDocuments.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

      <Textarea
        data-testid="multimodal-input"
          data-no-focus-ring="true"
        ref={textareaRef}
        placeholder="Ask a question..."
        value={input}
        onChange={handleInput}
        disabled={status !== 'ready'}
        className={cx(
            'min-h-[32px] sm:min-h-[36px] max-h-[calc(75dvh)] overflow-hidden resize-none !text-base pb-8 sm:pb-10 w-full transition-all duration-200',
            '[&:focus]:ring-0 [&:focus]:outline-none [&:focus-visible]:ring-0 [&:focus-visible]:outline-none [&:focus]:shadow-none',
            selectedDocuments.length > 0 ? 'rounded-b-3xl rounded-t-none border-t-0' : 'rounded-3xl',
            status !== 'ready' ? 'opacity-60 cursor-not-allowed' : '',
          className,
        )}
        style={{
          backgroundColor: 'var(--chat-input-background-color, #ffffff)',
          color: 'var(--chat-input-text-color, #333333)',
          borderColor: 'var(--chat-primary-color, rgb(0, 255, 0))',
            outline: 'none',
            boxShadow: 'none',
        }}
          rows={2}
        // autoFocus
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();

            if (status !== 'ready') {
              toast.error('Please wait for the model to finish its response!');
            } else {
              submitForm();
            }
          }
        }}
      />

      {/* FUTURE: Re-enable for file uploads
      <div className="absolute bottom-0 p-2 w-fit flex flex-row justify-start">
        <AttachmentsButton fileInputRef={fileInputRef} status={status} />
      </div>
      */}

        {/* File Upload and Document Selection Buttons */}
        <div className="absolute bottom-0 left-0 p-2.5 w-fit flex flex-row justify-start gap-1">
          {/* File Upload Button */}
          {setAttachments && (
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full p-2.5 h-fit transition-all duration-200 ${
                attachments.length > 0 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                  : 'hover:bg-gray-100'
              }`}
              disabled={status !== 'ready'}
              onClick={() => fileInputRef.current?.click()}
              title="Upload external files"
            >
              <PaperclipIcon size={16} />
              {attachments.length > 0 && (
                <span className="ml-1 text-xs font-medium">
                  {attachments.length}
                </span>
              )}
            </Button>
          )}
          <Popover open={isDocumentPopoverOpen} onOpenChange={setIsDocumentPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-full p-2.5 h-fit transition-all duration-200 ${
                  selectedDocuments.length > 0 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                    : 'hover:bg-gray-100'
                }`}
                disabled={status !== 'ready' || isLoadingDocuments}
                title="Select existing documents"
              >
                <FolderOpen size={16} />
                {selectedDocuments.length > 0 && (
                  <span className="ml-1 text-xs font-medium">
                    {selectedDocuments.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">Select Documents</h4>
                  {selectedDocuments.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-600 font-medium">
                        {selectedDocuments.length} selected
                      </span>
                      <button
                        onClick={clearAllSelectedDocuments}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Search Input */}
                <div className="relative mb-3">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search documents..."
                    value={documentSearchQuery}
                    onChange={(e) => setDocumentSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>

                {/* Document List */}
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {isLoadingDocuments ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-sm text-gray-500">Loading documents...</div>
                    </div>
                  ) : filteredDocuments.length === 0 ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-sm text-gray-500">
                        {documentSearchQuery ? 'No documents found' : 'No documents available'}
                      </div>
                    </div>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className={`flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors ${
                          selectedDocuments.includes(doc.id) ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                        onClick={() => handleDocumentToggle(doc.id)}
                      >
                        <Checkbox
                          checked={selectedDocuments.includes(doc.id)}
                          onChange={() => handleDocumentToggle(doc.id)}
                        />
                        <PaperclipIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm truncate flex-1" title={doc.file_name || 'Untitled'}>
                          {doc.file_name || 'Untitled'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Action Buttons */}
                {selectedDocuments.length > 0 && (
                  <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <button
                      onClick={clearAllSelectedDocuments}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear all
                    </button>
                    <Button
                      size="sm"
                      onClick={() => setIsDocumentPopoverOpen(false)}
                      className="h-7 px-3 text-xs"
                    >
                      Done
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="absolute bottom-0 right-0 p-2.5 w-fit flex flex-row justify-end">
        {status === 'submitted' || status === 'streaming' ? (
          <StopButton stop={stop} setMessages={setMessages} />
        ) : (
          <SendButton
            input={input}
            submitForm={submitForm}
            uploadQueue={uploadQueue}
            attachments={attachments}
          />
        )}
      </div>
      </div>

      {/* Move SuggestedActions to below the input */}
      {messages.length === 0 && (
        <SuggestedActions append={append} chatId={chatId} chatbotSlug={chatbotSlug} />
      )}
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;

    return true;
  },
);

/* FUTURE: Re-enable for file uploads
function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers['status'];
}) {
  return (
    <Button
      data-testid="attachments-button"
      className="rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={status !== 'ready'}
      variant="ghost"
    >
      <PaperclipIcon size={14} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);
*/

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers['setMessages'];
}) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-full p-2.5 h-fit border-0 bg-red-500 hover:bg-red-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={16} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
  attachments = [],
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
  attachments?: Array<Attachment>;
}) {
  return (
    <Button
      data-testid="send-button"
      className="rounded-full p-2.5 h-fit border-0 disabled:bg-gray-300 disabled:cursor-not-allowed text-white shadow-sm hover:shadow-md transition-all duration-200"
      style={{
        backgroundColor: (input.length > 0 || attachments.length > 0) && uploadQueue.length === 0 
          ? 'var(--chat-primary-color, #007bff)' 
          : undefined,
        opacity: (input.length === 0 && attachments.length === 0) || uploadQueue.length > 0 ? 0.5 : 1,
      }}
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={(input.length === 0 && attachments.length === 0) || uploadQueue.length > 0}
    >
      <SendIcon size={16} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  if (!equal(prevProps.attachments, nextProps.attachments)) return false;
  return true;
});
