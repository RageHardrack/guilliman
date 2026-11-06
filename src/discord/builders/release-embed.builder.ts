import { EmbedBuilder } from 'discord.js';

import type { ReleaseEmbedParams } from '../types/discord.types';
import { extractSpanishReleaseSection } from './release-spanish-section';
import type { GitHubReleasePayload } from '../../webhooks/types/github-webhook.types';

export class ReleaseEmbedBuilder {
  private static readonly MAX_BODY_LENGTH = 3000;
  private static readonly RELEASE_COLOR = 0xd4af37; // Gold

  public static build(params: ReleaseEmbedParams): EmbedBuilder {
    const title = `🚀 Nueva versión: ${params.releaseName || params.tagName} (${params.repositoryName})`;
    // Spec S9: announce the Spanish summary when the release carries one,
    // otherwise fall back to the full release body.
    const notes = extractSpanishReleaseSection(params.body) ?? params.body;
    const body = this.formatBody(notes, params.htmlUrl);

    const embed = new EmbedBuilder()
      .setColor(this.RELEASE_COLOR)
      .setTitle(title)
      .setURL(params.htmlUrl)
      .setDescription(body)
      .setTimestamp(new Date(params.publishedAt || Date.now()));

    if (params.actorLogin) {
      embed.setAuthor({
        name: params.actorLogin,
        iconURL: params.actorAvatarUrl || undefined,
      });
    }

    embed.addFields([
      {
        name: 'Repositorio',
        value: params.repositoryFullName,
        inline: true,
      },
      {
        name: 'Versión',
        value: `\`${params.tagName}\``,
        inline: true,
      },
    ]);

    return embed;
  }

  public static buildFromPayload(payload: GitHubReleasePayload): EmbedBuilder {
    const release = payload.release;
    const repo = payload.repository;
    const author = release.author || payload.sender;

    return this.build({
      repositoryName: repo.name,
      repositoryFullName: repo.full_name,
      tagName: release.tag_name,
      releaseName: release.name,
      body: release.body,
      htmlUrl: release.html_url,
      actorLogin: author?.login || 'GitHub',
      actorAvatarUrl: author?.avatar_url || '',
      publishedAt: release.published_at || new Date().toISOString(),
    });
  }

  private static formatBody(body: string | null, htmlUrl: string): string {
    if (!body || body.trim() === '') {
      return 'Sin notas de cambios especificadas en este lanzamiento.';
    }

    const trimmed = body.trim();
    if (trimmed.length <= this.MAX_BODY_LENGTH) {
      return trimmed;
    }

    const suffix = `... [Ver notas completas en GitHub](${htmlUrl})`;
    const maxTextLength = Math.max(0, this.MAX_BODY_LENGTH - suffix.length);
    const truncated = trimmed.substring(0, maxTextLength);
    return `${truncated}${suffix}`;
  }
}
