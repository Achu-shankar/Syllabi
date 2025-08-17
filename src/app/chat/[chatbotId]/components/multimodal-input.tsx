'use client';

import type { UIMessage } from 'ai';
import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { PaperclipIcon, StopIcon, SendIcon, DocIcon } from './icons';
// import { PreviewAttachment } from './preview-attachment'; // FUTURE: Re-enable for file uploads
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { SuggestedActions } from './suggested-actions';
import type { UseChatHelpers } from '@ai-sdk/react';
import { useContentSources } from '../lib/hooks/useContentSources';
import { Search, X } from 'lucide-react';

function PureMultimodalInput({
  chatId,
  chatbotSlug,
  input,
  setInput,
  status,
  stop,
  // attachments, // FUTURE: Re-enable for file uploads
  // setAttachments, // FUTURE: Re-enable for file uploads
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
  // attachments: Array<Attachment>; // FUTURE: Re-enable for file uploads
  // setAttachments: Dispatch<SetStateAction<Array<Attachment>>>; // FUTURE: Re-enable for file uploads
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

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
    // Update the URL to reflect the current chat session
    window.history.replaceState({}, '', `/chat/${chatbotSlug}/${chatId}`);

    // Submit the form with any configured body parameters (including chatbotSlug and selected documents)
    handleSubmit(undefined, {
      body: {
        chatbotSlug: chatbotSlug,
        selectedDocuments: selectedDocuments.length > 0 ? selectedDocuments : undefined,
      },
      // experimental_attachments: attachments, // FUTURE: Re-enable for file uploads
    });

    // setAttachments([]); // FUTURE: Re-enable for file uploads
    setLocalStorageInput('');
    resetHeight();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    // attachments, // FUTURE: Re-enable for file uploads
    handleSubmit,
    // setAttachments, // FUTURE: Re-enable for file uploads
    setLocalStorageInput,
    width,
    chatId,
    chatbotSlug,
    selectedDocuments,
  ]);

  /* FUTURE: Re-enable for file uploads
  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (error) {
      toast.error('Failed to upload file, please try again!');
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading files!', error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );
  */

  return (
    <div 
      className="relative w-full flex flex-col gap-4 mb-4"
      // style={{ backgroundColor: 'var(--chat-input-area-background-color, transparent)' }}
    >
      {/* Removed SuggestedActions from here */}

      {/* FUTURE: Re-enable for file uploads
      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div
          data-testid="attachments-preview"
          className="flex flex-row gap-2 overflow-x-scroll items-end"
        >
          {attachments.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
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
      */}

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
        className={cx(
            'min-h-[32px] sm:min-h-[36px] max-h-[calc(75dvh)] overflow-hidden resize-none !text-base pb-8 sm:pb-10 w-full transition-all duration-200',
            '[&:focus]:ring-0 [&:focus]:outline-none [&:focus-visible]:ring-0 [&:focus-visible]:outline-none [&:focus]:shadow-none',
            selectedDocuments.length > 0 ? 'rounded-b-3xl rounded-t-none border-t-0' : 'rounded-3xl',
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

        {/* Document Selection Button */}
        <div className="absolute bottom-0 left-0 p-2.5 w-fit flex flex-row justify-start">
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
              >
                <PaperclipIcon size={16} />
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
        {status === 'submitted' ? (
          <StopButton stop={stop} setMessages={setMessages} />
        ) : (
          <SendButton
            input={input}
            submitForm={submitForm}
            // uploadQueue={uploadQueue} // FUTURE: Re-enable for file uploads
            uploadQueue={[]} // Temporary empty array to maintain prop structure
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
    // if (!equal(prevProps.attachments, nextProps.attachments)) return false; // FUTURE: Re-enable for file uploads

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
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  return (
    <Button
      data-testid="send-button"
      className="rounded-full p-2.5 h-fit border-0 disabled:bg-gray-300 disabled:cursor-not-allowed text-white shadow-sm hover:shadow-md transition-all duration-200"
      style={{
        backgroundColor: input.length > 0 && uploadQueue.length === 0 
          ? 'var(--chat-primary-color, #007bff)' 
          : undefined,
        opacity: input.length === 0 || uploadQueue.length > 0 ? 0.5 : 1,
      }}
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.length === 0 || uploadQueue.length > 0}
    >
      <SendIcon size={16} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
