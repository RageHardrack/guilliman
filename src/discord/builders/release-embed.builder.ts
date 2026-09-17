import { EmbedBuilder } from 'discord.js';

import type { GitHubReleasePayload } from '../../webhooks/types/github-webhook.types';
import type { ReleaseEmbedParams } from '../types/discord.types';

export class ReleaseEmbedBuilder {
  private static readonly MAX_BODY_LENGTH = 3000;
  private static readonly RELEASE_COLOR = 0xd4af37; // Gold

  public static build(params: ReleaseEmbedParams): EmbedBuilder {
    const title = `🚀 Release: ${params.releaseName || params.tagName} (${params.repositoryName})`;
    const body = this.formatBody(params.body, params.htmlUrl);

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
        name: 'Repository',
        value: params.repositoryFullName,
        inline: true,
      },
      {
        name: 'Tag',
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
