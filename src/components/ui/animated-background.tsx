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
export const ParticleBurst = (_: { x: number; y: number; color?: string }) => null;

// Static gradient mesh - NO animations, just static gradients
export const GradientMeshBackground = ({ className = "" }: { className?: string }) => (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        {/* Static gradient blobs - no motion */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-purple-400/20 via-violet-400/10 to-transparent dark:from-purple-600/12 dark:via-violet-600/6 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-cyan-400/15 via-blue-400/8 to-transparent dark:from-cyan-600/10 dark:via-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] bg-gradient-to-br from-pink-400/12 via-rose-400/6 to-transparent dark:from-pink-600/8 dark:via-rose-600/4 rounded-full blur-3xl" />

        {/* Subtle grid overlay */}
        <div className="absolute inset-0" style={{
            backgroundImage: `
                linear-gradient(to right, rgba(147, 51, 234, 0.02) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(147, 51, 234, 0.02) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
        }} />
    </div>
);
