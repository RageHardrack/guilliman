import { describe, expect, it } from 'vitest';

import { DISCORD_EMBED_COLORS } from '../types/discord.types';
import { WatchtowerEmbedBuilder } from './watchtower-embed.builder';

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
      message:
        'Found new image for lascar-tique. Recreating container lascar-tique...',
    };

    const embed = WatchtowerEmbedBuilder.build(payload);
    const data = embed.toJSON();

    expect(data.title).toContain('🐳 Watchtower');
    expect(data.color).toBe(DISCORD_EMBED_COLORS.success);
  });

  it('correctly classifies a session report with 0 failed as NOT a failure', () => {
    const payload = {
      message: 'Session report: 4 Scanned, 0 Updated, 0 Failed',
    };

    expect(WatchtowerEmbedBuilder.isFailure(payload)).toBe(false);
    expect(WatchtowerEmbedBuilder.isZeroUpdatesSession(payload)).toBe(true);

    const embed = WatchtowerEmbedBuilder.build(payload);
    const data = embed.toJSON();
    expect(data.color).toBe(DISCORD_EMBED_COLORS.success);
    expect(data.title).toContain('🐳 Watchtower: Despliegue');
  });

  it('correctly classifies registry 403 Forbidden / denied error as a failure', () => {
    const payload = {
      message:
        'Could not do a head request for "ghcr.io/ragehardrack/guilliman:latest", falling back to regular pull. Reason: registry responded to head request with "403 Forbidden", auth: "not present"',
    };

    expect(WatchtowerEmbedBuilder.isFailure(payload)).toBe(true);
    expect(WatchtowerEmbedBuilder.isZeroUpdatesSession(payload)).toBe(false);

    const embed = WatchtowerEmbedBuilder.build(payload);
    const data = embed.toJSON();
    expect(data.color).toBe(DISCORD_EMBED_COLORS.failure);
    expect(data.title).toContain('Fallo');
  });
});
