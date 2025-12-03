import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Sparkles, Lock, User, ArrowRight } from 'lucide-react';

// Dot pattern component
const DotPattern = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute w-full h-full opacity-[0.15] dark:opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="dotPattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="currentColor" className="text-purple-500" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotPattern)" />
        </svg>
    </div>
);

// Wave component
const WaveBackground = () => (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none">
        <svg className="relative block w-full h-32" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <motion.path
                d="M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z"
                className="fill-purple-100/50 dark:fill-purple-900/20"
                animate={{
                    d: [
                        "M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z",
                        "M0,80 C200,40 400,100 600,60 C800,20 1000,80 1200,40 L1200,120 L0,120 Z",
                        "M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z"
                    ]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
        </svg>
        <svg className="absolute bottom-0 left-0 w-full h-24" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <motion.path
                d="M0,40 C300,80 600,0 900,50 C1050,75 1150,30 1200,50 L1200,120 L0,120 Z"
                className="fill-purple-200/40 dark:fill-purple-800/20"
                animate={{
                    d: [
                        "M0,40 C300,80 600,0 900,50 C1050,75 1150,30 1200,50 L1200,120 L0,120 Z",
                        "M0,60 C300,20 600,80 900,30 C1050,10 1150,60 1200,40 L1200,120 L0,120 Z",
                        "M0,40 C300,80 600,0 900,50 C1050,75 1150,30 1200,50 L1200,120 L0,120 Z"
                    ]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
        </svg>
    </div>
);

// Floating particles
const FloatingParticles = () => (
    <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 opacity-60"
                style={{
                    left: `${10 + (i * 7) % 80}%`,
                    top: `${15 + (i * 11) % 70}%`,
                }}
                animate={{
                    y: [0, -20, 0],
                    x: [0, 10 * (i % 2 === 0 ? 1 : -1), 0],
                    scale: [1, 1.2, 1],
                    opacity: [0.4, 0.8, 0.4],
                }}
                transition={{
                    duration: 3 + (i % 3),
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.2,
                }}
            />
        ))}
    </div>
);

export function AnalyticsLogin() {
    const { login, isLoading } = useAnalyticsAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const result = await login(username, password);
        if (!result.success) {
            setError(result.message || 'Login failed');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/50 overflow-hidden relative">
            {/* Background layers */}
            <DotPattern />
            <WaveBackground />
            <FloatingParticles />
            
            {/* Animated gradient orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-300/50 to-violet-400/30 dark:from-purple-500/30 dark:to-violet-600/20 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        x: [0, 30, 0],
                        y: [0, -20, 0],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-300/40 to-cyan-400/20 dark:from-blue-500/20 dark:to-cyan-600/10 rounded-full blur-3xl"
                    animate={{
                        scale: [1.2, 1, 1.2],
                        x: [0, -20, 0],
                        y: [0, 30, 0],
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-md px-4"
            >
                <Card className="border border-purple-200/60 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-2xl shadow-purple-500/10 overflow-hidden">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 pointer-events-none" />
                    
                    <CardHeader className="text-center pb-3 lg:pb-4 pt-6 lg:pt-8 relative">
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                            className="flex justify-center mb-4 lg:mb-6"
                        >
                            <motion.div 
                                className="relative"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-xl lg:rounded-2xl bg-white dark:bg-slate-800 p-1.5 lg:p-2 shadow-lg shadow-purple-500/20 border border-purple-100 dark:border-purple-500/20">
                                    <img 
                                        src="/assets/logo_512x512.png" 
                                        alt="Buyhatke Logo" 
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                {/* Pulsing ring */}
                                <motion.div
                                    className="absolute inset-0 rounded-xl lg:rounded-2xl border-2 border-purple-400/50"
                                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            </motion.div>
                        </motion.div>
                        
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                        >
                            <CardTitle className="text-xl lg:text-2xl font-bold text-foreground mb-1">
                                Buyhatke Internal
                            </CardTitle>
                            <CardTitle className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 dark:from-purple-400 dark:via-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                                Dashboard
                            </CardTitle>
                        </motion.div>
                        
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                        >
                            <CardDescription className="text-muted-foreground mt-2 text-sm">
                                Sign in to access analytics & insights
                            </CardDescription>
                        </motion.div>
                    </CardHeader>
                    
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-5 lg:space-y-6 px-5 lg:px-8">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ 
                                    opacity: 1, 
                                    x: 0,
                                    scale: focusedField === 'username' ? 1.02 : 1 
                                }}
                                transition={{ delay: 0.4 }}
                                className="space-y-2"
                            >
                                <Label htmlFor="username" className="text-foreground/80 flex items-center gap-2 text-sm font-medium">
                                    <motion.div
                                        animate={{ rotate: focusedField === 'username' ? [0, -10, 10, 0] : 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <User className="h-4 w-4 text-purple-500" />
                                    </motion.div>
                                    Username
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="username"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        onFocus={() => setFocusedField('username')}
                                        onBlur={() => setFocusedField(null)}
                                        required
                                        className="h-12 bg-white dark:bg-slate-800/50 border-purple-200/60 dark:border-purple-500/20 text-foreground placeholder:text-muted-foreground/60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                                    />
                                </div>
                            </motion.div>
                            
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ 
                                    opacity: 1, 
                                    x: 0,
                                    scale: focusedField === 'password' ? 1.02 : 1 
                                }}
                                transition={{ delay: 0.5 }}
                                className="space-y-2"
                            >
                                <Label htmlFor="password" className="text-foreground/80 flex items-center gap-2 text-sm font-medium">
                                    <motion.div
                                        animate={{ rotate: focusedField === 'password' ? [0, -10, 10, 0] : 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Lock className="h-4 w-4 text-purple-500" />
                                    </motion.div>
                                    Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={() => setFocusedField(null)}
                                        required
                                        className="h-12 bg-white dark:bg-slate-800/50 border-purple-200/60 dark:border-purple-500/20 text-foreground placeholder:text-muted-foreground/60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                                    />
                                </div>
                            </motion.div>
                            
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        className="text-sm text-red-500 dark:text-red-400 text-center bg-red-50 dark:bg-red-500/10 py-3 px-4 rounded-xl border border-red-200 dark:border-red-500/20"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                        
                        <CardFooter className="flex flex-col gap-5 lg:gap-6 px-5 lg:px-8 pb-6 lg:pb-8 pt-2">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="w-full"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button
                                    className="w-full h-12 lg:h-14 text-sm lg:text-base font-semibold gap-2 bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 hover:from-purple-700 hover:via-violet-700 hover:to-purple-700 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300"
                                    type="submit"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            >
                                                <Sparkles className="h-4 w-4 lg:h-5 lg:w-5" />
                                            </motion.div>
                                            <span>Signing in...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Sign In</span>
                                            <motion.div
                                                animate={{ x: [0, 4, 0] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                            >
                                                <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5" />
                                            </motion.div>
                                        </>
                                    )}
                                </Button>
                            </motion.div>
                            
                            <motion.p 
                                className="text-[10px] lg:text-xs text-muted-foreground text-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                            >
                                Hint: Use <span className="text-purple-600 dark:text-purple-400 font-semibold">admin</span> / <span className="text-purple-600 dark:text-purple-400 font-semibold">123456</span> for full access
                            </motion.p>
                        </CardFooter>
                    </form>
                </Card>
                
                {/* Footer */}
                <motion.p 
                    className="text-center text-[10px] lg:text-xs text-muted-foreground/60 mt-4 lg:mt-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    © 2025 Buyhatke Technologies Pvt. Ltd.
                </motion.p>
            </motion.div>
        </div>
    );
}
