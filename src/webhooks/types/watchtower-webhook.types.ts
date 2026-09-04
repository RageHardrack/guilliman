export type WatchtowerStatus = 'success' | 'failed' | 'warning' | (string & {});

export interface WatchtowerWebhookPayload {
  title?: string;
  message?: string;
  containers?: string[];
  status?: WatchtowerStatus;
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
