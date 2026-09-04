import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';

import { GithubSignatureGuard } from '../guards/github-signature.guard';
import { WorkflowEmbedBuilder } from '../../discord/builders/workflow-embed.builder';
import { DiscordNotificationService } from '../../discord/services/discord-notification.service';
import {
  GitHubWorkflowRunPayload,
  WebhookProcessedResponse,
} from '../types/github-webhook.types';

@ApiTags('Webhooks')
@Controller('webhooks')
export class GithubWebhookController {
  private readonly logger = new Logger(GithubWebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly discordNotificationService: DiscordNotificationService,
  ) {}

  @Post('github')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GithubSignatureGuard)
  @ApiOperation({ summary: 'Receive and process GitHub webhook events' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed, skipped, or ignored',
  })
  public async handleGithubWebhook(
    @Headers('x-github-event') event: string,
    @Body() payload: GitHubWorkflowRunPayload | Record<string, any>,
  ): Promise<WebhookProcessedResponse> {
    if (event !== 'workflow_run') {
      this.logger.debug(`Ignoring unhandled GitHub event: ${event}`);
      return { status: 'ignored', event };
    }

    const workflowPayload = payload as GitHubWorkflowRunPayload;
    if (workflowPayload.action !== 'completed') {
      this.logger.debug(
        `Ignoring workflow_run with action: ${workflowPayload.action}`,
      );
      return { status: 'ignored', action: workflowPayload.action };
    }

    const channelId = this.configService.get<string>(
      'DISCORD_NOTIFICATIONS_CHANNEL_ID',
    );

    if (!channelId) {
      this.logger.warn(
        'DISCORD_NOTIFICATIONS_CHANNEL_ID is not configured. Skipping workflow notification.',
      );
      return { status: 'skipped', reason: 'channel_not_configured' };
    }

    try {
      const embed = WorkflowEmbedBuilder.buildFromPayload(workflowPayload);
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
        `Error dispatching workflow run embed: ${error?.message || error}`,
        error?.stack,
      );
      return { status: 'error', message: error?.message || 'dispatch_failed' };
    }
  }
}
