import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type Profile = {
  first_name: string | null;
  last_name: string | null;
  arbiter_level: string | null;
  license_number: string | null;
};

export default function ProfileScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    supabase
      .from('profiles')
      .select('first_name, last_name, arbiter_level, license_number')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setProfile(data ?? null);
        setLoading(false);
      });
  }, [session?.user.id]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">My profile</ThemedText>

          {loading ? (
            <ActivityIndicator style={styles.spacing} />
          ) : (
            <ThemedView type="backgroundElement" style={[styles.card, styles.spacing]}>
              <ProfileRow label="Name" value={`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()} />
              <ProfileRow label="Email" value={session?.user.email ?? ''} />
              <ProfileRow label="Arbiter level" value={profile?.arbiter_level ?? 'Not set'} />
              <ProfileRow label="License number" value={profile?.license_number ?? 'Not set'} last />
            </ThemedView>
          )}

          <ThemedText themeColor="textSecondary" style={styles.spacing}>
            To change your details, use the NCAA website on a computer for now.
          </ThemedText>

          <ThemedView style={styles.spacing}>
            <BigButton label="Sign out" variant="secondary" onPress={handleSignOut} loading={signingOut} />
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ProfileRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <ThemedView style={!last && styles.rowSpacing}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText>{value || '—'}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  card: { borderRadius: 16, padding: Spacing.four },
  spacing: { marginTop: Spacing.four },
  rowSpacing: { marginBottom: Spacing.three },
});
