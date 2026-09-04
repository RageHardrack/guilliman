import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';

import { WatchtowerEmbedBuilder } from '../../discord/builders/watchtower-embed.builder';
import { DiscordNotificationService } from '../../discord/services/discord-notification.service';
import {
  WatchtowerProcessedResponse,
  WatchtowerWebhookPayload,
} from '../types/watchtower-webhook.types';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WatchtowerWebhookController {
  private readonly logger = new Logger(WatchtowerWebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly discordNotificationService: DiscordNotificationService,
  ) {}

  @Post('watchtower')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive and process Watchtower container update events',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Watchtower notification processed or skipped',
  })
  public async handleWatchtowerWebhook(
    @Body() payload: WatchtowerWebhookPayload | string,
  ): Promise<WatchtowerProcessedResponse> {
    const channelId = this.configService.get<string>(
      'DISCORD_NOTIFICATIONS_CHANNEL_ID',
    );

    if (!channelId) {
      this.logger.warn(
        'DISCORD_NOTIFICATIONS_CHANNEL_ID is not configured. Skipping Watchtower notification.',
      );
      return { status: 'skipped', reason: 'channel_not_configured' };
    }

    try {
      const normalizedPayload: WatchtowerWebhookPayload =
        typeof payload === 'string'
          ? { message: payload }
          : payload || {};

      const embed = WatchtowerEmbedBuilder.build(normalizedPayload);
      const sent = await this.discordNotificationService.sendEmbed({
        channelId,
        embed,
      });

      if (!sent) {
        return { status: 'error', message: 'dispatch_failed' };
      }

      return { status: 'processed' };
    } catch (error: any) {
      this.logger.error(
        `Error dispatching Watchtower embed: ${error?.message || error}`,
        error?.stack,
      );
      return {
        status: 'error',
        message: error?.message || 'dispatch_failed',
      };
    }
  }
}
