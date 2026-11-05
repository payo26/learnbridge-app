# LearnBridge v8.0.3

## Password recovery

- Adds **Forgot your password?** to every LearnBridge sign-in card.
- Emails a reset link through the configured SMTP provider.
- Uses a 256-bit random token and stores only its SHA-256 hash.
- Expires reset links after 30 minutes and invalidates them after one use.
- Returns the same request response whether or not an account exists.
- Rate limits requests by connection and hashed email address.
- Invalidates all existing sessions after a successful reset.
- Sends a password-change notification without including the password.
- Adds `passwordRecoveryConfigured` to `/api/health` and `/api/config`.

## Preserved v8.0.2 fixes

- Native MathML stacked fractions and aligned mathematical brackets.
- Automatic Azure OpenAI `/openai/v1` endpoint normalization.
- Existing Nigerian and British curricula, Paystack subscriptions, school licensing, cached lessons and illustration rendering.
