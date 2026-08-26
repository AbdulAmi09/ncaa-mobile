import { Redirect, useLocalSearchParams } from 'expo-router';

// Landing target for App Links: tapping a app.ncaaweb.com.ng/dashboard/...
// link on a phone that has the app installed opens this instead of the
// browser (see android.intentFilters in app.json), and this maps the
// web app's URL shape onto this app's own route names.
function mapDashboardPath(segments: string[]): string {
  const [first, second, third] = segments;
  switch (first) {
    case 'tournament-assignment':
      return '/assignments';
    case 'payments':
      if (second && third === 'receipt') return `/payments/${second}`;
      return '/payments';
    case 'chat':
      return '/chat';
    case 'notifications':
      return '/notifications';
    case 'profile':
    case 'settings':
      return '/profile';
    default:
      return '/';
  }
}

export default function DashboardLinkRedirect() {
  const { path } = useLocalSearchParams<{ path: string[] }>();
  const segments = Array.isArray(path) ? path : path ? [path] : [];
  return <Redirect href={mapDashboardPath(segments) as any} />;
}
