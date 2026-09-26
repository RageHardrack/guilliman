import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LeonAuthController } from './leon-auth.controller';
import { LeonAuthService } from './leon-auth.service';

describe('LeonAuthController', () => {
  let controller: LeonAuthController;
  let service: LeonAuthService;

  beforeEach(() => {
    service = {
      login: vi.fn().mockResolvedValue({
        accessToken: 'mock-token',
        user: { id: '1', email: 'test@example.com', role: 'USER' },
      }),
    } as unknown as LeonAuthService;

    controller = new LeonAuthController(service);
  });

  it('should call login on LeonAuthService and return token and user', async () => {
    const dto = { email: 'test@example.com', password: 'password123' };
    const result = await controller.login(dto);

    expect(service.login).toHaveBeenCalledWith(dto);
    expect(result.accessToken).toBe('mock-token');
  });
});
