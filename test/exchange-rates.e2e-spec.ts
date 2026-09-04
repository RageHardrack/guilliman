import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

describe('ExchangeRatesController (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Create or find a test user and generate JWT token
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'test-rates@lascar.dev',
          password: 'hashed_password_placeholder',
          name: 'Rates Test User',
          role: 'ADMIN',
        },
      });
    }
    jwtToken = jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should get current exchange rates from GET /api/v1/exchange-rates', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/exchange-rates',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.baseCurrency).toBe('USD');
    expect(body.rates).toBeDefined();
    expect(body.rates.USD).toBe(1);
    expect(typeof body.rates.PEN).toBe('number');
    expect(typeof body.rates.VES).toBe('number');
    expect(body.sources).toBeDefined();
  });

  it('should trigger sync with POST /api/v1/exchange-rates/sync', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/exchange-rates/sync',
      headers: {
        authorization: `Bearer ${jwtToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.synced).toBeDefined();
    expect(body.timestamp).toBeDefined();

    // Verify persisted in DB
    const ratesInDb = await prisma.exchangeRate.findMany();
    expect(ratesInDb.length).toBeGreaterThanOrEqual(1);
  });
});
