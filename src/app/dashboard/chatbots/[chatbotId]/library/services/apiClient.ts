// Simulate API calls for Phase 3 - Now to be actual API calls
import { v4 as uuidv4 } from 'uuid';

// TODO: Get this from environment variables or a config file
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000/api/v1'; 

// ----- PAYLOADS ----- //
interface InitiateDocumentProcessingPayload {
  chatbotId: string;
  userId: string; 
  storagePath: string; // Corresponds to file_path_in_storage
  referenceId: string; 
  fileName: string;
  fileSize: number;
  contentType: string;
}

interface InitiateUrlProcessingPayload {
  chatbotId: string;
  userId: string;
  url: string;
  referenceId: string; 
  title?: string;
}

interface InitiateIndexingPayload {
  chatbotId: string;
  userId: string;
  referenceId: string; 
}

// Multimedia-specific payloads
interface InitiateMultimediaProcessingPayload {
  chatbotId: string;
  userId: string;
  storagePath: string;
  referenceId: string;
  fileName: string;
  fileSize: number;
  contentType: string; // 'video' | 'audio'
}

interface InitiateMultimediaIndexingPayload {
  chatbotId: string;
  userId: string;
  referenceId: string;
}

// ----- RESPONSES ----- //
// Assuming backend returns task_identifier which we map to processingTaskId or indexingTaskId
interface BackendTaskResponse {
  task_identifier: string;
  reference_id: string; // Backend might confirm or echo back the reference_id
  message?: string;      // Optional message from backend
  // other fields from backend if any ...
}


// ----- API FUNCTIONS ----- //
export const apiClient = {
  initiateDocumentProcessing: async (payload: InitiateDocumentProcessingPayload): Promise<BackendTaskResponse> => {
    console.log('[API Client] Initiating document processing with backend:', payload);
    const endpoint = `${API_BASE_URL}/documents/initiate-processing`;
    
    const backendPayload = {
        user_id: payload.userId,
        chatbot_id: payload.chatbotId,
        file_path_in_storage: payload.storagePath,
        reference_id: payload.referenceId,
        // Backend might not need filename, filesize, contenttype here if it gets from storage/reference, but pass if needed
        // fileName: payload.fileName, 
        // fileSize: payload.fileSize,
        // contentType: payload.contentType
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Add Authorization header if your backend requires it
            // 'Authorization': `Bearer ${YOUR_AUTH_TOKEN}`
        },
        body: JSON.stringify(backendPayload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('[API Client] Error initiating document processing:', response.status, errorBody);
        throw new Error(`Failed to initiate document processing: ${response.status} ${errorBody}`);
    }
    if (response.status === 202) { // Accepted
        const responseData = await response.json();
        console.log('[API Client] Document processing response:', responseData);
        return responseData as BackendTaskResponse;
    }
    // Should not happen if !response.ok is handled, but as a fallback
    throw new Error('Unexpected response status from document processing initiation.');
  },

  initiateUrlProcessing: async (payload: InitiateUrlProcessingPayload): Promise<BackendTaskResponse> => {
    console.log('[API Client] Initiating URL processing with backend:', payload);
    const endpoint = `${API_BASE_URL}/urls/`; // Corrected endpoint

    const backendPayload = {
        user_id: payload.userId,
        chatbot_id: payload.chatbotId,
        url: payload.url,
        reference_id: payload.referenceId,
        // title: payload.title, // Pass if backend expects/uses it
    };
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendPayload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('[API Client] Error initiating URL processing:', response.status, errorBody);
        throw new Error(`Failed to initiate URL processing: ${response.status} ${errorBody}`);
    }
    if (response.status === 202) { // Accepted
        const responseData = await response.json();
        console.log('[API Client] URL processing response:', responseData);
        return responseData as BackendTaskResponse;
    }
    throw new Error('Unexpected response status from URL processing initiation.');
  },

  initiateIndexing: async (payload: InitiateIndexingPayload): Promise<BackendTaskResponse> => {
    console.log('[API Client] Initiating indexing with backend:', payload);
    const endpoint = `${API_BASE_URL}/indexing/initiate-indexing`;

    const backendPayload = {
        user_id: payload.userId,
        chatbot_id: payload.chatbotId,
        reference_id: payload.referenceId,
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendPayload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('[API Client] Error initiating indexing:', response.status, errorBody);
        throw new Error(`Failed to initiate indexing: ${response.status} ${errorBody}`);
    }
    if (response.status === 202) { // Accepted
        const responseData = await response.json();
        console.log('[API Client] Indexing response:', responseData);
        return responseData as BackendTaskResponse;
    }
    throw new Error('Unexpected response status from indexing initiation.');
  },

  // Multimedia processing and indexing endpoints
  initiateMultimediaProcessing: async (payload: InitiateMultimediaProcessingPayload): Promise<BackendTaskResponse> => {
    console.log('[API Client] Initiating multimedia processing with backend:', payload);
    const endpoint = `${API_BASE_URL}/multimedia/`;

    const backendPayload = {
        user_id: payload.userId,
        chatbot_id: payload.chatbotId,
        file_path: payload.storagePath,
        reference_id: payload.referenceId,
        media_type: payload.contentType,
        original_filename: payload.fileName
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendPayload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('[API Client] Error initiating multimedia processing:', response.status, errorBody);
        throw new Error(`Failed to initiate multimedia processing: ${response.status} ${errorBody}`);
    }
    if (response.status === 202) { // Accepted
        const responseData = await response.json();
        console.log('[API Client] Multimedia processing response:', responseData);
        return responseData as BackendTaskResponse;
    }
    throw new Error('Unexpected response status from multimedia processing initiation.');
  },

  initiateMultimediaIndexing: async (payload: InitiateMultimediaIndexingPayload): Promise<BackendTaskResponse> => {
    console.log('[API Client] Initiating multimedia indexing with backend:', payload);
    const endpoint = `${API_BASE_URL}/multimedia/index`;

    const backendPayload = {
        user_id: payload.userId,
        chatbot_id: payload.chatbotId,
        reference_id: payload.referenceId,
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendPayload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('[API Client] Error initiating multimedia indexing:', response.status, errorBody);
        throw new Error(`Failed to initiate multimedia indexing: ${response.status} ${errorBody}`);
    }
    if (response.status === 202) { // Accepted
        const responseData = await response.json();
        console.log('[API Client] Multimedia indexing response:', responseData);
        return responseData as BackendTaskResponse;
    }
    throw new Error('Unexpected response status from multimedia indexing initiation.');
  }
}; 