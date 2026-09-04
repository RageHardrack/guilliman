import { ConfigService } from '@nestjs/config';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WatchtowerWebhookController } from './watchtower-webhook.controller';
import { DiscordNotificationService } from '../../discord/services/discord-notification.service';

describe('WatchtowerWebhookController', () => {
  let controller: WatchtowerWebhookController;
  let mockConfigService: { get: any };
  let mockDiscordNotificationService: { sendEmbed: any };

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'DISCORD_NOTIFICATIONS_CHANNEL_ID') return '1234567890';
        return null;
      }),
    };

    mockDiscordNotificationService = {
      sendEmbed: vi.fn().mockResolvedValue(true),
    };

    controller = new WatchtowerWebhookController(
      mockConfigService as unknown as ConfigService,
      mockDiscordNotificationService as unknown as DiscordNotificationService,
    );
  });

  it('skips notification if channel is not configured', async () => {
    mockConfigService.get.mockReturnValue(null);

    const result = await controller.handleWatchtowerWebhook({
      message: 'Updated container lascar-tique',
    });

    expect(result).toEqual({
      status: 'skipped',
      reason: 'channel_not_configured',
    });
    expect(mockDiscordNotificationService.sendEmbed).not.toHaveBeenCalled();
  });

  it('dispatches embed to Discord when valid payload is received', async () => {
    const payload = {
      title: 'Watchtower updates',
      message: 'Updated containers: lascar-tique',
      containers: ['lascar-tique'],
      status: 'success',
    };

    const result = await controller.handleWatchtowerWebhook(payload);

    expect(result).toEqual({ status: 'processed' });
    expect(mockDiscordNotificationService.sendEmbed).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: '1234567890',
        embed: expect.any(Object),
      }),
    );
  });

  it('handles string/plain text body seamlessly', async () => {
    const payload = 'Updated container lascar-blog to latest';

    const result = await controller.handleWatchtowerWebhook(payload);

    expect(result).toEqual({ status: 'processed' });
    expect(mockDiscordNotificationService.sendEmbed).toHaveBeenCalled();
  });

  it('returns error status if dispatch fails', async () => {
    mockDiscordNotificationService.sendEmbed.mockResolvedValue(false);

    const result = await controller.handleWatchtowerWebhook({
      message: 'Update complete',
    });

    expect(result).toEqual({
      status: 'error',
      message: 'dispatch_failed',
    });
  });
});
