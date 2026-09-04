import { EmbedBuilder } from 'discord.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DiscordClientService } from './discord-client.service';
import { DiscordNotificationService } from './discord-notification.service';

describe('DiscordNotificationService', () => {
  let service: DiscordNotificationService;
  let clientService: DiscordClientService;
  let mockClient: any;
  let testEmbed: EmbedBuilder;

  beforeEach(() => {
    mockClient = {
      channels: {
        fetch: vi.fn(),
      },
    };

    clientService = {
      isReady: vi.fn().mockReturnValue(true),
      getClient: vi.fn().mockReturnValue(mockClient),
    } as unknown as DiscordClientService;

    service = new DiscordNotificationService(clientService);
    testEmbed = new EmbedBuilder()
      .setTitle('Test Title')
      .setDescription('Test Description');
  });

  it('should return false without calling fetch if discord client is not ready', async () => {
    vi.mocked(clientService.isReady).mockReturnValue(false);

    const result = await service.sendEmbed({
      channelId: '123456789',
      embed: testEmbed,
    });

    expect(result).toBe(false);
    expect(mockClient.channels.fetch).not.toHaveBeenCalled();
  });

  it('should send embed successfully to a text channel and return true', async () => {
    const mockChannel = {
      isTextBased: vi.fn().mockReturnValue(true),
      send: vi.fn().mockResolvedValue({ id: 'msg-123' }),
    };
    mockClient.channels.fetch.mockResolvedValue(mockChannel);

    const result = await service.sendEmbed({
      channelId: '123456789',
      embed: testEmbed,
    });

    expect(result).toBe(true);
    expect(mockClient.channels.fetch).toHaveBeenCalledWith('123456789');
    expect(mockChannel.send).toHaveBeenCalledWith({ embeds: [testEmbed] });
  });

  it('should return false if channel does not exist', async () => {
    mockClient.channels.fetch.mockResolvedValue(null);

    const result = await service.sendEmbed({
      channelId: 'non-existent-channel',
      embed: testEmbed,
    });

    expect(result).toBe(false);
  });

  it('should return false if channel is not text-based', async () => {
    const mockChannel = {
      isTextBased: vi.fn().mockReturnValue(false),
      send: vi.fn(),
    };
    mockClient.channels.fetch.mockResolvedValue(mockChannel);

    const result = await service.sendEmbed({
      channelId: 'voice-channel',
      embed: testEmbed,
    });

    expect(result).toBe(false);
    expect(mockChannel.send).not.toHaveBeenCalled();
  });

  it('should catch error and return false if channel.send fails', async () => {
    const mockChannel = {
      isTextBased: vi.fn().mockReturnValue(true),
      send: vi.fn().mockRejectedValue(new Error('Missing Permissions')),
    };
    mockClient.channels.fetch.mockResolvedValue(mockChannel);

    const result = await service.sendEmbed({
      channelId: '123456789',
      embed: testEmbed,
    });

    expect(result).toBe(false);
  });
});
