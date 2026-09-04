import { Injectable, Logger } from '@nestjs/common';

import { DiscordClientService } from './discord-client.service';
import { DiscordSendEmbedOptions } from '../types/discord.types';

@Injectable()
export class DiscordNotificationService {
  private readonly logger = new Logger(DiscordNotificationService.name);

  constructor(private readonly discordClientService: DiscordClientService) {}

  public async sendEmbed(options: DiscordSendEmbedOptions): Promise<boolean> {
    const { channelId, embed } = options;

    if (!this.discordClientService.isReady()) {
      this.logger.warn(
        'Cannot send Discord notification: DiscordClientService is not ready or connected.',
      );
      return false;
    }

    try {
      const client = this.discordClientService.getClient();
      const channel = await client.channels.fetch(channelId);

      if (!channel) {
        this.logger.error(
          `Discord channel with ID ${channelId} was not found.`,
        );
        return false;
      }

      if (
        !('send' in channel) ||
        typeof (channel as any).send !== 'function' ||
        !channel.isTextBased()
      ) {
        this.logger.error(
          `Discord channel with ID ${channelId} is not a text-based sendable channel.`,
        );
        return false;
      }

      await (channel as any).send({ embeds: [embed] });
      this.logger.log(
        `Successfully dispatched embed to Discord channel ${channelId}`,
      );
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to send Discord notification to channel ${channelId}: ${error?.message || error}`,
        error?.stack,
      );
      return false;
    }
  }
}
