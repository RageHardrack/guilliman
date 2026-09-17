import { describe, expect, it } from 'vitest';

import { ReleaseEmbedBuilder } from './release-embed.builder';
import type { GitHubReleasePayload } from '../../webhooks/types/github-webhook.types';
import type { ReleaseEmbedParams } from '../types/discord.types';

describe('ReleaseEmbedBuilder', () => {
  const baseParams: ReleaseEmbedParams = {
    repositoryName: 'tique',
    repositoryFullName: 'RageHardrack/tique',
    tagName: 'v1.1.0',
    releaseName: 'v1.1.0: Contenedor acotado y filtros',
    body: '### Features\n- Agrupación Top 5\n- Filtro sin categoría\n\n### Bug Fixes\n- Corrección de scroll',
    htmlUrl: 'https://github.com/RageHardrack/tique/releases/tag/v1.1.0',
    actorLogin: 'danielcolmenares',
    actorAvatarUrl: 'https://avatars.githubusercontent.com/u/12345?v=4',
    publishedAt: '2026-09-17T12:00:00Z',
  };

  it('should build a Discord embed with release title, url and color', () => {
    const embed = ReleaseEmbedBuilder.build(baseParams);

    expect(embed.data.title).toBe('🚀 Release: v1.1.0: Contenedor acotado y filtros (tique)');
    expect(embed.data.url).toBe(baseParams.htmlUrl);
    expect(embed.data.color).toBe(0xd4af37); // Gold accent
  });

  it('should set author information when actor is provided', () => {
    const embed = ReleaseEmbedBuilder.build(baseParams);

    expect(embed.data.author?.name).toBe('danielcolmenares');
    expect(embed.data.author?.icon_url).toBe(baseParams.actorAvatarUrl);
  });

  it('should include repository and tag fields', () => {
    const embed = ReleaseEmbedBuilder.build(baseParams);

    const fields = embed.data.fields || [];
    const repoField = fields.find((f) => f.name === 'Repository');
    const tagField = fields.find((f) => f.name === 'Tag');

    expect(repoField?.value).toBe('RageHardrack/tique');
    expect(tagField?.value).toBe('`v1.1.0`');
  });

  it('should set description with the markdown changelog', () => {
    const embed = ReleaseEmbedBuilder.build(baseParams);

    expect(embed.data.description).toContain('### Features');
    expect(embed.data.description).toContain('Filtro sin categoría');
  });

  it('should handle null or empty changelog gracefully', () => {
    const embed = ReleaseEmbedBuilder.build({
      ...baseParams,
      body: null,
    });

    expect(embed.data.description).toBe('Sin notas de cambios especificadas en este lanzamiento.');
  });

  it('should truncate overly long changelogs to prevent Discord 4096 character overflow', () => {
    const longBody = 'A'.repeat(4000);
    const embed = ReleaseEmbedBuilder.build({
      ...baseParams,
      body: longBody,
    });

    expect(embed.data.description?.length).toBeLessThanOrEqual(3000);
    expect(embed.data.description).toContain('... [Ver notas completas en GitHub]');
  });

  it('should build correctly from a GitHubReleasePayload', () => {
    const payload: GitHubReleasePayload = {
      action: 'published',
      release: {
        id: 999,
        tag_name: 'v2.0.0',
        name: 'v2.0.0 Major Update',
        body: '## Breaking Changes\n- New auth architecture',
        html_url: 'https://github.com/RageHardrack/guilliman/releases/tag/v2.0.0',
        published_at: '2026-09-17T12:00:00Z',
        author: {
          id: 12345,
          login: 'danielcolmenares',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4',
          html_url: 'https://github.com/danielcolmenares',
        },
      },
      repository: {
        id: 1,
        name: 'guilliman',
        full_name: 'RageHardrack/guilliman',
        html_url: 'https://github.com/RageHardrack/guilliman',
        private: false,
      },
      sender: {
        id: 12345,
        login: 'danielcolmenares',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4',
        html_url: 'https://github.com/danielcolmenares',
      },
    };

    const embed = ReleaseEmbedBuilder.buildFromPayload(payload);

    expect(embed.data.title).toBe('🚀 Release: v2.0.0 Major Update (guilliman)');
    expect(embed.data.description).toContain('New auth architecture');
  });
});
