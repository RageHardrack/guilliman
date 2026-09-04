import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import * as crypto from 'crypto';

import { AppModule } from '../src/app.module';
import { DiscordNotificationService } from '../src/discord/services/discord-notification.service';

describe('GithubWebhooks (e2e)', () => {
  let app: NestFastifyApplication;
  const webhookSecret = 'test-e2e-webhook-secret';
  const channelId = '123456789012345678';

  const mockDiscordNotificationService = {
    sendEmbed: vi.fn().mockResolvedValue(true),
  };

  const generateSignature = (payload: string, secret: string): string => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(Buffer.from(payload, 'utf8'));
    return `sha256=${hmac.digest('hex')}`;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DiscordNotificationService)
      .useValue(mockDiscordNotificationService)
      .compile();

    const configService = moduleFixture.get<ConfigService>(ConfigService);
    vi.spyOn(configService, 'get').mockImplementation((key: string) => {
      if (key === 'GITHUB_WEBHOOK_SECRET') return webhookSecret;
      if (key === 'DISCORD_NOTIFICATIONS_CHANNEL_ID') return channelId;
      if (key === 'NODE_ENV') return 'production';
      return null;
    });

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api/v1');

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('Case 1: Valid HMAC signature + workflow_run payload -> 200 OK { status: "processed" }', async () => {
    const payload = JSON.stringify({
      action: 'completed',
      workflow: {
        id: 1,
        name: 'CI Pipeline',
        path: '.github/workflows/ci.yml',
        state: 'active',
      },
      workflow_run: {
        id: 987654321,
        name: 'CI Pipeline',
        node_id: 'node_1',
        head_branch: 'main',
        head_sha: '1234567890abcdef',
        path: '.github/workflows/ci.yml',
        display_title: 'CI test',
        status: 'completed',
        conclusion: 'success',
        html_url:
          'https://github.com/RageHardrack/lascar/actions/runs/987654321',
        run_number: 10,
        event: 'workflow_run',
        created_at: '2026-09-04T12:00:00Z',
        updated_at: '2026-09-04T12:02:00Z',
        run_started_at: '2026-09-04T12:00:00Z',
        actor: { login: 'octocat', id: 1, avatar_url: '', html_url: '' },
        head_commit: {
          id: '1234567890abcdef',
          message: 'feat: add awesome feature',
          timestamp: '2026-09-04T12:00:00Z',
          author: { name: 'octocat', email: 'octo@github.com' },
        },
        repository: {
          id: 1,
          name: 'lascar',
          full_name: 'RageHardrack/lascar',
          html_url: 'https://github.com/RageHardrack/lascar',
          private: false,
        },
      },
      repository: {
        id: 1,
        name: 'lascar',
        full_name: 'RageHardrack/lascar',
        html_url: 'https://github.com/RageHardrack/lascar',
        private: false,
      },
      sender: { login: 'octocat', id: 1, avatar_url: '', html_url: '' },
    });

    const signature = generateSignature(payload, webhookSecret);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/github',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'workflow_run',
        'x-hub-signature-256': signature,
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body).toEqual({ status: 'processed' });
    expect(mockDiscordNotificationService.sendEmbed).toHaveBeenCalledTimes(1);
  });

  it('Case 2: Invalid HMAC signature -> 401 Unauthorized', async () => {
    const payload = JSON.stringify({ action: 'completed' });
    const invalidSignature =
      'sha256=1111111111111111111111111111111111111111111111111111111111111111';

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/github',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'workflow_run',
        'x-hub-signature-256': invalidSignature,
      },
      payload,
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe('Invalid webhook signature');
  });

  it('Case 3: Missing signature header -> 401 Unauthorized', async () => {
    const payload = JSON.stringify({ action: 'completed' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/github',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'workflow_run',
      },
      payload,
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe('Missing or invalid X-Hub-Signature-256 header');
  });

  it('Case 4: Non-workflow event (e.g. push) -> 200 OK { status: "ignored" }', async () => {
    const payload = JSON.stringify({ ref: 'refs/heads/main', commits: [] });
    const signature = generateSignature(payload, webhookSecret);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/github',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-hub-signature-256': signature,
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body).toEqual({ status: 'ignored', event: 'push' });
    expect(mockDiscordNotificationService.sendEmbed).not.toHaveBeenCalled();
  });
});
