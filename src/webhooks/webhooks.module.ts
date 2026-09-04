import { Module } from '@nestjs/common';

import { DiscordModule } from '../discord/discord.module';
import { GithubSignatureGuard } from './guards/github-signature.guard';
import { GithubWebhookController } from './controllers/github-webhook.controller';
import { WatchtowerWebhookController } from './controllers/watchtower-webhook.controller';

@Module({
  imports: [DiscordModule],
  controllers: [GithubWebhookController, WatchtowerWebhookController],
  providers: [GithubSignatureGuard],
})
export class WebhooksModule {}
