'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Mic, Command, Loader2, Sparkles, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccentTheme } from '@/contexts/AccentThemeContext';
import { generateChatbotResponse, loadChatHistory, saveChatHistory, type ChatMessage, type ChatbotContext } from '@/services/chatbotService';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DashboardChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    context: ChatbotContext;
    featureId?: string; // Use featureId for persistent chat across entire feature
    onUpdateFilters?: (filters: any) => void;
    externalMessage?: string; // Voice search transcript to add to chat
    onExternalMessageProcessed?: () => void; // Callback when external message is processed
}

// Responsive chatbot dimensions
const getChatbotWidth = () => {
    if (typeof window === 'undefined') return 420;
    return window.innerWidth < 768 ? window.innerWidth - 24 : 420; // Mobile: full width minus minimal padding
};

const CHATBOT_HEIGHT = 550; // Optimized height for better screen space
const MINIMIZED_SIZE = 56;
const NAVBAR_HEIGHT = 64;
const RIGHT_PADDING = 0; // NO padding - absolute right edge
const MOBILE_PADDING = 12; // Mobile needs some padding

export function DashboardChatbot({
    isOpen,
    onClose,
    context,
    featureId,
    onUpdateFilters,
    externalMessage,
    onExternalMessageProcessed
}: DashboardChatbotProps) {
    const { t: themeClasses } = useAccentTheme();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [mobileViewport, setMobileViewport] = useState<{ height: number; offsetTop: number } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const {
        isRecording: voiceIsRecording,
        transcript,
        error: voiceError,
        startRecording,
        stopRecording
    } = useVoiceRecognition();

    // Position at bottom right corner when FIRST opened
    useEffect(() => {
        if (!isOpen) return;
        
        // Only set initial position when first opened, don't reset when minimizing
        const chatbotWidth = getChatbotWidth();
        const isMobile = window.innerWidth < 768;
        const chatbotHeight = CHATBOT_HEIGHT;
        
        // Position at BOTTOM RIGHT corner
        const rightX = isMobile ? MOBILE_PADDING : window.innerWidth - chatbotWidth - RIGHT_PADDING;
        const bottomY = window.innerHeight - chatbotHeight - 12; // 12px from bottom
        
        setPosition({ x: rightX, y: bottomY });
        // Don't reset isMinimized here - let it be controlled by button clicks
    }, [isOpen]); // Only run when isOpen changes, not when isMinimized changes

    // Load chat history on mount
    useEffect(() => {
        if (isOpen) {
            const history = loadChatHistory(featureId);
            setMessages(history);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        } else {
            // Clear input when closed
            setInputValue('');
        }
    }, [isOpen, featureId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (!isMinimized && isOpen) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [messages, isMinimized, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (typeof window === 'undefined') return;
        if (window.innerWidth >= 768) return;

        const visualViewport = window.visualViewport;

        const updateViewport = () => {
            setMobileViewport({
                height: visualViewport?.height ?? window.innerHeight,
                offsetTop: visualViewport?.offsetTop ?? 0,
            });
        };

        updateViewport();

        visualViewport?.addEventListener('resize', updateViewport);
        visualViewport?.addEventListener('scroll', updateViewport);
        window.addEventListener('resize', updateViewport);
        window.addEventListener('orientationchange', updateViewport);

        return () => {
            visualViewport?.removeEventListener('resize', updateViewport);
            visualViewport?.removeEventListener('scroll', updateViewport);
            window.removeEventListener('resize', updateViewport);
            window.removeEventListener('orientationchange', updateViewport);
        };
    }, [isOpen]);

    // Handle voice transcript - show in chat input
    useEffect(() => {
        if (transcript && (isRecording || voiceIsRecording)) {
            setInputValue(transcript);
        }
    }, [transcript, isRecording, voiceIsRecording]);

    // Handle external messages from Voice Search (Command K)
    useEffect(() => {
        if (externalMessage && externalMessage.trim()) {
            // Add external message to chat history
            const userMessage: ChatMessage = {
                role: 'user',
                content: externalMessage.trim(),
                timestamp: Date.now()
            };

            const responseMessage: ChatMessage = {
                role: 'assistant',
                content: '✅ Voice command received and filters applied successfully. Check the dashboard for updated data.',
                timestamp: Date.now()
            };

            setMessages(prev => {
                const updated = [...prev, userMessage, responseMessage];
                saveChatHistory(updated, featureId);
                return updated;
            });

            // Notify parent that message was processed
            if (onExternalMessageProcessed) {
                onExternalMessageProcessed();
            }
        }
    }, [externalMessage, featureId, onExternalMessageProcessed]);

    // Escape key to close - only if input is not focused
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            // Only close if input is not focused (to allow normal input behavior)
            const activeElement = document.activeElement;
            if (e.key === 'Escape' && !e.repeat && activeElement !== inputRef.current) {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape, true);
        return () => window.removeEventListener('keydown', handleEscape, true);
    }, [isOpen, onClose]);


    // Handle window resize and dev tools open/close
    useEffect(() => {
        const handleResize = () => {
            if (isMinimized) {
                const maxX = window.innerWidth - MINIMIZED_SIZE - 12;
                const maxY = window.innerHeight - MINIMIZED_SIZE - 12;
                setPosition(prev => ({
                    x: Math.min(prev.x, maxX),
                    y: Math.min(prev.y, Math.max(NAVBAR_HEIGHT + 12, maxY))
                }));
            } else {
                const chatbotWidth = getChatbotWidth();
                const chatbotHeight = CHATBOT_HEIGHT;
                const isMobile = window.innerWidth < 768;
                // Keep at bottom right corner on resize
                const rightX = isMobile ? MOBILE_PADDING : window.innerWidth - chatbotWidth - RIGHT_PADDING;
                const bottomY = window.innerHeight - chatbotHeight - 12;
                setPosition({ x: rightX, y: bottomY });
            }
        };
        
        // Debounce resize to avoid too many updates
        let resizeTimeout: number;
        const debouncedResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = window.setTimeout(handleResize, 100);
        };
        
        window.addEventListener('resize', debouncedResize);
        return () => {
            clearTimeout(resizeTimeout);
            window.removeEventListener('resize', debouncedResize);
        };
    }, [isMinimized, position.y]);

    const handleSend = useCallback(async (message: string) => {
        if (!message.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: message.trim(),
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue(''); // Clear input after sending
        setIsLoading(true);

        try {
            const result = await generateChatbotResponse(message, context, featureId);

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: result.response,
                timestamp: Date.now()
            };

            setMessages(prev => {
                const updated = [...prev, assistantMessage];
                saveChatHistory(updated, featureId);
                return updated;
            });

            // Apply filter updates if provided
            if (result.shouldUpdateFilters && onUpdateFilters) {
                onUpdateFilters(result.shouldUpdateFilters);
            }
        } catch (error: any) {
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: `Sorry, I encountered an error: ${error.message || 'Failed to generate response'}. Please try again.`,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, context, featureId, onUpdateFilters]);

    const handleVoiceToggle = () => {
        if (voiceIsRecording || isRecording) {
            stopRecording();
            setIsRecording(false);
        } else {
            setInputValue(''); // Clear input when starting new recording
            startRecording();
            setIsRecording(true);
        }
    };

    const handleClearInput = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setInputValue('');
        if (voiceIsRecording || isRecording) {
            stopRecording();
            setIsRecording(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Stop propagation to prevent parent handlers from interfering with input
        e.stopPropagation();
        
        // ONLY handle Enter key - let everything else (including Space) work normally
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(inputValue);
        }
        // Shift+Enter for new line works automatically in textarea
        // Space and all other keys work normally - NO preventDefault!
    };


    const handleClose = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        // Immediately close without any position changes
        setIsMinimized(false);
        setInputValue('');
        onClose();
    };

    if (!isOpen) return null;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Minimized state - show button on right side (vertically centered like Voice AI/AI Chat)
    if (isMinimized) {
        const minimizedNode = (
            <div
                ref={containerRef}
                className="fixed pointer-events-auto !z-[999999]"
                style={{
                    right: '16px', // Pin to right edge
                    top: '50%', // Vertically center
                    transform: 'translateY(-50%)', // Center adjustment
                }}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMinimized(false);
                    // Snap back to bottom right corner when expanded
                    const chatbotWidth = getChatbotWidth();
                    const chatbotHeight = CHATBOT_HEIGHT;
                    const rightX = isMobile ? MOBILE_PADDING : window.innerWidth - chatbotWidth - RIGHT_PADDING;
                    const bottomY = window.innerHeight - chatbotHeight - 12;
                    setPosition({ x: rightX, y: bottomY });
                }}
            >
                <button
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-full",
                        "bg-white dark:bg-gray-800",
                        "border-2 border-gray-200/60 dark:border-gray-700/60",
                        "hover:border-gray-300 dark:hover:border-gray-600",
                        "shadow-lg hover:shadow-xl",
                        "transition-all duration-300 cursor-pointer",
                        "hover:scale-105"
                    )}
                >
                    <Sparkles className={cn("h-5 w-5", themeClasses.textPrimary)} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Chat</span>
                </button>
            </div>
        );

        if (isMobile && typeof document !== 'undefined') {
            return createPortal(minimizedNode, document.body);
        }

        return minimizedNode;
    }

    const chatbotWidth = getChatbotWidth();
    const availableHeight = typeof window !== 'undefined' ? window.innerHeight - NAVBAR_HEIGHT - 24 : CHATBOT_HEIGHT;
    const chatbotHeight = Math.min(isMobile ? availableHeight : CHATBOT_HEIGHT, availableHeight);
    const mobileHeight = mobileViewport?.height ?? (typeof window !== 'undefined' ? window.innerHeight : chatbotHeight);
    const mobileTop = mobileViewport?.offsetTop ?? 0;
    
    const chatbotNode = (
        <div
            ref={containerRef}
            className="fixed pointer-events-auto !z-[999999]"
            style={isMobile ? {
                // Mobile: fullscreen overlay sized to visual viewport (handles on-screen keyboard)
                left: 0,
                right: 0,
                top: `${mobileTop}px`,
                width: '100vw',
                height: `${mobileHeight}px`,
            } : {
                // Desktop: positioned at bottom right
                right: '0px',
                top: `${position.y}px`,
                width: `${chatbotWidth}px`,
                height: `${CHATBOT_HEIGHT}px`,
                maxHeight: `${availableHeight}px`,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className={cn(
                    "relative shadow-2xl overflow-hidden h-full flex flex-col",
                    isMobile ? "bg-white dark:bg-gray-900" : "bg-white/90 dark:bg-gray-900/90", // Solid background on mobile
                    "backdrop-blur-2xl",
                    "border border-white/20 dark:border-gray-700/30",
                    "shadow-[0_20px_60px_rgba(0,0,0,0.3)]",
                    isMobile ? "rounded-none" : "rounded-3xl" // No border radius on mobile fullscreen
                )}
            >
                {/* Glassmorphic gradient overlay */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className={cn(
                        "absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-30",
                        "bg-gradient-to-br",
                        themeClasses.buttonGradient
                    )} />
                    <div className={cn(
                        "absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20",
                        "bg-gradient-to-br",
                        themeClasses.buttonGradient
                    )} />
                </div>

                {/* Header - Sticky */}
                <div
                    className={cn(
                        "sticky top-0 z-20 border-b border-gray-200/50 dark:border-gray-700/50",
                        isMobile ? "bg-white dark:bg-gray-800" : "bg-white/80 dark:bg-gray-800/80", // Solid header on mobile
                        "backdrop-blur-xl",
                        isMobile ? "p-4 pt-6" : "p-3" // Extra top padding on mobile for notch/status bar
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                            <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center",
                                "bg-gradient-to-br",
                                themeClasses.buttonGradient,
                                "shadow-lg"
                            )}>
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                    Dashboard Assistant
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Ask me anything about your dashboard
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {!isMobile && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const rightX = window.innerWidth - MINIMIZED_SIZE - 12;
                                        const bottomY = window.innerHeight - MINIMIZED_SIZE - 12;
                                        setPosition({ x: rightX, y: bottomY });
                                        setIsMinimized(true);
                                    }}
                                    className="h-8 w-8 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 flex items-center justify-center transition-colors cursor-pointer z-50 relative"
                                    title="Minimize"
                                >
                                    <Minimize2 className="h-4 w-4 pointer-events-none" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleClose();
                                }}
                                className="h-8 w-8 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 flex items-center justify-center transition-colors cursor-pointer"
                                title="Close"
                            >
                                <X className="h-4 w-4 pointer-events-none" />
                            </button>
                        </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100/50 dark:bg-gray-800/50">
                            <Command className="h-2.5 w-2.5" />
                            <span className="font-medium">L</span>
                        </div>
                        <span>open</span>
                        <span className="mx-0.5">•</span>
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100/50 dark:bg-gray-800/50">
                            <span className="font-medium">⌘K</span>
                        </div>
                        <span>voice</span>
                        <span className="mx-0.5">•</span>
                        <span>Esc close</span>
                    </div>
                </div>

                {/* Messages - Scrollable */}
                <ScrollArea className="flex-1 relative z-10 scrollbar-hide overflow-y-auto" ref={scrollAreaRef}>
                    <div className="p-3 space-y-2.5">
                        {messages.length === 0 && (
                            <div className="text-center py-8">
                                <div className={cn(
                                    "inline-flex items-center justify-center h-16 w-16 rounded-full mb-4",
                                    "bg-gradient-to-br",
                                    themeClasses.buttonGradient,
                                    "shadow-lg"
                                )}>
                                    <Sparkles className="h-8 w-8 text-white" />
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
                                    How can I help you?
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                    Ask about filters, data, or insights
                                </p>
                            </div>
                        )}
                        {messages.map((message, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "flex",
                                    message.role === 'user' ? 'justify-end' : 'justify-start'
                                )}
                            >
                                    <div
                                    className={cn(
                                        "max-w-[85%] rounded-2xl px-3.5 py-2",
                                        "break-words whitespace-pre-wrap", // FIX: Proper text wrapping
                                        message.role === 'user'
                                            ? cn(
                                                "bg-gradient-to-r text-white",
                                                themeClasses.buttonGradient,
                                                "shadow-md"
                                            )
                                            : "bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200/30 dark:border-gray-700/30"
                                    )}
                                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                                >
                                    <p className={cn(
                                        "text-sm leading-relaxed",
                                        "whitespace-pre-wrap", // FIX: Allow wrapping and line breaks
                                        message.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                                    )}>
                                        {message.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {/* Voice recording indicator in chat */}
                        {(voiceIsRecording || isRecording) && (
                            <div className="flex justify-start">
                                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-2xl px-4 py-3 max-w-[80%]">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-6 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-6 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-6 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                            {transcript || 'Listening...'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200/30 dark:border-gray-700/30 rounded-2xl px-5 py-3.5">
                                    {/* Apple-like smooth loading animation */}
                                    <div className="flex items-center gap-3">
                                        <div className="relative h-5 w-5">
                                            {/* Smooth rotating arc - Apple style */}
                                            <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle 
                                                    className="opacity-25" 
                                                    cx="12" 
                                                    cy="12" 
                                                    r="10" 
                                                    stroke="currentColor" 
                                                    strokeWidth="3"
                                                />
                                                <path 
                                                    className={cn("opacity-75", themeClasses.textPrimary)}
                                                    fill="currentColor" 
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                        </div>
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className={cn(
                    "relative z-10 border-t border-gray-200/50 dark:border-gray-700/50",
                    isMobile ? "bg-white dark:bg-gray-800" : "bg-white/60 dark:bg-gray-800/60", // Solid input area on mobile
                    "backdrop-blur-xl",
                    isMobile ? "p-4 pb-8" : "p-4" // Extra bottom padding on mobile for home indicator
                )}>
                    <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                            <textarea
                                ref={inputRef as any}
                                value={inputValue}
                                onChange={(e) => {
                                    // Allow all input including spaces - no restrictions
                                    setInputValue(e.target.value);
                                    // Auto-resize textarea
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                }}
                                onKeyDown={handleKeyDown}
                                onKeyPress={(e) => {
                                    // Stop propagation to prevent parent handlers from blocking space
                                    e.stopPropagation();
                                }}
                                placeholder="Ask for insights..."
                                disabled={isLoading}
                                autoComplete="off"
                                spellCheck="true"
                                rows={1}
                                className={cn(
                                    "w-full px-4 py-3 pr-24 rounded-2xl",
                                    "bg-white/70 dark:bg-gray-800/70",
                                    "backdrop-blur-xl",
                                    "border-2 border-gray-200/50 dark:border-gray-700/50",
                                    "text-sm text-gray-900 dark:text-gray-100",
                                    "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                                    "focus:outline-none focus:ring-4 focus:ring-opacity-30",
                                    "focus:border-white/60 dark:focus:border-gray-600/60",
                                    "transition-all duration-300",
                                    themeClasses.ringAccent,
                                    "shadow-lg",
                                    "disabled:opacity-50",
                                    "resize-none overflow-y-auto scrollbar-hide",
                                    "min-h-[44px] max-h-[120px]"
                                )}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {/* Clear button */}
                                {inputValue && (
                                    <button
                                        onClick={handleClearInput}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="h-9 w-9 rounded-lg flex items-center justify-center bg-gray-100/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-600/80 transition-all"
                                        title="Clear input"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                {/* Voice/Stop button */}
                                <button
                                    onClick={handleVoiceToggle}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    disabled={isLoading}
                                    className={cn(
                                        "h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-200",
                                        voiceIsRecording || isRecording
                                            ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50"
                                            : "bg-gray-100/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-600/80"
                                    )}
                                    title={voiceIsRecording || isRecording ? "Stop recording" : "Start voice input"}
                                >
                                    {voiceIsRecording || isRecording ? (
                                        <div className="h-3 w-3 rounded-full bg-white" />
                                    ) : (
                                        <Mic className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <Button
                            onClick={() => handleSend(inputValue)}
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={!inputValue.trim() || isLoading}
                            className={cn(
                                "h-11 w-11 rounded-xl",
                                "bg-gradient-to-r text-white",
                                themeClasses.buttonGradient,
                                "shadow-lg hover:shadow-xl",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (isMobile && typeof document !== 'undefined') {
        return createPortal(chatbotNode, document.body);
    }

    return chatbotNode;
}
