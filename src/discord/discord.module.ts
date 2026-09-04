import { Module } from '@nestjs/common';

import { DiscordClientService } from './services/discord-client.service';
import { DiscordNotificationService } from './services/discord-notification.service';

@Module({
  providers: [DiscordClientService, DiscordNotificationService],
  exports: [DiscordClientService, DiscordNotificationService],
})
export class DiscordModule {}
