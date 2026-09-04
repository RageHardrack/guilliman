import { ConfigService } from '@nestjs/config';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { Client, Events, GatewayIntentBits } from 'discord.js';

@Injectable()
export class DiscordClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordClientService.name);
  private client: Client;
  private ready = false;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    });
  }

  public async onModuleInit(): Promise<void> {
    const token = this.configService.get<string>('DISCORD_BOT_TOKEN');

    if (!token) {
      this.logger.warn(
        'DISCORD_BOT_TOKEN is not defined. Discord bot functionality is disabled (graceful degradation).',
      );
      this.ready = false;
      return;
    }

    this.client.once(Events.ClientReady, (readyClient) => {
      this.ready = true;
      this.logger.log(
        `Discord Client successfully connected as ${readyClient.user?.tag || 'Bot'}`,
      );
    });

    this.client.on(Events.Error, (error) => {
      this.logger.error(`Discord client error: ${error.message}`, error.stack);
    });

    try {
      await this.client.login(token);
    } catch (error: any) {
      this.ready = false;
      this.logger.error(
        `Failed to connect Discord client: ${error?.message || error}`,
      );
    }
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy();
        this.ready = false;
        this.logger.log('Discord Client destroyed.');
      } catch (error: any) {
        this.logger.error(
          `Error while destroying Discord client: ${error?.message || error}`,
        );
      }
    }
  }

  public getClient(): Client {
    return this.client;
  }

  public isReady(): boolean {
    return this.ready;
  }
}
