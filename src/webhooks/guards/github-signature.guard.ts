import { ConfigService } from '@nestjs/config';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import * as crypto from 'crypto';

@Injectable()
export class GithubSignatureGuard implements CanActivate {
  private readonly logger = new Logger(GithubSignatureGuard.name);

  constructor(private readonly configService: ConfigService) {}

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = this.configService.get<string>('GITHUB_WEBHOOK_SECRET');
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';

    if (!secret) {
      if (nodeEnv === 'production') {
        this.logger.error(
          'GITHUB_WEBHOOK_SECRET is not configured in production environment.',
        );
        throw new UnauthorizedException(
          'GITHUB_WEBHOOK_SECRET is not configured',
        );
      }

      this.logger.warn(
        'GITHUB_WEBHOOK_SECRET is not configured. Allowing webhook request without verification in development/test environment.',
      );
      return true;
    }

    const signatureHeader =
      (request.headers?.['x-hub-signature-256'] as string) ||
      (request.headers?.['X-Hub-Signature-256'] as string);

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

  private extractPayloadBuffer(request: any): Buffer {
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
