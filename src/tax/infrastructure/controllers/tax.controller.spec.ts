import { ForbiddenException } from '@nestjs/common';

import { describe, expect, it, beforeEach, vi } from 'vitest';

import { TaxService } from '../../tax.service';
import { TaxController } from './tax.controller';

const profile = {
  userId: 'user-1',
  taxProfileEnabled: true,
  taxCountry: 'PE',
  taxRuc: '10705438233',
};

describe('TaxController', () => {
  let controller: TaxController;
  let taxService: {
    getProfile: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    calculateProjection: ReturnType<typeof vi.fn>;
    getDeductibleItems: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    taxService = {
      getProfile: vi.fn().mockResolvedValue(profile),
      updateProfile: vi.fn().mockResolvedValue(profile),
      calculateProjection: vi.fn().mockResolvedValue({ fiscalYear: 2026 }),
      getDeductibleItems: vi.fn().mockResolvedValue([]),
    };

    controller = new TaxController(taxService as unknown as TaxService);
  });

  describe('S5 — the route :userId must match the token user', () => {
    const foreignCases: Array<{
      name: string;
      call: (user: { userId: string }, pathUserId: string) => Promise<unknown>;
      serviceMethod: () => ReturnType<typeof vi.fn>;
    }> = [
      {
        name: 'GET /tax/profile/:userId',
        call: (user, pathUserId) => controller.getProfile(user, pathUserId),
        serviceMethod: () => taxService.getProfile,
      },
      {
        name: 'PATCH /tax/profile/:userId',
        call: (user, pathUserId) =>
          controller.updateProfile(user, pathUserId, { taxCountry: 'PE' }),
        serviceMethod: () => taxService.updateProfile,
      },
      {
        name: 'GET /tax/projection/:userId',
        call: (user, pathUserId) =>
          controller.getProjection(user, pathUserId, '2026'),
        serviceMethod: () => taxService.calculateProjection,
      },
      {
        name: 'GET /tax/deductibles/:userId',
        call: (user, pathUserId) =>
          controller.getDeductibles(user, pathUserId, '2026'),
        serviceMethod: () => taxService.getDeductibleItems,
      },
    ];

    for (const testCase of foreignCases) {
      it(`${testCase.name} answers 403 and never calls the service when :userId differs`, async () => {
        await expect(
          testCase.call({ userId: 'token-user' }, 'other-user'),
        ).rejects.toThrow(ForbiddenException);

        expect(testCase.serviceMethod()).not.toHaveBeenCalled();
      });
    }
  });

  describe('PRESERVE — matching :userId keeps the current behavior', () => {
    it('getProfile forwards the userId', async () => {
      const result = await controller.getProfile(
        { userId: 'user-1' },
        'user-1',
      );

      expect(taxService.getProfile).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(profile);
    });

    it('updateProfile forwards the userId and the dto', async () => {
      await controller.updateProfile({ userId: 'user-1' }, 'user-1', {
        taxCountry: 'PE',
      } as Parameters<TaxService['updateProfile']>[1]);

      expect(taxService.updateProfile).toHaveBeenCalledWith('user-1', {
        taxCountry: 'PE',
      });
    });

    it('getProjection parses the year query and forwards it', async () => {
      await controller.getProjection({ userId: 'user-1' }, 'user-1', '2026');

      expect(taxService.calculateProjection).toHaveBeenCalledWith(
        'user-1',
        2026,
      );
    });

    it('getProjection without year defaults to the current fiscal year', async () => {
      await controller.getProjection({ userId: 'user-1' }, 'user-1');

      expect(taxService.calculateProjection).toHaveBeenCalledWith(
        'user-1',
        new Date().getFullYear(),
      );
    });

    it('getDeductibles parses the year query and forwards it', async () => {
      await controller.getDeductibles({ userId: 'user-1' }, 'user-1', '2026');

      expect(taxService.getDeductibleItems).toHaveBeenCalledWith(
        'user-1',
        2026,
      );
    });

    it('getDeductibles without year defaults to the current fiscal year', async () => {
      await controller.getDeductibles({ userId: 'user-1' }, 'user-1');

      expect(taxService.getDeductibleItems).toHaveBeenCalledWith(
        'user-1',
        new Date().getFullYear(),
      );
    });
  });
});
