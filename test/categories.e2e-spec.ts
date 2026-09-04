import { Test, TestingModule } from '@nestjs/testing';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

describe('CategoriesController (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let testUserId: string;

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

    // Find or create a test user to respect foreign keys
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'test-e2e-categories@lascar.dev',
          password: 'hashed_password_placeholder',
          name: 'E2E Test User',
          role: 'ADMIN',
        },
      });
    }
    testUserId = user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should complete the full category lifecycle with budgetGroup against real PostgreSQL', async () => {
    // 1. Create Category with budgetGroup: 'NEEDS'
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      payload: {
        userId: testUserId,
        name: 'Supermercado y Despensa E2E',
        type: 'EXPENSE',
        icon: 'i-heroicons-shopping-cart',
        color: '#10B981',
        budgetGroup: 'NEEDS',
      },
    });

    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.payload);
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Supermercado y Despensa E2E');
    expect(created.budgetGroup).toBe('NEEDS');
    expect(created.type).toBe('EXPENSE');

    const categoryId = created.id;

    // 2. Fetch by User ID
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/categories?userId=${testUserId}`,
    });

    expect(listRes.statusCode).toBe(200);
    const categories = JSON.parse(listRes.payload);
    expect(Array.isArray(categories)).toBe(true);
    const foundInList = categories.find(
      (c: { id: string }) => c.id === categoryId,
    );
    expect(foundInList).toBeDefined();
    expect(foundInList.budgetGroup).toBe('NEEDS');

    // 3. Fetch by ID
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/categories/${categoryId}`,
    });

    expect(getRes.statusCode).toBe(200);
    const fetched = JSON.parse(getRes.payload);
    expect(fetched.id).toBe(categoryId);
    expect(fetched.budgetGroup).toBe('NEEDS');

    // 4. Update Category (switch budgetGroup to 'WANTS')
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/categories/${categoryId}`,
      payload: {
        name: 'Restaurantes y Salidas E2E',
        type: 'EXPENSE',
        budgetGroup: 'WANTS',
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.payload);
    expect(updated.name).toBe('Restaurantes y Salidas E2E');
    expect(updated.budgetGroup).toBe('WANTS');

    // 5. Delete Category
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/categories/${categoryId}`,
    });

    expect(deleteRes.statusCode).toBe(200);
    const deletePayload = JSON.parse(deleteRes.payload);
    expect(deletePayload.success).toBe(true);

    // 6. Verify Deletion in DB
    const verifyGetRes = await app.inject({
      method: 'GET',
      url: `/api/v1/categories/${categoryId}`,
    });
    expect(verifyGetRes.statusCode).toBe(200);
    expect(JSON.parse(verifyGetRes.payload)).toBeNull();
  });
});
