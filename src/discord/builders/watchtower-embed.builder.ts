import { EmbedBuilder } from 'discord.js';

import { DISCORD_EMBED_COLORS } from '../types/discord.types';
import { WatchtowerWebhookPayload } from '../../webhooks/types/watchtower-webhook.types';

export class WatchtowerEmbedBuilder {
  public static isFailure(payload: WatchtowerWebhookPayload): boolean {
    if (payload.status === 'failed' || payload.status === 'error') {
      return true;
    }
    if (payload.status === 'success') {
      return false;
    }

    if (!payload.message) {
      return false;
    }

    const msg = payload.message;

    // Explicit error signatures from registry, daemon, network or container updates
    const hasExplicitError =
      /\b(?:denied|unauthorized|forbidden|unable to update|failed to|error response|could not)\b/i.test(
        msg,
      ) ||
      /\b(?:[1-9]\d*)\s+failed\b/i.test(msg) ||
      /\bfailed:\s*(?:[1-9]\d*)\b/i.test(msg);

    if (hasExplicitError) {
      return true;
    }

    // Check if it is a session report indicating 0 failures
    const hasZeroFailures =
      /\b0\s+failed\b/i.test(msg) ||
      /\bfailed:\s*0\b/i.test(msg) ||
      /\b0\s+failures\b/i.test(msg);

    if (hasZeroFailures) {
      return false;
    }

    return /\b(?:error|failed|failure)\b/i.test(msg);
  }

  public static isZeroUpdatesSession(
    payload: WatchtowerWebhookPayload,
  ): boolean {
    if (this.isFailure(payload)) {
      return false;
    }

    const msg = payload.message || '';
    const hasZeroUpdated =
      /\b0\s+updated\b/i.test(msg) || /\bupdated:\s*0\b/i.test(msg);

    const hasNoExplicitContainers =
      (!payload.containers || payload.containers.length === 0) &&
      this.extractContainers(msg).length === 0;

    return (
      hasZeroUpdated ||
      (/\bsession report\b/i.test(msg) && hasNoExplicitContainers)
    );
  }

  public static build(payload: WatchtowerWebhookPayload): EmbedBuilder {
    const isFailure = this.isFailure(payload);

    const color = isFailure
      ? DISCORD_EMBED_COLORS.failure
      : DISCORD_EMBED_COLORS.success;

    const title = isFailure
      ? '⚠️ 🐳 Watchtower: Fallo en Actualización de Contenedores'
      : '🐳 Watchtower: Despliegue de Contenedores';

    const serverHost = payload.host || 'lascar-vps';
    const containers =
      payload.containers && payload.containers.length > 0
        ? payload.containers
        : this.extractContainers(payload.message || '');

    const containersValue =
      containers.length > 0
        ? containers.map((c) => `\`${c}\``).join(', ')
        : '`General / Auto-Update`';

    const cleanMessage = this.truncate(
      payload.message ||
        payload.title ||
        'Actualización de contenedores completada con éxito.',
      500,
    );

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(cleanMessage)
      .setTimestamp(
        payload.timestamp ? new Date(payload.timestamp) : new Date(),
      )
      .setFooter({ text: 'Lerthalanthia • CI/CD & Deployment Guardian' });

    embed.addFields([
      {
        name: 'Servidor',
        value: `\`${serverHost}\``,
        inline: true,
      },
      {
        name: 'Contenedores Actualizados',
        value: containersValue,
        inline: true,
      },
      {
        name: 'Estado',
        value: isFailure ? '❌ Error' : '✅ Desplegado y Activo',
        inline: true,
      },
    ]);

    return embed;
  }

  private static extractContainers(message: string): string[] {
    if (!message) return [];
    const knownContainers = [
      'lascar-blog',
      'lascar-financiapp',
      'lascar-tique',
      'lascar-leon',
      'lascar-guilliman',
      'lascar-postgres',
      'lascar-redis',
      'lascar-prometheus',
      'lascar-grafana',
      'nginx-proxy',
      'nginx-proxy-acme',
    ];

    const found = knownContainers.filter((name) =>
      message.toLowerCase().includes(name.toLowerCase()),
    );

    return found;
  }

  private static truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength - 3)}...`;
  }
}
