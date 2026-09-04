import { EmbedBuilder } from 'discord.js';

import { GitHubWorkflowRunPayload } from '../../webhooks/types/github-webhook.types';
import {
  DISCORD_EMBED_COLORS,
  WorkflowEmbedParams,
} from '../types/discord.types';

export class WorkflowEmbedBuilder {
  public static build(params: WorkflowEmbedParams): EmbedBuilder {
    const color = this.resolveColor(params.status, params.conclusion);
    const title = this.resolveTitle(
      params.name,
      params.status,
      params.conclusion,
    );
    const duration = this.formatDuration(params.runStartedAt, params.updatedAt);
    const shortSha = params.commitSha
      ? params.commitSha.substring(0, 7)
      : 'unknown';
    const truncatedMessage = this.truncate(
      params.commitMessage || 'No commit message',
      100,
    );

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setURL(params.htmlUrl)
      .setTimestamp(new Date(params.updatedAt || Date.now()));

    if (params.actorLogin) {
      embed.setAuthor({
        name: params.actorLogin,
        iconURL: params.actorAvatarUrl || undefined,
      });
    }

    embed.addFields([
      {
        name: 'Repository',
        value: params.repositoryFullName || 'Unknown',
        inline: true,
      },
      {
        name: 'Branch',
        value: `\`${params.branch || 'unknown'}\``,
        inline: true,
      },
      { name: 'Duration', value: duration, inline: true },
      {
        name: 'Commit',
        value: `\`${shortSha}\` - ${truncatedMessage}`,
        inline: false,
      },
    ]);

    return embed;
  }

  public static buildFromPayload(
    payload: GitHubWorkflowRunPayload,
  ): EmbedBuilder {
    const run = payload.workflow_run;
    const repo = payload.repository || run.repository;
    const actor = run.actor || payload.sender;
    const headCommit = run.head_commit;

    return this.build({
      name: run.name || payload.workflow?.name || 'GitHub Workflow',
      status: run.status,
      conclusion: run.conclusion,
      repositoryFullName: repo?.full_name || 'Repository',
      branch: run.head_branch || 'unknown',
      commitSha: run.head_sha || headCommit?.id || '',
      commitMessage: headCommit?.message || run.display_title || '',
      actorLogin: actor?.login || 'GitHub',
      actorAvatarUrl: actor?.avatar_url || '',
      htmlUrl: run.html_url,
      runStartedAt: run.run_started_at || run.created_at,
      updatedAt: run.updated_at || new Date().toISOString(),
    });
  }

  private static resolveColor(
    status: string,
    conclusion: string | null,
  ): number {
    if (status === 'in_progress' || (status === 'queued' && !conclusion)) {
      return DISCORD_EMBED_COLORS.inProgress;
    }

    switch (conclusion) {
      case 'success':
        return DISCORD_EMBED_COLORS.success;
      case 'failure':
        return DISCORD_EMBED_COLORS.failure;
      case 'cancelled':
        return DISCORD_EMBED_COLORS.cancelled;
      case 'timed_out':
      case 'action_required':
        return DISCORD_EMBED_COLORS.warning;
      default:
        return DISCORD_EMBED_COLORS.inProgress;
    }
  }

  private static resolveTitle(
    name: string,
    status: string,
    conclusion: string | null,
  ): string {
    if (status === 'in_progress') {
      return `🔄 GitHub Workflow: ${name} (Running)`;
    }

    switch (conclusion) {
      case 'success':
        return `✅ GitHub Workflow: ${name} (Success)`;
      case 'failure':
        return `❌ GitHub Workflow: ${name} (Failed)`;
      case 'cancelled':
        return `⚪ GitHub Workflow: ${name} (Cancelled)`;
      case 'timed_out':
        return `⚠️ GitHub Workflow: ${name} (Timed Out)`;
      case 'action_required':
        return `⚠️ GitHub Workflow: ${name} (Action Required)`;
      default:
        return `ℹ️ GitHub Workflow: ${name}`;
    }
  }

  private static formatDuration(startedAt: string, endedAt: string): string {
    if (!startedAt || !endedAt) {
      return '0s';
    }

    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    const diffSeconds = Math.max(0, Math.floor((end - start) / 1000));

    if (diffSeconds < 60) {
      return `${diffSeconds}s`;
    }

    const minutes = Math.floor(diffSeconds / 60);
    const remainingSeconds = diffSeconds % 60;

    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  private static truncate(str: string, maxLength: number): string {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return `${str.substring(0, maxLength - 3)}...`;
  }
}
