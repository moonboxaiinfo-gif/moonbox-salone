import { describe, expect, it } from 'vitest';
import { parseRoute } from './RouterContext';

describe('password recovery routing', () => {
  it('keeps the request and password-update routes separate', () => {
    expect(parseRoute('/forgot-password').route).toBe('forgot-password');
    expect(parseRoute('/reset-password').route).toBe('reset-password');
  });
});
