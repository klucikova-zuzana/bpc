// Pure helpers for the setup script, kept separate so they can be tested
// without wrangler. SCRUM-93.

const EMAIL = /^[^\s@']+@[^\s@']+\.[^\s@']+$/;
const MIN_PASSWORD_LENGTH = 12;

export function validateEmail(email) {
  if (!email || !EMAIL.test(email)) {
    throw new Error(`SUPER_ADMIN_EMAIL is missing or not a valid e-mail address: ${email ?? '(unset)'}`);
  }
}

export function validatePassword(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`SUPER_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }
}

export function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_');
}

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;

export const SELECT_SUPER_ADMIN_SQL = "SELECT email FROM users WHERE role = 'SUPER_ADMIN'";

// Inserts the Super Admin only if none exists yet, so running setup twice is safe.
// The unique index users_one_super_admin enforces the same rule in the database.
export function insertSuperAdminSql({ email, passwordHash }) {
  return `INSERT INTO users (organisation_id, email, first_name, last_name, role, password_hash, must_change_password, status)
SELECT NULL, ${quote(email)}, 'Super', 'Admin', 'SUPER_ADMIN', ${quote(passwordHash)}, 1, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'SUPER_ADMIN');`;
}
