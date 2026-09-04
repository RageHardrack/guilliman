import { ConfigService } from '@nestjs/config';

import { Events } from 'discord.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { DiscordClientService } from './discord-client.service';

const mockClientInstance = {
  login: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  isReady: vi.fn().mockReturnValue(false),
  user: { tag: 'TestBot#1234' },
  channels: {
    fetch: vi.fn(),
  },
};

vi.mock('discord.js', async () => {
  const actual =
    await vi.importActual<typeof import('discord.js')>('discord.js');

  class MockClient {
    login = mockClientInstance.login;
    destroy = mockClientInstance.destroy;
    on = mockClientInstance.on;
    once = mockClientInstance.once;
    isReady = mockClientInstance.isReady;
    user = mockClientInstance.user;
    channels = mockClientInstance.channels;
  }

  return {
    ...actual,
    Client: MockClient,
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
    },
    Events: {
      ClientReady: 'ready',
      Error: 'error',
    },
  };
});

describe('DiscordClientService', () => {
  let service: DiscordClientService;
  let configService: ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
    configService = {
      get: vi.fn(),
    } as unknown as ConfigService;
  });

  afterEach(async () => {
    if (service) {
      await service.onModuleDestroy();
    }
  });

  it('should initialize and login successfully when token is provided', async () => {
    vi.mocked(configService.get).mockImplementation((key: string) => {
      if (key === 'DISCORD_BOT_TOKEN') return 'fake-discord-bot-token';
      return null;
    });

    mockClientInstance.login.mockResolvedValue('token-logged-in');
    mockClientInstance.once.mockImplementation(
      (event: string, callback: (...args: any[]) => void) => {
        if (String(event) === String(Events.ClientReady)) {
          callback({ user: { tag: 'TestBot#1234' } });
        }
      },
    );

    service = new DiscordClientService(configService);
    await service.onModuleInit();

    expect(mockClientInstance.login).toHaveBeenCalledWith(
      'fake-discord-bot-token',
    );
    expect(service.isReady()).toBe(true);
  });

  it('should gracefully degrade when DISCORD_BOT_TOKEN is not configured', async () => {
    vi.mocked(configService.get).mockReturnValue(undefined);

    service = new DiscordClientService(configService);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(mockClientInstance.login).not.toHaveBeenCalled();
    expect(service.isReady()).toBe(false);
  });

  it('should catch login errors gracefully without throwing or crashing', async () => {
    vi.mocked(configService.get).mockImplementation((key: string) => {
      if (key === 'DISCORD_BOT_TOKEN') return 'invalid-token';
      return null;
    });

    mockClientInstance.login.mockRejectedValue(
      new Error('An invalid token was provided.'),
    );

    service = new DiscordClientService(configService);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(mockClientInstance.login).toHaveBeenCalledWith('invalid-token');
    expect(service.isReady()).toBe(false);
  });

  it('should call client.destroy() onModuleDestroy if initialized', async () => {
    vi.mocked(configService.get).mockReturnValue('valid-token');
    mockClientInstance.login.mockResolvedValue('token-logged-in');
    mockClientInstance.once.mockImplementation(
      (event: string, callback: (...args: any[]) => void) => {
        if (String(event) === String(Events.ClientReady)) {
          callback({ user: { tag: 'TestBot#1234' } });
        }
      },
    );

    service = new DiscordClientService(configService);
    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(mockClientInstance.destroy).toHaveBeenCalledTimes(1);
  });
});
