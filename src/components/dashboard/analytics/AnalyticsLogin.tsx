import { useState } from 'react';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Sparkles, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

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

// Static wave component
const WaveBackground = () => (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none">
        <svg className="relative block w-full h-32" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
                d="M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z"
                className="fill-purple-100/50 dark:fill-purple-900/20"
            />
        </svg>
        <svg className="absolute bottom-0 left-0 w-full h-24" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
                d="M0,40 C300,80 600,0 900,50 C1050,75 1150,30 1200,50 L1200,120 L0,120 Z"
                className="fill-purple-200/40 dark:fill-purple-800/20"
            />
        </svg>
    </div>
);

export function AnalyticsLogin() {
    const { login, isLoading } = useAnalyticsAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

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
            
            {/* Static gradient orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-300/50 to-violet-400/30 dark:from-purple-500/30 dark:to-violet-600/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-300/40 to-cyan-400/20 dark:from-blue-500/20 dark:to-cyan-600/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md px-4">
                <Card className="border border-purple-200/60 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-2xl shadow-purple-500/10 overflow-hidden">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 pointer-events-none z-0" />
                    
                    <CardHeader className="text-center pb-3 lg:pb-4 pt-6 lg:pt-8 relative z-10">
                        <div className="flex justify-center mb-4 lg:mb-6">
                            <div className="relative">
                                <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-xl lg:rounded-2xl bg-white dark:bg-slate-800 p-1.5 lg:p-2 shadow-lg shadow-purple-500/20 border border-purple-100 dark:border-purple-500/20">
                                    <img 
                                        src="/assets/logo_512x512.png" 
                                        alt="Buyhatke Logo" 
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <CardTitle className="text-xl lg:text-2xl font-bold text-foreground mb-1">
                            Buyhatke Internal
                        </CardTitle>
                        <CardTitle className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 dark:from-purple-400 dark:via-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                            Dashboard
                        </CardTitle>
                        
                        <CardDescription className="text-muted-foreground mt-2 text-sm">
                            Sign in to access analytics & insights
                        </CardDescription>
                    </CardHeader>
                    
                    <form onSubmit={handleSubmit} className="relative z-10">
                        <CardContent className="space-y-5 lg:space-y-6 px-5 lg:px-8">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-foreground/80 flex items-center gap-2 text-sm font-medium">
                                    <User className="h-4 w-4 text-purple-500" />
                                    Username
                                </Label>
                                <Input
                                    id="username"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="h-12 bg-white dark:bg-slate-800/50 border-purple-200/60 dark:border-purple-500/20 text-foreground placeholder:text-muted-foreground/60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-150"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-foreground/80 flex items-center gap-2 text-sm font-medium">
                                    <Lock className="h-4 w-4 text-purple-500" />
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-12 bg-white dark:bg-slate-800/50 border-purple-200/60 dark:border-purple-500/20 text-foreground placeholder:text-muted-foreground/60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-150"
                                />
                            </div>
                            
                            {error && (
                                <div className="text-sm text-red-500 dark:text-red-400 text-center bg-red-50 dark:bg-red-500/10 py-3 px-4 rounded-xl border border-red-200 dark:border-red-500/20">
                                    {error}
                                </div>
                            )}
                        </CardContent>
                        
                        <CardFooter className="flex flex-col gap-5 lg:gap-6 px-5 lg:px-8 pb-6 lg:pb-8 pt-2">
                            <Button
                                className="w-full h-12 lg:h-14 text-sm lg:text-base font-semibold gap-2 bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 hover:from-purple-700 hover:via-violet-700 hover:to-purple-700 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 lg:h-5 lg:w-5 animate-spin" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5" />
                                    </>
                                )}
                            </Button>
                            
                            <p className="text-[10px] lg:text-xs text-muted-foreground text-center">
                                Hint: Use <span className="text-purple-600 dark:text-purple-400 font-semibold">admin</span> / <span className="text-purple-600 dark:text-purple-400 font-semibold">123456</span> for full access
                            </p>
                        </CardFooter>
                    </form>
                </Card>
                
                {/* Footer */}
                <p className="text-center text-[10px] lg:text-xs text-muted-foreground/60 mt-4 lg:mt-6">
                    © 2025 Buyhatke Technologies Pvt. Ltd.
                </p>
            </div>
        </div>
    );
}
