export type PasswordValidationResult = {
  valid: boolean;
  errors: string[];
};

const SPECIAL_CHARACTER_PATTERN = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/;

export function validatePasswordPolicy(
  password: string
): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must include at least 1 uppercase letter.');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must include at least 1 lowercase letter.');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must include at least 1 digit.');
  }

  if (!SPECIAL_CHARACTER_PATTERN.test(password)) {
    errors.push(
      'Password must include at least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?).'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
