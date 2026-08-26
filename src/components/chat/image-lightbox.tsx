import { Ionicons } from '@expo/vector-icons';
import { Image, Modal, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ImageLightbox({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <SafeAreaView style={styles.closeWrap}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </SafeAreaView>
        {!!uri && <Image source={{ uri }} style={styles.image} resizeMode="contain" />}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  closeWrap: { position: 'absolute', top: 0, right: 0, zIndex: 1 },
  closeButton: { padding: 16 },
  image: { flex: 1, width: '100%' },
});
