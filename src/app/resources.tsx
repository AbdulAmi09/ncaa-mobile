import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type ResourceRow, fetchResources, formatFileSize } from '@/lib/resources';

function iconFor(fileType: string | null): keyof typeof Ionicons.glyphMap {
  const type = (fileType ?? '').toLowerCase();
  if (type.includes('pdf')) return 'document-text';
  if (type.includes('image') || type.includes('jpg') || type.includes('png')) return 'image';
  if (type.includes('video')) return 'videocam';
  return 'document';
}

export default function ResourcesScreen() {
  const theme = useTheme();
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await fetchResources();
    if (error) setErrorText('We could not load resources. Pull down to try again.');
    else setErrorText('');
    setResources((data as ResourceRow[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => r.category && set.add(r.category));
    return ['all', ...Array.from(set)];
  }, [resources]);

  const visible = category === 'all' ? resources : resources.filter((r) => r.category === category);

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        {loading ? (
          <ActivityIndicator style={styles.flex} size="large" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            {!!errorText && (
              <Card>
                <ThemedText themeColor="danger">{errorText}</ThemedText>
              </Card>
            )}

            {categories.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {categories.map((c) => {
                  const active = category === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCategory(c)}
                      style={[
                        styles.filterChip,
                        { borderColor: theme.border, backgroundColor: active ? theme.primary : theme.backgroundElement },
                      ]}>
                      <ThemedText type="smallBold" style={{ color: active ? theme.primaryText : theme.text }}>
                        {c === 'all' ? 'All' : c}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {visible.length === 0 && !errorText && (
              <Card>
                <ThemedText themeColor="textSecondary">No resources here yet.</ThemedText>
              </Card>
            )}

            {visible.map((resource) => (
              <Pressable
                key={resource.id}
                onPress={() => resource.file_url && WebBrowser.openBrowserAsync(resource.file_url)}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
                <Card style={styles.row}>
                  <ThemedView type="backgroundSelected" style={styles.iconWrap}>
                    <Ionicons name={iconFor(resource.file_type)} size={20} color={theme.primary} />
                  </ThemedView>
                  <ThemedView style={styles.rowBody}>
                    <ThemedText type="smallBold">{resource.title}</ThemedText>
                    {!!resource.description && (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                        {resource.description}
                      </ThemedText>
                    )}
                    {!!resource.file_size && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatFileSize(resource.file_size)}
                      </ThemedText>
                    )}
                  </ThemedView>
                  <Ionicons name="download-outline" size={20} color={theme.textSecondary} />
                </Card>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
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
  filterRow: { gap: Spacing.two, paddingVertical: Spacing.half },
  filterChip: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
});
