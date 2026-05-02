// Static background patterns - NO ANIMATIONS for performance

// Dot pattern component - static, no motion
export const DotPattern = ({ className = "" }: { className?: string }) => (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <svg className="absolute w-full h-full opacity-[0.15] dark:opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="dotPattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="currentColor" className="text-purple-400 dark:text-purple-300" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotPattern)" />
        </svg>
    </div>
);

// Subtle grid pattern - static
export const GridPattern = ({ className = "" }: { className?: string }) => (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <svg className="absolute w-full h-full opacity-[0.03] dark:opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="gridPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-purple-500" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gridPattern)" />
        </svg>
    </div>
);

// Static wave - no animation
export const WaveBackground = ({ className = "" }: { className?: string }) => (
    <div className={`absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none ${className}`}>
        <svg className="relative block w-full h-16 opacity-20" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
                d="M0,60 C200,90 400,30 600,60 C800,90 1000,30 1200,60 L1200,120 L0,120 Z"
                className="fill-purple-200/40 dark:fill-purple-900/20"
            />
        </svg>
    </div>
);

// Static floating orbs - no motion, just CSS
export const FloatingOrbs = ({ className = "" }: { className?: string }) => (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-purple-300/15 to-violet-400/5 dark:from-purple-500/8 dark:to-violet-600/3 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-blue-300/10 to-cyan-400/5 dark:from-blue-500/6 dark:to-cyan-600/3 rounded-full blur-3xl" />
    </div>
);

// Combined subtle background - all static
export const DashboardBackground = ({ showWave = true, className = "" }: { showWave?: boolean; className?: string }) => (
    <>
        <DotPattern className={className} />
        <FloatingOrbs className={className} />
        {showWave && <WaveBackground className={className} />}
    </>
);

// Animated gradient border effect - keep for hover only
export const GlowBorder = ({ className = "" }: { className?: string }) => (
    <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 via-violet-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${className}`} />
);

// REMOVED CursorRipple - causes performance issues
export const CursorRipple = () => null;

// REMOVED CursorGlow - causes performance issues
export const CursorGlow = () => null;

// REMOVED ParticleBurst - causes performance issues
export const ParticleBurst = (_props: { x: number; y: number; color?: string }) => null;

// Static gradient mesh - NO animations, just static gradients
// Optimized with reduced blurs and will-change for performance
export const GradientMeshBackground = ({ className = "" }: { className?: string }) => (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} style={{ willChange: 'transform' }}>
        {/* Static gradient blobs - no motion */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-purple-400/15 via-violet-400/8 to-transparent dark:from-purple-600/10 dark:via-violet-600/5 rounded-full blur-2xl opacity-60" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-cyan-400/10 via-blue-400/5 to-transparent dark:from-cyan-600/8 dark:via-blue-600/3 rounded-full blur-2xl opacity-40" />
        <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] bg-gradient-to-br from-pink-400/8 via-rose-400/4 to-transparent dark:from-pink-600/6 dark:via-rose-600/2 rounded-full blur-xl opacity-30" />

        {/* Subtle grid overlay - very low opacity */}
        <div className="absolute inset-0" style={{
            backgroundImage: `
                linear-gradient(to right, rgba(147, 51, 234, 0.015) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(147, 51, 234, 0.015) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
        }} />
    </div>
);

/* ========================================================================
   AURORA MESH BACKGROUND — Living gradient canvas for modern dashboard
   Supports both light & dark modes
   ======================================================================== */
export const AuroraMeshBackground = ({ className = "" }: { className?: string }) => (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        {/* Light mode blobs — soft peach, sky blue, lavender */}
        <div
            className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full opacity-30 dark:opacity-0"
            style={{
                background: 'radial-gradient(circle, rgba(251,146,60,0.14) 0%, rgba(56,189,248,0.08) 50%, transparent 70%)',
                filter: 'blur(80px)',
                animation: 'aurora-drift-1 18s ease-in-out infinite',
            }}
        />
        <div
            className="absolute top-[30%] -right-[10%] w-[60vw] h-[60vw] rounded-full opacity-20 dark:opacity-0"
            style={{
                background: 'radial-gradient(circle, rgba(168,85,247,0.10) 0%, rgba(99,102,241,0.06) 50%, transparent 70%)',
                filter: 'blur(90px)',
                animation: 'aurora-drift-2 22s ease-in-out infinite',
            }}
        />
        <div
            className="absolute -bottom-[20%] left-[20%] w-[65vw] h-[65vw] rounded-full opacity-15 dark:opacity-0"
            style={{
                background: 'radial-gradient(circle, rgba(244,114,182,0.10) 0%, rgba(34,211,238,0.05) 50%, transparent 70%)',
                filter: 'blur(100px)',
                animation: 'aurora-drift-3 26s ease-in-out infinite',
            }}
        />

        {/* Dark mode blobs — teal, purple, pink */}
        <div
            className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full opacity-0 dark:opacity-40"
            style={{
                background: 'radial-gradient(circle, rgba(20,184,166,0.18) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)',
                filter: 'blur(80px)',
                animation: 'aurora-drift-1 18s ease-in-out infinite',
            }}
        />
        <div
            className="absolute top-[30%] -right-[10%] w-[60vw] h-[60vw] rounded-full opacity-0 dark:opacity-30"
            style={{
                background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(147,51,234,0.06) 50%, transparent 70%)',
                filter: 'blur(90px)',
                animation: 'aurora-drift-2 22s ease-in-out infinite',
            }}
        />
        <div
            className="absolute -bottom-[20%] left-[20%] w-[65vw] h-[65vw] rounded-full opacity-0 dark:opacity-25"
            style={{
                background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, rgba(6,182,212,0.06) 50%, transparent 70%)',
                filter: 'blur(100px)',
                animation: 'aurora-drift-3 26s ease-in-out infinite',
            }}
        />

        {/* Subtle noise texture overlay */}
        <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
                backgroundSize: '128px 128px',
            }}
        />
    </div>
);
