export interface ApiError {
  error: string;
  details?: Array<{ field: string; message: string }>;
}

export interface SSEToken {
  token: string;
}

export interface TranscriptionResponse {
  text: string;
  durationMs: number;
}
