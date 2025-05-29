import React, { useRef, useEffect, memo, useCallback, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, StopCircle, LoaderIcon, XIcon } from 'lucide-react'; // Import necessary icons
import type { Attachment } from 'ai'; // Assuming Attachment type is needed
import { toast } from 'sonner'; // Keep toast import

// Define the possible chat statuses
type ChatStatus = "submitted" | "streaming" | "ready" | "error";

// Define the props the component will receive
interface MultimodalInputProps {
  sessionId: string; // To associate with the correct chat
  input: string;
  setInput: (value: string) => void;
  status: ChatStatus; // Use status prop
  stop: () => void; // Function to stop generation
  handleSubmit: (options?: { experimental_attachments?: Attachment[] }) => void; // Simplified handleSubmit prop
  // Props for attachment handling (placeholders for now)
  attachments?: Attachment[];
  setAttachments?: (attachments: Attachment[]) => void;
}

const PureMultimodalInput: React.FC<MultimodalInputProps> = ({
  sessionId,
  input,
  setInput,
  status, // Destructure status
  stop,
  handleSubmit,
  attachments = [], // Default to empty array
  setAttachments // Optional attachment handling
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if input should be disabled based on status
  const isDisabled = status === 'submitted' || status === 'streaming';

  // Auto-adjust textarea height
  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      // Set height based on scroll height, capped at a max (e.g., 150px)
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isDisabled && (input.trim() || attachments.length > 0)) {
      handleSubmit({ experimental_attachments: attachments });
    }
  };

  // Placeholder file handling logic - adapt as needed
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    console.log("File input changed:", event.target.files);
    toast.info("File attachment not fully implemented yet.");
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
  };

  const removeAttachment = (index: number) => {
    console.log("Removing attachment:", index);
    // TODO: Implement removal from attachments state
  };

  return (
    <form onSubmit={handleFormSubmit} className="p-3 border-t border-gray-200 bg-gray-50">
      {/* Attachment Preview Area - Placeholder */}
      {attachments.length > 0 && setAttachments && (
        <div className="mb-2 p-2 border border-gray-200 rounded-md bg-white">
          <span className="text-xs font-medium text-gray-600">Attachments:</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {attachments.map((att, index) => (
              <div key={index} className="relative group bg-gray-100 p-1 rounded text-xs">
                {att.name || `attachment_${index}`}
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 text-xs opacity-0 group-hover:opacity-100"
                >
                  <XIcon size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="relative flex items-end space-x-2">
        {/* Attach Button */}
        {setAttachments && ( // Only show if attachment handling is provided
             <>
                <input
                  type="file"
                  id={`requic-agent-file-input-${sessionId}`} // Unique ID per session might be needed if multiple instances exist
                  className="hidden"
                  onChange={handleFileChange}
                  multiple
                  ref={fileInputRef}
                  accept="image/*,application/pdf,.txt,.md" // Example accepted types
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0 text-gray-500 hover:bg-gray-200"
                    onClick={() => document.getElementById(`requic-agent-file-input-${sessionId}`)?.click()}
                    disabled={isDisabled} // Use isDisabled based on status
                    title="Attach files"
                    >
                    <Paperclip className="h-4 w-4" />
                </Button>
             </>
        )}

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          placeholder="Send a message..."
          className="flex-1 resize-none overflow-y-auto rounded-md border border-gray-300 px-3 py-1.5 min-h-[36px] max-h-[150px] text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 scrollbar-hide"
          rows={1}
          disabled={isDisabled} // Use isDisabled based on status
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!isDisabled && (input.trim() || attachments.length > 0)) {
                handleFormSubmit(e as any); // Type assertion needed if form event is not passed
              }
            }
          }}
        />

        {/* Send/Stop Button */}
        <Button
          type={isDisabled ? "button" : "submit"} // Show Stop as type="button"
          variant="default"
          size="icon"
          className={`h-8 w-8 flex-shrink-0 ${isDisabled ? 'bg-red-100 text-red-600 hover:bg-red-200' : ''}`}
          // Disable submit button only if not loading AND input/attachments are empty
          disabled={!isDisabled && !input.trim() && attachments.length === 0}
          onClick={isDisabled ? stop : undefined} // Call stop only if disabled (i.e., submitted/streaming)
          title={isDisabled ? "Stop Generation" : "Send Message"}
        >
          {isDisabled ? <StopCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
};

// Memoize the component for performance optimization
export const MultimodalInput = memo(PureMultimodalInput);

// Default export (optional, depending on your preference)
export default MultimodalInput;
