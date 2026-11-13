import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import * as crypto from 'crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GithubSignatureGuard } from './github-signature.guard';

describe('GithubSignatureGuard', () => {
  let guard: GithubSignatureGuard;
  let configService: ConfigService;
  const secret = 'test-webhook-secret-12345';

  const createMockContext = (
    headers: Record<string, string>,
    body: any,
    rawBody?: Buffer | string,
  ): ExecutionContext => {
    const request = {
      headers,
      body,
      rawBody,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  const generateSignature = (
    payload: string | Buffer,
    secretKey: string,
  ): string => {
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    configService = {
      get: vi.fn(),
    } as unknown as ConfigService;
  });

  it('should allow request with valid HMAC SHA-256 signature matching raw body', () => {
    vi.mocked(configService.get).mockImplementation((key: string) => {
      if (key === 'GITHUB_WEBHOOK_SECRET') return secret;
      if (key === 'NODE_ENV') return 'production';
      return null;
    });

    guard = new GithubSignatureGuard(configService);

    const payload = JSON.stringify({
      action: 'completed',
      workflow: { name: 'CI' },
    });
    const signature = generateSignature(payload, secret);
    const context = createMockContext(
      { 'x-hub-signature-256': signature },
      JSON.parse(payload),
      Buffer.from(payload, 'utf8'),
    );

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException when signature is invalid', () => {
    vi.mocked(configService.get).mockImplementation((key: string) => {
      if (key === 'GITHUB_WEBHOOK_SECRET') return secret;
      if (key === 'NODE_ENV') return 'production';
      return null;
    });

    guard = new GithubSignatureGuard(configService);

    const payload = JSON.stringify({ action: 'completed' });
    const invalidSignature =
      'sha256=invalidhex0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const context = createMockContext(
      { 'x-hub-signature-256': invalidSignature },
      JSON.parse(payload),
      Buffer.from(payload, 'utf8'),
    );

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when X-Hub-Signature-256 header is missing', () => {
    vi.mocked(configService.get).mockImplementation((key: string) => {
      if (key === 'GITHUB_WEBHOOK_SECRET') return secret;
      if (key === 'NODE_ENV') return 'production';
      return null;
    });

    guard = new GithubSignatureGuard(configService);

    const context = createMockContext({}, { action: 'completed' });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException in production mode if GITHUB_WEBHOOK_SECRET is unset', () => {
    vi.mocked(configService.get).mockImplementation((key: string) => {
      if (key === 'GITHUB_WEBHOOK_SECRET') return undefined;
      if (key === 'NODE_ENV') return 'production';
      return null;
    });

    guard = new GithubSignatureGuard(configService);

    const context = createMockContext(
      { 'x-hub-signature-256': 'sha256=12345' },
      {},
    );
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should allow request in development/test mode when GITHUB_WEBHOOK_SECRET is unset', () => {
    vi.mocked(configService.get).mockImplementation((key: string) => {
      if (key === 'GITHUB_WEBHOOK_SECRET') return undefined;
      if (key === 'NODE_ENV') return 'development';
      return null;
    });

    guard = new GithubSignatureGuard(configService);

    const context = createMockContext({}, { action: 'completed' });
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  describe('with GITHUB_WEBHOOK_SECRET configured', () => {
    const payload = JSON.stringify({ action: 'completed', run: 7 });

    beforeEach(() => {
      vi.mocked(configService.get).mockImplementation((key: string) => {
        if (key === 'GITHUB_WEBHOOK_SECRET') return secret;
        if (key === 'NODE_ENV') return 'production';
        return null;
      });
      guard = new GithubSignatureGuard(configService);
    });

    it('accepts the capitalized X-Hub-Signature-256 header', () => {
      const context = createMockContext(
        { 'X-Hub-Signature-256': generateSignature(payload, secret) },
        JSON.parse(payload),
        Buffer.from(payload, 'utf8'),
      );

      expect(guard.canActivate(context)).toBe(true);
    });

    it('rejects a signature header without the sha256= prefix', () => {
      const bareDigest = generateSignature(payload, secret).slice(7);
      const context = createMockContext(
        { 'x-hub-signature-256': bareDigest },
        JSON.parse(payload),
        Buffer.from(payload, 'utf8'),
      );

      expect(() => guard.canActivate(context)).toThrow(
        'Missing or invalid X-Hub-Signature-256 header',
      );
    });

    it('rejects a full-length digest signed with another secret', () => {
      const context = createMockContext(
        { 'x-hub-signature-256': generateSignature(payload, 'other-secret') },
        JSON.parse(payload),
        Buffer.from(payload, 'utf8'),
      );

      expect(() => guard.canActivate(context)).toThrow(
        'Invalid webhook signature',
      );
    });

    it('rejects a truncated digest', () => {
      const truncated = generateSignature(payload, secret).slice(0, 39);
      const context = createMockContext(
        { 'x-hub-signature-256': truncated },
        JSON.parse(payload),
        Buffer.from(payload, 'utf8'),
      );

      expect(() => guard.canActivate(context)).toThrow(
        'Invalid webhook signature',
      );
    });

    it('rejects a valid signature for a body that was tampered with', () => {
      const context = createMockContext(
        { 'x-hub-signature-256': generateSignature(payload, secret) },
        { action: 'deleted' },
        Buffer.from('{"action":"deleted"}', 'utf8'),
      );

      expect(() => guard.canActivate(context)).toThrow(
        'Invalid webhook signature',
      );
    });

    it('verifies a raw body delivered as a string', () => {
      const context = createMockContext(
        { 'x-hub-signature-256': generateSignature(payload, secret) },
        JSON.parse(payload),
        payload,
      );

      expect(guard.canActivate(context)).toBe(true);
    });

    it('falls back to a Buffer body when there is no raw body', () => {
      const context = createMockContext(
        { 'x-hub-signature-256': generateSignature(payload, secret) },
        Buffer.from(payload, 'utf8'),
      );

      expect(guard.canActivate(context)).toBe(true);
    });

    it('falls back to a string body when there is no raw body', () => {
      const context = createMockContext(
        { 'x-hub-signature-256': generateSignature(payload, secret) },
        payload,
      );

      expect(guard.canActivate(context)).toBe(true);
    });

    it('falls back to the re-serialized JSON body when there is no raw body', () => {
      const context = createMockContext(
        { 'x-hub-signature-256': generateSignature(payload, secret) },
        JSON.parse(payload),
      );

      expect(guard.canActivate(context)).toBe(true);
    });

    it('signs an empty payload when the request has no body', () => {
      const context = createMockContext(
        { 'x-hub-signature-256': generateSignature('', secret) },
        undefined,
      );

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  it('treats an unset NODE_ENV as development when the secret is missing', () => {
    vi.mocked(configService.get).mockReturnValue(undefined);
    guard = new GithubSignatureGuard(configService);

    const context = createMockContext({}, { action: 'completed' });

    expect(guard.canActivate(context)).toBe(true);
  });
});
