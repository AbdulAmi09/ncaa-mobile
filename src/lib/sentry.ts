import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// No-ops (not just "doesn't crash" but genuinely does nothing) until a real
// DSN is set -- there's no Sentry project for this app yet. Set
// EXPO_PUBLIC_SENTRY_DSN once one exists and this starts reporting with no
// other code changes needed.
Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
});

export { Sentry };
