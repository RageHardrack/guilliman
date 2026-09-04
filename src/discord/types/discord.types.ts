import { EmbedBuilder } from 'discord.js';

import {
  GitHubWorkflowConclusion,
  GitHubWorkflowStatus,
} from '../../webhooks/types/github-webhook.types';

export const DISCORD_EMBED_COLORS = {
  success: 0x2ecc71,
  failure: 0xe74c3c,
  inProgress: 0x3498db,
  cancelled: 0x95a5a6,
  warning: 0xe67e22,
} as const;

export interface DiscordEmbedColorPalette {
  success: number;
  failure: number;
  cancelled: number;
  inProgress: number;
  warning: number;
}

export interface DiscordSendEmbedOptions {
  channelId: string;
  embed: EmbedBuilder;
}

export interface WorkflowEmbedParams {
  name: string;
  status: GitHubWorkflowStatus;
  conclusion: GitHubWorkflowConclusion;
  repositoryFullName: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  actorLogin: string;
  actorAvatarUrl: string;
  htmlUrl: string;
  runStartedAt: string;
  updatedAt: string;
}
