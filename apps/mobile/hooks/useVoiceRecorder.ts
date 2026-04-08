import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { hermesClient } from '@/services/api/hermesClient';
import { config } from '@/constants/config';

interface VoiceRecorderState {
  isRecording: boolean;
  duration: number;
  error: string | null;
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    duration: 0,
    error: null,
  });
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Request permission
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setState((s) => ({ ...s, error: 'Permission microphone refusée' }));
        return;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recordingOptions = Platform.select({
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          ios: {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
            extension: '.m4a',
            outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 128000,
          },
        },
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          android: {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 128000,
          },
        },
        default: Audio.RecordingOptionsPresets.HIGH_QUALITY,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();

      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      setState({ isRecording: true, duration: 0, error: null });

      // Update duration timer
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setState((s) => ({ ...s, duration: elapsed }));

        // Auto-stop at max duration
        if (elapsed >= config.maxRecordingDurationMs) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      setState((s) => ({
        ...s,
        isRecording: false,
        error: err instanceof Error ? err.message : 'Erreur d\'enregistrement',
      }));
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!recordingRef.current) {
      setState((s) => ({ ...s, isRecording: false }));
      return null;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      setState({ isRecording: false, duration: 0, error: null });

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (!uri) return null;

      // Transcribe
      const result = await hermesClient.transcribeAudio(uri);
      return result.text;
    } catch (err) {
      setState((s) => ({
        ...s,
        isRecording: false,
        error: err instanceof Error ? err.message : 'Erreur de transcription',
      }));
      return null;
    }
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
  };
}
