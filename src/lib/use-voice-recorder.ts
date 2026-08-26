import { AudioModule, RecordingPresets, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { useState } from 'react';

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 200);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError('Microphone access is needed to record a voice message.');
      return false;
    }
    await AudioModule.setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    return true;
  }

  async function stop() {
    await recorder.stop();
    return { uri: recorder.uri, durationSeconds: state.durationMillis / 1000 };
  }

  function cancel() {
    recorder.stop();
  }

  return {
    isRecording: state.isRecording,
    durationSeconds: state.durationMillis / 1000,
    error,
    start,
    stop,
    cancel,
  };
}
