import { describe, it, expect } from 'vitest';

import { WorkflowEmbedBuilder } from './workflow-embed.builder';
import { GitHubWorkflowRunPayload } from '../../webhooks/types/github-webhook.types';
import {
  DISCORD_EMBED_COLORS,
  WorkflowEmbedParams,
} from '../types/discord.types';

describe('WorkflowEmbedBuilder', () => {
  const baseParams: WorkflowEmbedParams = {
    name: 'CI Pipeline',
    status: 'completed',
    conclusion: 'success',
    repositoryFullName: 'RageHardrack/lascar',
    branch: 'main',
    commitSha: 'a1b2c3d4e5f6789012345678901234567890abcd',
    commitMessage:
      'feat: add discord bot webhook integration with support for workflow runs',
    actorLogin: 'danielcolmenares',
    actorAvatarUrl: 'https://avatars.githubusercontent.com/u/12345?v=4',
    htmlUrl: 'https://github.com/RageHardrack/lascar/actions/runs/123456789',
    runStartedAt: '2026-09-04T12:00:00Z',
    updatedAt: '2026-09-04T12:01:24Z',
  };

  describe('Color mapping', () => {
    it('should map success conclusion to green (0x2ECC71)', () => {
      const embed = WorkflowEmbedBuilder.build({
        ...baseParams,
        conclusion: 'success',
      });
      expect(embed.data.color).toBe(DISCORD_EMBED_COLORS.success);
    });

    it('should map failure conclusion to red (0xE74C3C)', () => {
      const embed = WorkflowEmbedBuilder.build({
        ...baseParams,
        conclusion: 'failure',
      });
      expect(embed.data.color).toBe(DISCORD_EMBED_COLORS.failure);
    });

    it('should map in_progress status to blue (0x3498DB)', () => {
      const embed = WorkflowEmbedBuilder.build({
        ...baseParams,
        status: 'in_progress',
        conclusion: null,
      });
      expect(embed.data.color).toBe(DISCORD_EMBED_COLORS.inProgress);
    });

    it('should map cancelled conclusion to grey (0x95A5A6)', () => {
      const embed = WorkflowEmbedBuilder.build({
        ...baseParams,
        conclusion: 'cancelled',
      });
      expect(embed.data.color).toBe(DISCORD_EMBED_COLORS.cancelled);
    });

    it('should map timed_out / action_required conclusion to warning orange (0xE67E22)', () => {
      const embedTimedOut = WorkflowEmbedBuilder.build({
        ...baseParams,
        conclusion: 'timed_out',
      });
      expect(embedTimedOut.data.color).toBe(DISCORD_EMBED_COLORS.warning);

      const embedActionReq = WorkflowEmbedBuilder.build({
        ...baseParams,
        conclusion: 'action_required',
      });
      expect(embedActionReq.data.color).toBe(DISCORD_EMBED_COLORS.warning);
    });
  });

  describe('Embed structure & fields', () => {
    it('should set title, url, author, and timestamp correctly', () => {
      const embed = WorkflowEmbedBuilder.build(baseParams);

      expect(embed.data.title).toContain('CI Pipeline');
      expect(embed.data.title).toContain('Success');
      expect(embed.data.url).toBe(baseParams.htmlUrl);
      expect(embed.data.author?.name).toBe('danielcolmenares');
      expect(embed.data.author?.icon_url).toBe(baseParams.actorAvatarUrl);
      expect(embed.data.timestamp).toBeDefined();
    });

    it('should format commit sha to 7 characters', () => {
      const embed = WorkflowEmbedBuilder.build(baseParams);
      const commitField = embed.data.fields?.find((f) => f.name === 'Commit');

      expect(commitField).toBeDefined();
      expect(commitField?.value).toContain('`a1b2c3d`');
    });

    it('should truncate commit message to 100 characters if too long', () => {
      const longMessage = 'a'.repeat(150);
      const embed = WorkflowEmbedBuilder.build({
        ...baseParams,
        commitMessage: longMessage,
      });
      const commitField = embed.data.fields?.find((f) => f.name === 'Commit');

      expect(commitField?.value).toContain('...');
      expect(commitField?.value.length).toBeLessThan(150);
    });

    it('should calculate duration between start and updated timestamps', () => {
      // 1 minute 24 seconds
      const embed = WorkflowEmbedBuilder.build(baseParams);
      const durationField = embed.data.fields?.find(
        (f) => f.name === 'Duration',
      );
      expect(durationField?.value).toBe('1m 24s');

      // 45 seconds
      const embed45s = WorkflowEmbedBuilder.build({
        ...baseParams,
        runStartedAt: '2026-09-04T12:00:00Z',
        updatedAt: '2026-09-04T12:00:45Z',
      });
      expect(
        embed45s.data.fields?.find((f) => f.name === 'Duration')?.value,
      ).toBe('45s');

      // 2 hours 15 minutes
      const embed2h = WorkflowEmbedBuilder.build({
        ...baseParams,
        runStartedAt: '2026-09-04T12:00:00Z',
        updatedAt: '2026-09-04T14:15:00Z',
      });
      expect(
        embed2h.data.fields?.find((f) => f.name === 'Duration')?.value,
      ).toBe('2h 15m');
    });

    it('should include repository and branch fields', () => {
      const embed = WorkflowEmbedBuilder.build(baseParams);
      const repoField = embed.data.fields?.find((f) => f.name === 'Repository');
      const branchField = embed.data.fields?.find((f) => f.name === 'Branch');

      expect(repoField?.value).toBe('RageHardrack/lascar');
      expect(branchField?.value).toBe('`main`');
    });
  });

  describe('buildFromPayload', () => {
    it('should extract workflow run payload fields and construct embed', () => {
      const payload: GitHubWorkflowRunPayload = {
        action: 'completed',
        workflow: {
          id: 1,
          name: 'CI Pipeline',
          path: '.github/workflows/ci.yml',
          state: 'active',
        },
        workflow_run: {
          id: 123456789,
          name: 'CI Pipeline',
          node_id: 'node_123',
          head_branch: 'feature/bot',
          head_sha: '1234567890abcdef1234567890abcdef12345678',
          path: '.github/workflows/ci.yml',
          display_title: 'CI test run',
          status: 'completed',
          conclusion: 'failure',
          html_url:
            'https://github.com/RageHardrack/lascar/actions/runs/123456789',
          run_number: 42,
          event: 'workflow_run',
          created_at: '2026-09-04T12:00:00Z',
          updated_at: '2026-09-04T12:02:00Z',
          run_started_at: '2026-09-04T12:00:00Z',
          actor: {
            login: 'rageuser',
            id: 99,
            avatar_url: 'https://avatars.githubusercontent.com/u/99',
            html_url: 'https://github.com/rageuser',
          },
          head_commit: {
            id: '1234567890abcdef1234567890abcdef12345678',
            message: 'fix: resolve flaky test',
            timestamp: '2026-09-04T11:59:00Z',
            author: { name: 'Rage', email: 'rage@lascar.pe' },
          },
          repository: {
            id: 100,
            name: 'lascar',
            full_name: 'RageHardrack/lascar',
            html_url: 'https://github.com/RageHardrack/lascar',
            private: false,
          },
        },
        repository: {
          id: 100,
          name: 'lascar',
          full_name: 'RageHardrack/lascar',
          html_url: 'https://github.com/RageHardrack/lascar',
          private: false,
        },
        sender: {
          login: 'rageuser',
          id: 99,
          avatar_url: 'https://avatars.githubusercontent.com/u/99',
          html_url: 'https://github.com/rageuser',
        },
      };

      const embed = WorkflowEmbedBuilder.buildFromPayload(payload);
      expect(embed.data.color).toBe(DISCORD_EMBED_COLORS.failure);
      expect(embed.data.title).toContain('CI Pipeline');
      expect(embed.data.title).toContain('Failed');
      expect(embed.data.author?.name).toBe('rageuser');
      expect(embed.data.fields?.find((f) => f.name === 'Branch')?.value).toBe(
        '`feature/bot`',
      );
      expect(embed.data.fields?.find((f) => f.name === 'Duration')?.value).toBe(
        '2m 0s',
      );
    });
  });
});
