import { Test, TestingModule } from '@nestjs/testing';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';

import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it('/ (GET)', () => {
    return app
      .inject({
        method: 'GET',
        url: '/',
      })
      .then((response) => {
        expect(response.statusCode).toBe(200);
        expect(response.payload).toBe('Hello World!');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
