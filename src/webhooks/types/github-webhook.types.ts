export type GitHubWorkflowConclusion =
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'timed_out'
  | 'action_required'
  | 'skipped'
  | 'neutral'
  | null;

export type GitHubWorkflowStatus = 'queued' | 'in_progress' | 'completed';

export interface GitHubCommit {
  id: string;
  tree_id?: string;
  message: string;
  timestamp: string;
  author: {
    name: string;
    email: string;
  };
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
}

export interface GitHubActor {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  node_id: string;
  head_branch: string;
  head_sha: string;
  path: string;
  display_title: string;
  status: GitHubWorkflowStatus;
  conclusion: GitHubWorkflowConclusion;
  html_url: string;
  run_number: number;
  event: string;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  actor: GitHubActor;
  head_commit: GitHubCommit;
  repository: GitHubRepository;
}

export interface GitHubWorkflowRunPayload {
  action: 'completed' | 'in_progress' | 'requested';
  workflow: {
    id: number;
    name: string;
    path: string;
    state: string;
  };
  workflow_run: GitHubWorkflowRun;
  repository: GitHubRepository;
  sender: GitHubActor;
}

export interface WebhookProcessedResponse {
  status: 'processed' | 'ignored' | 'skipped' | 'error';
  reason?: string;
  message?: string;
  event?: string;
  action?: string;
}
