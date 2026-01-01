// src/hooks/useVoiceRecognition.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceRecognitionManager } from '@/utils/VoiceRecognitionManager';

export const useVoiceRecognition = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);

    // We use a ref to keep the manager instance persistent across renders
    const managerRef = useRef<VoiceRecognitionManager | null>(null);

    useEffect(() => {
        // Initialize the manager
        managerRef.current = new VoiceRecognitionManager({
            onTranscript: (text) => {
                setTranscript(text);
            },
            onError: (err) => {
                setError(err);
                setIsRecording(false);
            },
            onStart: () => setIsRecording(true),
            onEnd: () => setIsRecording(false)
        });

        // Setup the internal speech recognition engine
        managerRef.current.initializeVoiceRecognition(false);
        setIsSupported(managerRef.current.isVoiceSupported);

        // Cleanup on unmount
        return () => {
            managerRef.current?.destroy();
        };
    }, []);

    const startRecording = useCallback(async () => {
        if (managerRef.current) {
            setError(null);
            setTranscript(''); // Clear previous
            await managerRef.current.startVoiceRecording();
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (managerRef.current) {
            managerRef.current.stopVoiceRecording();
        }
    }, []);

    return {
        isRecording,
        transcript,
        error,
        isSupported,
        startRecording,
        stopRecording,
        toggleRecording: isRecording ? stopRecording : startRecording,
        tooltip: managerRef.current?.getVoiceSearchTooltip() || 'Voice Search'
    };
};
