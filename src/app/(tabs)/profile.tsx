import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { pickAndUploadAvatar } from '@/lib/avatar';
import { supabase } from '@/lib/supabase';
import { type ThemeOverride, useThemeOverride } from '@/lib/theme-override-context';

type Profile = {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  arbiter_level: string | null;
  license_number: string | null;
  rating: number | null;
  tournaments_officiated: number | null;
  fide_id: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bio: string | null;
};

const EDITABLE_FIELDS = ['fide_id', 'phone', 'city', 'state', 'country', 'bio'] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

const FIELD_LABELS: Record<EditableField, string> = {
  fide_id: 'FIDE ID',
  phone: 'Phone number',
  city: 'City',
  state: 'State',
  country: 'Country',
  bio: 'Bio',
};

export default function ProfileScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<EditableField, string>>({
    fide_id: '',
    phone: '',
    city: '',
    state: '',
    country: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const { override, setOverride } = useThemeOverride();

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      supabase
        .from('profiles')
        .select(
          'first_name, last_name, avatar_url, arbiter_level, license_number, rating, tournaments_officiated, fide_id, phone, city, state, country, bio',
        )
        .eq('id', userId)
        .single(),
      supabase.from('notification_preferences').select('email_notifications').eq('user_id', userId).maybeSingle(),
    ]).then(([profileRes, prefsRes]) => {
      const p = profileRes.data as Profile | null;
      setProfile(p ?? null);
      if (p) {
        setDraft({
          fide_id: p.fide_id ?? '',
          phone: p.phone ?? '',
          city: p.city ?? '',
          state: p.state ?? '',
          country: p.country ?? '',
          bio: p.bio ?? '',
        });
      }
      if (prefsRes.data) setEmailNotifications(prefsRes.data.email_notifications);
      setLoading(false);
    });
  }, [userId]);

  async function handleAvatarPress() {
    if (!userId) return;
    setUploadingAvatar(true);
    const { url, error } = await pickAndUploadAvatar(userId);
    setUploadingAvatar(false);
    if (error) setErrorText(error);
    else if (url) setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev));
  }

  function startEditing() {
    setErrorText('');
    setEditing(true);
  }

  function cancelEditing() {
    if (profile) {
      setDraft({
        fide_id: profile.fide_id ?? '',
        phone: profile.phone ?? '',
        city: profile.city ?? '',
        state: profile.state ?? '',
        country: profile.country ?? '',
        bio: profile.bio ?? '',
      });
    }
    setEditing(false);
  }

  async function handleSaveProfile() {
    if (!userId) return;
    setSaving(true);
    setErrorText('');
    const { error } = await supabase.from('profiles').update(draft).eq('id', userId);
    setSaving(false);
    if (error) {
      setErrorText("Couldn't save your changes. Please try again.");
      return;
    }
    setProfile((prev) => (prev ? { ...prev, ...draft } : prev));
    setEditing(false);
  }

  async function handleToggleEmailNotifications(next: boolean) {
    if (!userId) return;
    setEmailNotifications(next);
    setSavingPrefs(true);
    await supabase.from('notification_preferences').upsert({ user_id: userId, email_notifications: next });
    setSavingPrefs(false);
  }

  async function handleChangePassword() {
    if (!session?.user.email || !currentPassword || !newPassword) return;
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordSuccess(false);

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    });
    if (reauthError) {
      setPasswordSaving(false);
      setPasswordError('Your current password is not correct.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (updateError) {
      setPasswordError("Couldn't change your password. Please try again.");
      return;
    }
    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setTimeout(() => {
      setChangingPassword(false);
      setPasswordSuccess(false);
    }, 1500);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <ThemedView style={styles.flex}>
        <ActivityIndicator style={styles.flex} size="large" />
      </ThemedView>
    );
  }

  const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Arbiter';

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.hero}>
            <Pressable onPress={handleAvatarPress} disabled={uploadingAvatar}>
              <ThemedView type="backgroundSelected" style={styles.avatar}>
                {uploadingAvatar ? (
                  <ActivityIndicator />
                ) : profile?.avatar_url ? (
                  <ThemedView style={styles.avatarImageWrap}>
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                  </ThemedView>
                ) : (
                  <ThemedText type="heading" style={{ color: theme.primary }}>
                    {`${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase() || '?'}
                  </ThemedText>
                )}
                <ThemedView style={[styles.avatarEditBadge, { backgroundColor: theme.primary, borderColor: theme.background }]}>
                  <Ionicons name="camera" size={14} color={theme.primaryText} />
                </ThemedView>
              </ThemedView>
            </Pressable>
            <ThemedText type="title" style={styles.heroName}>
              {fullName}
            </ThemedText>
            {!!profile?.arbiter_level && (
              <ThemedView type="backgroundSelected" style={styles.levelBadge}>
                <ThemedText type="small" style={{ color: theme.primary }}>
                  {profile.arbiter_level}
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>

          {!!errorText && (
            <Card>
              <ThemedText themeColor="danger">{errorText}</ThemedText>
            </Card>
          )}

          <ThemedView style={styles.sectionHeaderRow}>
            <ThemedText type="heading">My details</ThemedText>
            {!editing && (
              <Pressable onPress={startEditing}>
                <ThemedText type="small" style={{ color: theme.primary }}>
                  Edit
                </ThemedText>
              </Pressable>
            )}
          </ThemedView>

          <Card style={styles.detailsCard}>
            <ReadOnlyRow label="Email" value={session?.user.email ?? '—'} />
            {editing ? (
              EDITABLE_FIELDS.map((field) => (
                <ThemedView key={field} style={styles.editField}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {FIELD_LABELS[field]}
                  </ThemedText>
                  <TextInput
                    value={draft[field]}
                    onChangeText={(text) => setDraft((prev) => ({ ...prev, [field]: text }))}
                    placeholder={FIELD_LABELS[field]}
                    placeholderTextColor={theme.textSecondary}
                    multiline={field === 'bio'}
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                  />
                </ThemedView>
              ))
            ) : (
              <>
                <ReadOnlyRow label="FIDE ID" value={profile?.fide_id || 'Not set'} />
                <ReadOnlyRow label="Phone" value={profile?.phone || 'Not set'} />
                <ReadOnlyRow
                  label="Location"
                  value={[profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ') || 'Not set'}
                />
                <ReadOnlyRow label="Bio" value={profile?.bio || 'Not set'} last />
              </>
            )}

            {editing && (
              <ThemedView style={styles.editActions}>
                <BigButton label="Save" onPress={handleSaveProfile} loading={saving} />
                <BigButton label="Cancel" variant="secondary" onPress={cancelEditing} disabled={saving} />
              </ThemedView>
            )}
          </Card>

          <ThemedText type="heading" style={styles.sectionSpacing}>
            Arbiter record
          </ThemedText>
          <Card>
            <ReadOnlyRow label="Arbiter level" value={profile?.arbiter_level || 'Not set'} />
            <ReadOnlyRow label="License number" value={profile?.license_number || 'Not set'} />
            <ReadOnlyRow label="Tournaments officiated" value={String(profile?.tournaments_officiated ?? 0)} />
            <ReadOnlyRow label="Rating" value={profile?.rating ? String(profile.rating) : 'Not set'} last />
            <ThemedText themeColor="textSecondary" type="small" style={styles.lockedNote}>
              These are set by an administrator and can't be changed here.
            </ThemedText>
          </Card>

          <ThemedText type="heading" style={styles.sectionSpacing}>
            Preferences
          </ThemedText>
          <Card style={styles.detailsCard}>
            <ThemedView style={styles.toggleRow}>
              <ThemedView style={styles.toggleLabel}>
                <ThemedText type="smallBold">Email notifications</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Get an email when something needs your attention
                </ThemedText>
              </ThemedView>
              <Pressable
                onPress={() => handleToggleEmailNotifications(!emailNotifications)}
                disabled={savingPrefs}
                style={[
                  styles.switchTrack,
                  { backgroundColor: emailNotifications ? theme.primary : theme.border },
                ]}>
                <ThemedView
                  style={[
                    styles.switchThumb,
                    { backgroundColor: '#fff', alignSelf: emailNotifications ? 'flex-end' : 'flex-start' },
                  ]}
                />
              </Pressable>
            </ThemedView>

            <ThemedView>
              <ThemedText type="smallBold" style={styles.appearanceLabel}>
                Appearance
              </ThemedText>
              <ThemedView style={styles.segmentedRow}>
                {(['system', 'light', 'dark'] as ThemeOverride[]).map((opt) => {
                  const active = override === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setOverride(opt)}
                      style={[
                        styles.segment,
                        { backgroundColor: active ? theme.primary : theme.background, borderColor: theme.border },
                      ]}>
                      <ThemedText type="small" style={{ color: active ? theme.primaryText : theme.text }}>
                        {opt === 'system' ? 'Automatic' : opt === 'light' ? 'Light' : 'Dark'}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ThemedView>
            </ThemedView>
          </Card>

          <ThemedText type="heading" style={styles.sectionSpacing}>
            Security
          </ThemedText>
          <Card style={styles.detailsCard}>
            {!changingPassword ? (
              <Pressable onPress={() => setChangingPassword(true)} style={styles.securityRow}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.text} />
                <ThemedText type="smallBold" style={styles.securityRowLabel}>
                  Change password
                </ThemedText>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </Pressable>
            ) : (
              <>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  style={[styles.input, styles.inputSpacing, { borderColor: theme.border, color: theme.text }]}
                />
                {!!passwordError && (
                  <ThemedText themeColor="danger" style={styles.inputSpacing}>
                    {passwordError}
                  </ThemedText>
                )}
                {passwordSuccess && (
                  <ThemedText themeColor="success" style={styles.inputSpacing}>
                    Password changed.
                  </ThemedText>
                )}
                <ThemedView style={styles.editActions}>
                  <BigButton label="Update password" onPress={handleChangePassword} loading={passwordSaving} />
                  <BigButton
                    label="Cancel"
                    variant="secondary"
                    onPress={() => {
                      setChangingPassword(false);
                      setPasswordError('');
                      setCurrentPassword('');
                      setNewPassword('');
                    }}
                    disabled={passwordSaving}
                  />
                </ThemedView>
              </>
            )}
          </Card>

          <ThemedView style={styles.sectionSpacing}>
            <BigButton label="Sign out" variant="secondary" onPress={handleSignOut} loading={signingOut} />
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.versionText}>
            NCAA Arbiters · v{Constants.expoConfig?.version ?? '1.0.0'}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ReadOnlyRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
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
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  hero: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  avatarImageWrap: { width: 88, height: 88, borderRadius: 44, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: { marginTop: Spacing.one },
  levelBadge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: 4 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionSpacing: { marginTop: Spacing.two },
  detailsCard: { gap: Spacing.three },
  rowSpacing: { marginBottom: Spacing.three },
  editField: { gap: Spacing.one },
  input: {
    borderWidth: 2,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: MinTouchTarget,
    fontSize: 18,
  },
  inputSpacing: { marginTop: Spacing.two },
  editActions: { gap: Spacing.two, marginTop: Spacing.one },
  lockedNote: { marginTop: Spacing.one },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  toggleLabel: { flex: 1, gap: 2 },
  switchTrack: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  switchThumb: { width: 22, height: 22, borderRadius: 11 },
  appearanceLabel: { marginBottom: Spacing.two },
  segmentedRow: { flexDirection: 'row', gap: Spacing.two },
  segment: { flex: 1, borderWidth: 1, borderRadius: Radius.input, paddingVertical: Spacing.two, alignItems: 'center' },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: MinTouchTarget },
  securityRowLabel: { flex: 1 },
  versionText: { textAlign: 'center', marginTop: Spacing.two, marginBottom: Spacing.four },
});
