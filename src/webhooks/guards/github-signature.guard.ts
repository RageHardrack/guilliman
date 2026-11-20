import { ConfigService } from '@nestjs/config';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import * as crypto from 'crypto';

interface WebhookRequest {
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  rawBody?: Buffer | string;
}

@Injectable()
export class GithubSignatureGuard implements CanActivate {
  private readonly logger = new Logger(GithubSignatureGuard.name);

  constructor(private readonly configService: ConfigService) {}

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<WebhookRequest>();
    const secret = this.configService.get<string>('GITHUB_WEBHOOK_SECRET');

    if (!secret) {
      if (this.isUnsignedAllowed()) {
        this.logger.warn(
          'GITHUB_WEBHOOK_SECRET is not configured. GITHUB_WEBHOOK_ALLOW_UNSIGNED=true: accepting the webhook request without verification.',
        );
        return true;
      }

      this.logger.error(
        'GITHUB_WEBHOOK_SECRET is not configured. Rejecting the webhook request; set the secret, or GITHUB_WEBHOOK_ALLOW_UNSIGNED=true for local development.',
      );
      throw new UnauthorizedException(
        'GITHUB_WEBHOOK_SECRET is not configured',
      );
    }

    const signatureHeader = this.readSignatureHeader(request);

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      this.logger.warn(
        'Missing or malformed X-Hub-Signature-256 header in webhook request.',
      );
      throw new UnauthorizedException(
        'Missing or invalid X-Hub-Signature-256 header',
      );
    }

    const signatureHex = signatureHeader.substring(7);

    const payloadBuffer = this.extractPayloadBuffer(request);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadBuffer);
    const expectedDigestHex = hmac.digest('hex');

    const signatureBuffer = Buffer.from(signatureHex, 'hex');
    const expectedDigestBuffer = Buffer.from(expectedDigestHex, 'hex');

    if (
      signatureBuffer.length !== expectedDigestBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedDigestBuffer)
    ) {
      this.logger.warn(
        'GitHub webhook HMAC SHA-256 signature verification failed.',
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }

  /**
   * Skipping verification needs an explicit opt-in and is never honored in
   * production, so a missing secret fails closed by default.
   */
  private isUnsignedAllowed(): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const optIn = this.configService.get<string>(
      'GITHUB_WEBHOOK_ALLOW_UNSIGNED',
    );
    return optIn === 'true' && nodeEnv !== 'production';
  }

  private readSignatureHeader(request: WebhookRequest): string | undefined {
    const value =
      request.headers?.['x-hub-signature-256'] ||
      request.headers?.['X-Hub-Signature-256'];
    return Array.isArray(value) ? value[0] : value;
  }

  private extractPayloadBuffer(request: WebhookRequest): Buffer {
    if (request.rawBody) {
      if (Buffer.isBuffer(request.rawBody)) {
        return request.rawBody;
      }
      return Buffer.from(request.rawBody, 'utf8');
    }

    if (Buffer.isBuffer(request.body)) {
      return request.body;
    }

    if (typeof request.body === 'string') {
      return Buffer.from(request.body, 'utf8');
    }

    if (request.body && typeof request.body === 'object') {
      return Buffer.from(JSON.stringify(request.body), 'utf8');
    }

    return Buffer.from('', 'utf8');
  }
}
