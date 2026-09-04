import { describe, expect, it } from 'vitest';

import { WatchtowerEmbedBuilder } from './watchtower-embed.builder';
import { DISCORD_EMBED_COLORS } from '../types/discord.types';

describe('WatchtowerEmbedBuilder', () => {
  it('builds a successful deployment embed from structured payload', () => {
    const payload = {
      title: 'Watchtower updates on lascar-vps',
      message: 'Updated containers: lascar-tique, lascar-blog',
      containers: ['lascar-tique', 'lascar-blog'],
      status: 'success',
      host: 'lascar-vps',
    };

    const embed = WatchtowerEmbedBuilder.build(payload);
    const data = embed.toJSON();

    expect(data.title).toContain('🐳 Watchtower: Despliegue de Contenedores');
    expect(data.color).toBe(DISCORD_EMBED_COLORS.success);
    expect(data.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Servidor', value: '`lascar-vps`' }),
        expect.objectContaining({
          name: 'Contenedores Actualizados',
          value: '`lascar-tique`, `lascar-blog`',
        }),
      ]),
    );
  });

  it('builds failure embed when status is failed', () => {
    const payload = {
      title: 'Watchtower error',
      message: 'Failed to update container lascar-guilliman',
      containers: ['lascar-guilliman'],
      status: 'failed',
    };

    const embed = WatchtowerEmbedBuilder.build(payload);
    const data = embed.toJSON();

    expect(data.color).toBe(DISCORD_EMBED_COLORS.failure);
    expect(data.title).toContain('Fallo');
  });

  it('parses containers from plain message text if containers array is not provided', () => {
    const payload = {
      message: 'Found new image for lascar-tique. Recreating container lascar-tique...',
    };

    const embed = WatchtowerEmbedBuilder.build(payload);
    const data = embed.toJSON();

    expect(data.title).toContain('🐳 Watchtower');
    expect(data.color).toBe(DISCORD_EMBED_COLORS.success);
  });
});
