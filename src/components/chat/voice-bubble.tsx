import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VoiceBubble({ uri, isOwn, fallbackDuration }: { uri: string; isOwn: boolean; fallbackDuration: number }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const color = isOwn ? '#fff' : undefined;

  const duration = status.duration || fallbackDuration;
  const position = status.currentTime || 0;

  function toggle() {
    if (status.playing) player.pause();
    else player.play();
  }

  return (
    <Pressable onPress={toggle} style={styles.row}>
      <Ionicons name={status.playing ? 'pause-circle' : 'play-circle'} size={32} color={color ?? '#4F46E5'} />
      <ThemedText type="small" style={color ? { color } : undefined}>
        {formatDuration(status.playing || position > 0 ? position : duration)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minWidth: 120 },
});
