import { describe, expect, it } from 'vitest';

import { isSwaggerEnabled } from './swagger';

describe('isSwaggerEnabled', () => {
  it('is disabled when SWAGGER_ENABLED is unset', () => {
    expect(isSwaggerEnabled({})).toBe(false);
  });

  it('is disabled in production when the flag is unset', () => {
    expect(isSwaggerEnabled({ NODE_ENV: 'production' })).toBe(false);
  });

  it('is enabled only when SWAGGER_ENABLED is exactly "true"', () => {
    expect(isSwaggerEnabled({ SWAGGER_ENABLED: 'true' })).toBe(true);
  });

  it.each(['false', '1', 'TRUE', 'yes', ''])(
    'is disabled when SWAGGER_ENABLED is %j',
    (value) => {
      expect(isSwaggerEnabled({ SWAGGER_ENABLED: value })).toBe(false);
    },
  );
});
