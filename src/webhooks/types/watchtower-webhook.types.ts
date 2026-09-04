export interface WatchtowerWebhookPayload {
  title?: string;
  message?: string;
  containers?: string[];
  status?: 'success' | 'failed' | 'warning' | string;
  host?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface WatchtowerProcessedResponse {
  status: 'processed' | 'skipped' | 'error';
  message?: string;
  reason?: string;
  containers?: string[];
}
