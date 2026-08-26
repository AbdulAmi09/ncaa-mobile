import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// No-ops (not just "doesn't crash" but genuinely does nothing) at runtime
// until a real DSN is set -- there's no Sentry project for this app yet.
// Set EXPO_PUBLIC_SENTRY_DSN once one exists and this starts reporting
// with no other code changes needed.
//
// That alone doesn't cover build time, though: the Sentry Gradle plugin
// this package's Expo config plugin wires in tries to upload source maps
// on every release build regardless of the runtime DSN, and fails the
// whole build without a real Sentry org/auth token
// ("An organization ID or slug is required (provide with --org)") -- hit
// this for real on 2026-08-26. SENTRY_DISABLE_AUTO_UPLOAD=true is set as
// an EAS env var (all three environments) to skip that upload step until
// there's an actual Sentry account to upload to. Remove that env var once
// EXPO_PUBLIC_SENTRY_DSN (and SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN
// for the upload step) are configured for real.
Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
});

export { Sentry };
