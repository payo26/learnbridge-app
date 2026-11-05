import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  RESET_TOKEN_BYTES,
  RESET_TOKEN_MINUTES,
  buildPasswordResetUrl,
  createPasswordResetToken,
  passwordRecoveryConfigured,
} from '../backend/password-email.mjs';

test('creates high-entropy reset tokens and stores a different SHA-256 hash', () => {
  const first = createPasswordResetToken();
  const second = createPasswordResetToken();
  assert.equal(RESET_TOKEN_BYTES, 32);
  assert.equal(RESET_TOKEN_MINUTES, 30);
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.token, first.tokenHash);
  assert.match(first.tokenHash, /^[a-f0-9]{64}$/);
});

test('builds the reset link from the configured origin and keeps the token in the fragment', () => {
  const url = buildPasswordResetUrl('https://learnbridge-app.com/', 'safe_token');
  assert.equal(url, 'https://learnbridge-app.com/#password-reset=safe_token');
  assert.throws(() => buildPasswordResetUrl('http://learnbridge-app.com', 'token'), /HTTPS/);
  assert.equal(buildPasswordResetUrl('http://localhost:8081', 'token'), 'http://localhost:8081/#password-reset=token');
});

test('requires complete SMTP and trusted origin configuration', () => {
  const base = {
    APP_ORIGIN:'https://learnbridge-app.com', SMTP_HOST:'smtp.example.com', SMTP_PORT:'587',
    SMTP_FROM:'LearnBridge <no-reply@example.com>', SMTP_USER:'user', SMTP_PASSWORD:'password',
  };
  assert.equal(passwordRecoveryConfigured(base), true);
  assert.equal(passwordRecoveryConfigured({ ...base, SMTP_PASSWORD:'' }), false);
  assert.equal(passwordRecoveryConfigured({ ...base, APP_ORIGIN:'http://learnbridge-app.com' }), false);
});

test('reset implementation uses generic responses, one-time records and session invalidation', async () => {
  const [platform, schema, portal] = await Promise.all([
    fs.readFile(new URL('../backend/platform.mjs', import.meta.url), 'utf8'),
    fs.readFile(new URL('../database/init.sql', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/CommercialPortal.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS password_reset_tokens/);
  assert.match(platform, /If an active account uses that email address/);
  assert.match(platform, /UPDATE password_reset_tokens SET used_at=NOW\(\)/);
  assert.match(platform, /DELETE FROM sessions WHERE user_id=\$1/);
  assert.match(portal, /Forgot your password\?/);
});
