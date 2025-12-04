import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Dot pattern component - can be used anywhere
export const DotPattern = ({ className = "" }: { className?: string }) => (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <svg className="absolute w-full h-full opacity-[0.25] dark:opacity-[0.15]" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="dotPattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.5" fill="currentColor" className="text-purple-500 dark:text-purple-300" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotPattern)" />
        </svg>
    </div>
);

// Subtle grid pattern
export const GridPattern = ({ className = "" }: { className?: string }) => (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <svg className="absolute w-full h-full opacity-[0.05] dark:opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="gridPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-purple-500" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gridPattern)" />
        </svg>
    </div>
);

// Wave component - subtle bottom wave
export const WaveBackground = ({ className = "" }: { className?: string }) => (
    <div className={`absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none ${className}`}>
        <svg className="relative block w-full h-20 opacity-30" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <motion.path
                d="M0,60 C200,90 400,30 600,60 C800,90 1000,30 1200,60 L1200,120 L0,120 Z"
                className="fill-purple-200/50 dark:fill-purple-900/30"
                animate={{
                    d: [
                        "M0,60 C200,90 400,30 600,60 C800,90 1000,30 1200,60 L1200,120 L0,120 Z",
                        "M0,70 C200,40 400,80 600,50 C800,30 1000,70 1200,50 L1200,120 L0,120 Z",
                        "M0,60 C200,90 400,30 600,60 C800,90 1000,30 1200,60 L1200,120 L0,120 Z"
                    ]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
        </svg>
    </div>
);

// Floating gradient orbs - subtle ambient effect
export const FloatingOrbs = ({ className = "" }: { className?: string }) => (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <motion.div
            className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-purple-300/20 to-violet-400/10 dark:from-purple-500/10 dark:to-violet-600/5 rounded-full blur-3xl"
            animate={{
                scale: [1, 1.2, 1],
                x: [0, 20, 0],
                y: [0, -10, 0],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
            className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-blue-300/15 to-cyan-400/10 dark:from-blue-500/10 dark:to-cyan-600/5 rounded-full blur-3xl"
            animate={{
                scale: [1.2, 1, 1.2],
                x: [0, -15, 0],
                y: [0, 15, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
    </div>
);

// Combined subtle background for dashboard areas
export const DashboardBackground = ({ showWave = true, className = "" }: { showWave?: boolean; className?: string }) => (
    <>
        <DotPattern className={className} />
        <FloatingOrbs className={className} />
        {showWave && <WaveBackground className={className} />}
    </>
);

// Animated gradient border effect
export const GlowBorder = ({ className = "" }: { className?: string }) => (
    <motion.div
        className={`absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 via-violet-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${className}`}
        style={{ padding: '1px' }}
    />
);

// Cursor follower ripple effect
export const CursorRipple = () => {
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
    
    useEffect(() => {
        let rippleId = 0;
        const handleClick = (e: MouseEvent) => {
            const newRipple = { id: rippleId++, x: e.clientX, y: e.clientY };
            setRipples(prev => [...prev, newRipple]);
            setTimeout(() => {
                setRipples(prev => prev.filter(r => r.id !== newRipple.id));
            }, 1000);
        };
        
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);
    
    return (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
            {ripples.map(ripple => (
                <motion.div
                    key={ripple.id}
                    className="absolute rounded-full border-2 border-purple-400/40"
                    style={{ left: ripple.x, top: ripple.y, x: '-50%', y: '-50%' }}
                    initial={{ width: 0, height: 0, opacity: 1 }}
                    animate={{ width: 150, height: 150, opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                />
            ))}
        </div>
    );
};

// Cursor glow effect that follows mouse
export const CursorGlow = () => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setPosition({ x: e.clientX, y: e.clientY });
            setIsVisible(true);
        };
        
        const handleMouseLeave = () => setIsVisible(false);
        
        window.addEventListener('mousemove', handleMouseMove);
        document.body.addEventListener('mouseleave', handleMouseLeave);
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            document.body.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);
    
    if (!isVisible) return null;
    
    return (
        <motion.div
            className="fixed pointer-events-none z-[9998] w-64 h-64 rounded-full"
            style={{
                background: 'radial-gradient(circle, rgba(147, 51, 234, 0.08) 0%, transparent 70%)',
                left: position.x,
                top: position.y,
                x: '-50%',
                y: '-50%',
            }}
            animate={{
                scale: [1, 1.1, 1],
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        />
    );
};

// Particle burst effect for buttons
export const ParticleBurst = ({ x, y, color = "purple" }: { x: number; y: number; color?: string }) => {
    const particles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        angle: (i / 8) * Math.PI * 2,
    }));
    
    return (
        <div 
            className="absolute pointer-events-none overflow-hidden"
            style={{ left: x, top: y, width: 80, height: 80, transform: 'translate(-50%, -50%)' }}
        >
            {particles.map(particle => (
                <motion.div
                    key={particle.id}
                    className={`absolute w-1.5 h-1.5 rounded-full bg-${color}-400`}
                    style={{ left: '50%', top: '50%' }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                        x: Math.cos(particle.angle) * 40,
                        y: Math.sin(particle.angle) * 40,
                        opacity: 0,
                        scale: 0,
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
            ))}
        </div>
    );
};

// Hyper-sexy gradient mesh background with animated blobs
export const GradientMeshBackground = ({ className = "" }: { className?: string }) => (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        {/* Animated gradient blobs */}
        <motion.div
            className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-purple-400/30 via-violet-400/20 to-transparent dark:from-purple-600/20 dark:via-violet-600/10 rounded-full blur-3xl"
            animate={{
                scale: [1, 1.2, 1],
                x: [0, 50, 0],
                y: [0, -30, 0],
                rotate: [0, 90, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
            className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-cyan-400/25 via-blue-400/15 to-transparent dark:from-cyan-600/15 dark:via-blue-600/10 rounded-full blur-3xl"
            animate={{
                scale: [1.2, 1, 1.2],
                x: [0, -40, 0],
                y: [0, 40, 0],
                rotate: [90, 0, 90]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
            className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] bg-gradient-to-br from-pink-400/20 via-rose-400/10 to-transparent dark:from-pink-600/15 dark:via-rose-600/8 rounded-full blur-3xl"
            animate={{
                scale: [1, 1.3, 1],
                x: [0, 30, 0],
                y: [0, -40, 0],
                rotate: [0, -90, 0]
            }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        
        {/* Subtle grid overlay */}
        <div className="absolute inset-0" style={{
            backgroundImage: `
                linear-gradient(to right, rgba(147, 51, 234, 0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(147, 51, 234, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
        }} />
    </div>
);
