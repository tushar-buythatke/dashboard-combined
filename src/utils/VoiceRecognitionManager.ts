// src/utils/VoiceRecognitionManager.ts

// 1. Helper for Environment Checks
const checkDocument: boolean = typeof document !== 'undefined' && typeof window !== 'undefined';
const userAgent: string | null = checkDocument ? navigator.userAgent : null;

const getMobileOperatingSystem = () => {
    if (checkDocument && userAgent) {
        if (userAgent.match(/iPad/i) || userAgent.match(/iPhone/i) || userAgent.match(/iPod/i)) {
            return 'iOS';
        }
        if (userAgent.match(/Android/i)) {
            return 'Android';
        }
        if (userAgent.match(/Windows Phone/i)) {
            return 'Windows Phone';
        }
    }
    return false;
};

// 2. Interfaces (Kept exactly as provided)
export interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    serviceURI?: string;
    onstart: (() => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onnomatch: ((event: SpeechRecognitionEvent) => void) | null;
    onsoundstart: ((event: Event) => void) | null;
    onsoundend: ((event: Event) => void) | null;
    onspeechstart: ((event: Event) => void) | null;
    onspeechend: ((event: Event) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

export interface VoiceRecognitionConfig {
    isRecording: boolean;
    isVoiceSupported: boolean;
    isTranslationSupported: boolean;
    recognition: SpeechRecognition | null;
}

export interface VoiceRecognitionCallbacks {
    onTranscript: (transcript: string) => void;
    onError?: (error: string) => void;
    onStart?: () => void;
    onEnd?: () => void;
}

// 3. The Main Logic Class
export class VoiceRecognitionManager {
    private config: VoiceRecognitionConfig;
    private callbacks: VoiceRecognitionCallbacks;

    constructor(callbacks: VoiceRecognitionCallbacks) {
        this.config = {
            isRecording: false,
            isVoiceSupported: false,
            isTranslationSupported: false,
            recognition: null,
        };
        this.callbacks = callbacks;
    }

    public get isRecording(): boolean {
        return this.config.isRecording;
    }

    public get isVoiceSupported(): boolean {
        return this.config.isVoiceSupported;
    }

    // ... (Permission Logic) ...
    private checkMicrophonePermission = async (): Promise<boolean> => {
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isBrave = this.isBraveBrowser();

        if (isBrave) return false;
        if (isSafari) return true;

        try {
            if (navigator.permissions) {
                const permission = await navigator.permissions.query({
                    name: 'microphone' as PermissionName,
                });
                return permission.state === 'granted';
            }
            return true;
        } catch {
            return true;
        }
    };

    private requestMicrophonePermission = async (): Promise<boolean> => {
        const platform = getMobileOperatingSystem();
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isBrave = this.isBraveBrowser();

        if (isBrave) {
            this.showBraveNotSupportedAlert();
            return false;
        }
        if (isSafari) return true;

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia not supported');
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error: any) {
            const errorName = error.name;
            if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
                this.showPermissionDeniedAlert(platform);
            } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
                this.showNoMicrophoneAlert(platform);
            } else if (errorName === 'NotSupportedError') {
                this.showNotSupportedAlert(platform);
            } else {
                this.showGenericPermissionAlert(platform);
            }
            return false;
        }
    };

    // ... (Alert Logic - Kept original messages) ...
    private showBraveNotSupportedAlert = () => {
        window.alert('🚫 Voice Search Not Available in Brave Browser\n\nPlease switch to Chrome, Firefox, or Safari.');
    };

    private showPermissionDeniedAlert = (platform: string | false) => {
        window.alert('🔒 Microphone Access Denied\n\nPlease check your browser settings and allow microphone access.');
    };

    private showNoMicrophoneAlert = (platform: string | false) => {
        window.alert('🎤 No Microphone Found\n\nPlease ensure your device has a working microphone.');
    };

    private showNotSupportedAlert = (platform: string | false) => {
        window.alert('❌ Voice Search Not Supported\n\nPlease use a modern browser like Chrome, Firefox, or Safari.');
    };

    private showGenericPermissionAlert = (platform: string | false) => {
        window.alert('⚠️ Microphone Permission Required\n\nPlease allow microphone access.');
    };

    // ... (Browser Detection Helpers) ...
    private getIOSVersion = (): number | null => {
        const isIOS = getMobileOperatingSystem() === 'iOS';
        if (!isIOS) return null;
        const match = navigator.userAgent.match(/OS (\d+)_/);
        return match ? parseInt(match[1], 10) : null;
    };

    private getSafariVersion = (): number | null => {
        const match = navigator.userAgent.match(/Version\/(\d+\.\d+)/);
        return match ? parseFloat(match[1]) : null;
    };

    private isBraveBrowser = (): boolean => {
        if (navigator.userAgent.includes('Brave')) return true;
        if ((navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function') return true;
        return false;
    };

    private isSafariSupported = (): boolean => {
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (!isSafari) return true;
        const safariVersion = this.getSafariVersion();
        return safariVersion ? safariVersion >= 14.1 : false;
    };

    private isIOSVersionSupported = (): boolean => {
        const iosVersion = this.getIOSVersion();
        return iosVersion ? iosVersion >= 14 : false;
    };

    public getVoiceSearchTooltip = (): string => {
        if (this.config.isRecording) return 'Stop Recording';
        if (!this.config.isVoiceSupported) return 'Voice Search Not Supported';
        return 'Voice Search';
    };

    // ... (Main Initialization) ...
    public initializeVoiceRecognition = (isTranslatorSupported: boolean) => {
        this.config.isTranslationSupported = isTranslatorSupported;

        // Basic checks
        if (this.isBraveBrowser() || (getMobileOperatingSystem() === 'iOS' && !this.isIOSVersionSupported())) {
            this.config.isVoiceSupported = false;
            return;
        }

        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            try {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (SpeechRecognition) {
                    this.config.recognition = new SpeechRecognition();
                    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

                    this.config.recognition!.continuous = false;
                    this.config.recognition!.interimResults = true;
                    this.config.recognition!.lang = isSafari ? 'en-US' : 'auto';

                    this.config.recognition!.onstart = () => {
                        this.config.isRecording = true;
                        console.debug('Voice recording started');
                        this.callbacks.onStart?.();
                    };

                    this.config.recognition!.onresult = (event: SpeechRecognitionEvent) => {
                        let fullTranscript = '';
                        for (let i = 0; i < event.results.length; ++i) {
                            fullTranscript += event.results[i][0].transcript;
                        }

                        if (fullTranscript.trim()) {
                            this.callbacks.onTranscript(fullTranscript);
                        }
                    };

                    this.config.recognition!.onerror = (event: SpeechRecognitionErrorEvent) => {
                        this.config.isRecording = false;
                        console.error('Voice error:', event.error);
                        // Original alerts logic preserved
                        if (event.error === 'not-allowed') {
                            window.alert('Microphone permission denied.');
                        }
                        this.callbacks.onError?.(event.error);
                    };

                    this.config.recognition!.onend = () => {
                        this.config.isRecording = false;
                        this.callbacks.onEnd?.();
                    };

                    this.config.isVoiceSupported = true;
                }
            } catch (e) {
                console.error(e);
                this.config.isVoiceSupported = false;
            }
        } else {
            this.config.isVoiceSupported = false;
        }
    };

    public startVoiceRecording = async () => {
        if (this.isBraveBrowser()) {
            this.showBraveNotSupportedAlert();
            return;
        }

        if (!this.config.isVoiceSupported) {
            window.alert('Voice recognition is not supported in this browser.');
            return;
        }

        if (this.config.isRecording) {
            this.stopVoiceRecording();
            return;
        }

        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        if (!isSafari) {
            const hasPermission = await this.checkMicrophonePermission();
            if (!hasPermission) {
                const granted = await this.requestMicrophonePermission();
                if (!granted) return;
            }
        }

        try {
            // Ensure recognition is not already running
            if (this.config.recognition) {
                // Try to stop any existing recognition first
                try {
                    this.config.recognition.abort();
                } catch (e) {
                    // Ignore abort errors
                }

                // Small delay to ensure clean state
                await new Promise(resolve => setTimeout(resolve, 100));

                // Now start fresh
                this.config.recognition.start();
            }
        } catch (e: any) {
            console.error('Voice recognition start error:', e);

            // If it's an "already started" error, try to recover
            if (e.message && e.message.includes('already')) {
                try {
                    this.config.recognition?.abort();
                    await new Promise(resolve => setTimeout(resolve, 150));
                    this.config.recognition?.start();
                } catch (retryError) {
                    this.callbacks.onError?.('Failed to start voice recognition. Please try again.');
                }
            } else {
                this.callbacks.onError?.('Error starting voice recognition. Please refresh.');
            }
        }
    };

    public stopVoiceRecording = () => {
        if (this.config.recognition && this.config.isRecording) {
            this.config.recognition.stop();
        }
    };

    public destroy = () => {
        this.stopVoiceRecording();
        this.config.recognition = null;
    };
}
