import { ConfigService } from '@nestjs/config';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GithubWebhookController } from './github-webhook.controller';
import { GitHubWorkflowRunPayload } from '../types/github-webhook.types';
import { DiscordNotificationService } from '../../discord/services/discord-notification.service';

describe('GithubWebhookController', () => {
  let controller: GithubWebhookController;
  let configService: ConfigService;
  let notificationService: DiscordNotificationService;

  const mockPayload: GitHubWorkflowRunPayload = {
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
      head_branch: 'main',
      head_sha: 'a1b2c3d4e5f6',
      path: '.github/workflows/ci.yml',
      display_title: 'CI build',
      status: 'completed',
      conclusion: 'success',
      html_url: 'https://github.com/RageHardrack/lascar/actions/runs/123456789',
      run_number: 1,
      event: 'workflow_run',
      created_at: '2026-09-04T12:00:00Z',
      updated_at: '2026-09-04T12:01:00Z',
      run_started_at: '2026-09-04T12:00:00Z',
      actor: { login: 'daniel', id: 1, avatar_url: '', html_url: '' },
      head_commit: {
        id: 'a1b2c3d4e5f6',
        message: 'fix: build script',
        timestamp: '2026-09-04T12:00:00Z',
        author: { name: 'daniel', email: 'd@lascar.pe' },
      },
      repository: {
        id: 1,
        name: 'lascar',
        full_name: 'RageHardrack/lascar',
        html_url: 'https://github.com/RageHardrack/lascar',
        private: false,
      },
    },
    repository: {
      id: 1,
      name: 'lascar',
      full_name: 'RageHardrack/lascar',
      html_url: 'https://github.com/RageHardrack/lascar',
      private: false,
    },
    sender: { login: 'daniel', id: 1, avatar_url: '', html_url: '' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    configService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'DISCORD_NOTIFICATIONS_CHANNEL_ID') return 'chan-12345';
        return null;
      }),
    } as unknown as ConfigService;

    notificationService = {
      sendEmbed: vi.fn().mockResolvedValue(true),
    } as unknown as DiscordNotificationService;

    controller = new GithubWebhookController(
      configService,
      notificationService,
    );
  });

  it('should process workflow_run completed event and dispatch embed', async () => {
    const result = await controller.handleGithubWebhook(
      'workflow_run',
      mockPayload,
    );

    expect(notificationService.sendEmbed).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'processed' });
  });

  it('should ignore non-workflow_run events like push or ping', async () => {
    const result = await controller.handleGithubWebhook('push', {
      ref: 'refs/heads/main',
    } as any);

    expect(notificationService.sendEmbed).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'ignored', event: 'push' });
  });

  it('should ignore workflow_run with unsupported actions like requested', async () => {
    const result = await controller.handleGithubWebhook('workflow_run', {
      ...mockPayload,
      action: 'requested' as any,
    });

    expect(notificationService.sendEmbed).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'ignored', action: 'requested' });
  });

  it('should return skipped when DISCORD_NOTIFICATIONS_CHANNEL_ID is not configured', async () => {
    vi.mocked(configService.get).mockReturnValue(undefined);

    const result = await controller.handleGithubWebhook(
      'workflow_run',
      mockPayload,
    );

    expect(notificationService.sendEmbed).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'skipped',
      reason: 'channel_not_configured',
    });
  });

  it('should return error when notification dispatch returns false or throws', async () => {
    vi.mocked(notificationService.sendEmbed).mockResolvedValue(false);

    const result = await controller.handleGithubWebhook(
      'workflow_run',
      mockPayload,
    );

    expect(result).toEqual({ status: 'error', message: 'dispatch_failed' });
  });
});
