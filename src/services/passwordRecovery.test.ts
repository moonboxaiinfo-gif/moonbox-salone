import { describe, expect, it } from 'vitest';
import { hasPasswordRecoverySession, validatePasswordChange } from './passwordRecovery';

describe('password recovery validation', () => {
  it('requires a strong password and matching confirmation', () => {
    expect(validatePasswordChange('StrongPassword9!', 'StrongPassword9!')).toBeNull();
    expect(validatePasswordChange('weak', 'weak')).toContain('12 characters');
    expect(validatePasswordChange('StrongPassword9!', 'StrongPassword8!')).toContain('do not match');
    expect(validatePasswordChange('strongpassword9!', 'strongpassword9!')).toContain('uppercase');
    expect(validatePasswordChange('StrongPassword!', 'StrongPassword!')).toContain('number');
    expect(validatePasswordChange('StrongPassword9', 'StrongPassword9')).toContain('symbol');
  });

  it('accepts recovery only for the authenticated user bound to recovery mode', () => {
    expect(hasPasswordRecoverySession(true, 'user-1', 'user-1')).toBe(true);
    expect(hasPasswordRecoverySession(false, 'user-1', 'user-1')).toBe(false);
    expect(hasPasswordRecoverySession(true, 'user-1', 'user-2')).toBe(false);
    expect(hasPasswordRecoverySession(true, null, 'user-1')).toBe(false);
  });
});
