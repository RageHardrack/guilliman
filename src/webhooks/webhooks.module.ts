import { Module } from '@nestjs/common';

import { DiscordModule } from '../discord/discord.module';
import { GithubSignatureGuard } from './guards/github-signature.guard';
import { GithubWebhookController } from './controllers/github-webhook.controller';

@Module({
  imports: [DiscordModule],
  controllers: [GithubWebhookController],
  providers: [GithubSignatureGuard],
})
export class WebhooksModule {}
