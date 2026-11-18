export function validatePasswordChange(password: string, confirmation: string): string | null {
  if (password.length < 12) return 'Use at least 12 characters for your new password.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return 'Include at least one lowercase and one uppercase letter.';
  }
  if (!/\d/.test(password)) return 'Include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Include at least one symbol.';
  if (password !== confirmation) return 'The password and confirmation do not match.';
  return null;
}

export function hasPasswordRecoverySession(
  isPasswordRecovery: boolean,
  recoveryUserId: string | null,
  authenticatedUserId: string
): boolean {
  return isPasswordRecovery && Boolean(recoveryUserId) && recoveryUserId === authenticatedUserId;
}
