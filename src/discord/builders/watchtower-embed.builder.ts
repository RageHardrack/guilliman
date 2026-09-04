import { EmbedBuilder } from 'discord.js';

import { DISCORD_EMBED_COLORS } from '../types/discord.types';
import { WatchtowerWebhookPayload } from '../../webhooks/types/watchtower-webhook.types';

export class WatchtowerEmbedBuilder {
  public static build(payload: WatchtowerWebhookPayload): EmbedBuilder {
    const isFailure =
      payload.status === 'failed' ||
      payload.status === 'error' ||
      (payload.message && /error|failed|failure/i.test(payload.message));

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
      payload.message || payload.title || 'Actualización de contenedores completada con éxito.',
      500,
    );

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(cleanMessage)
      .setTimestamp(payload.timestamp ? new Date(payload.timestamp) : new Date())
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
