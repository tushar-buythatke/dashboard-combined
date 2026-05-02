import { useState, useEffect, useRef, type FormEvent } from 'react'
import { Eye, EyeOff, Lock, User, LogIn, UserPlus, Clock, QrCode, Smartphone, CheckCircle2, RefreshCw, ArrowRight, Copy, Loader2, ShieldCheck, ShieldAlert, Settings2, Building2, Sun, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext'
import { useTheme } from '@/components/theme/theme-provider'
import { useAccentTheme, THEME_INFO } from '@/contexts/AccentThemeContext'
import type { User as AppUser } from '@/types/analytics'

// Configuration - Use production featureTracking API
const FEATURE_TRACKING_AUTH_API = 'https://ext1.buyhatke.com/feature-tracking/auth'
const getAuthUrl = () => FEATURE_TRACKING_AUTH_API

type AuthFlowState = 'login' | 'signup' | 'setup2fa' | 'waiting' | 'verifyotp' | 'forgot'
type ForgotPasswordStep = 'email' | 'otp' | 'password'

interface UserData {
    id: number | string
    username: string
    role: number
    dashboardId: number
    permissions: { features: Record<string, 'read' | 'write'> } | null
}

interface Feature {
    id: number
    name: string
}

interface Organization {
    id: number
    name: string
}

// Theme gradient map for dynamic styling
const THEME_GRADIENTS: Record<string, { from: string; to: string }> = {
    aurora: { from: '#8b5cf6', to: '#ec4899' },
    indigo: { from: '#2563eb', to: '#06b6d4' },
    sunset: { from: '#f97316', to: '#f59e0b' },
    forest: { from: '#22c55e', to: '#10b981' },
    midnight: { from: '#4c1d95', to: '#7c3aed' },
    afterhours: { from: '#14532d', to: '#a3e635' },
}

export default function AuthLogin() {
    const navigate = useNavigate()
    const location = useLocation()
    const { loginUser } = useAnalyticsAuth()
    const { mode, toggleMode } = useTheme()
    const { actualTheme } = useAccentTheme()

    // Ref to prevent double navigation
    const isNavigatingRef = useRef(false)

    // Form state
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showSignupPassword, setShowSignupPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Auth flow state
    const [flowState, setFlowState] = useState<AuthFlowState>('login')
    const [userData, setUserData] = useState<UserData | null>(null)

    // Permission request state (for signup)
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)
    const [featuresLoading, setFeaturesLoading] = useState(false)
    const [availableFeatures, setAvailableFeatures] = useState<Feature[]>([])
    const [featureSearch, setFeatureSearch] = useState('')
    const [selectedFeatures, setSelectedFeatures] = useState<Record<string, 'read' | 'write'>>({})

    // 2FA state
    const [secretData, setSecretData] = useState<{ tempSecret: string; qrCode: string } | null>(null)
    const [otpCode, setOtpCode] = useState('')

    // Forgot password state
    const [forgotStep, setForgotStep] = useState<ForgotPasswordStep>('email')
    const [resetEmail, setResetEmail] = useState('')
    const [resetOtp, setResetOtp] = useState('')
    const [resetPassword, setResetPassword] = useState('')
    const [resetConfirmPassword, setResetConfirmPassword] = useState('')
    const [resetLoading, setResetLoading] = useState(false)
    const [resetUserData, setResetUserData] = useState<{ userId: number; userName: string } | null>(null)

    const themeGradient = THEME_GRADIENTS[actualTheme] || THEME_GRADIENTS.aurora
    const isDark = mode === 'dark'

    // Redirect if already authenticated - only check on mount
    useEffect(() => {
        if (isNavigatingRef.current) return
        const stored = localStorage.getItem('dashboard_combined_auth')
        if (stored) {
            try {
                const sessionData = JSON.parse(stored)
                if (sessionData.expiry && Date.now() < sessionData.expiry && sessionData.user) {
                    isNavigatingRef.current = true
                    const from = (location.state as any)?.from?.pathname || '/analytics'
                    navigate(from, { replace: true })
                }
            } catch (e) {
                localStorage.removeItem('dashboard_combined_auth')
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const FEATURE_TRACKING_DASHBOARD_API = 'https://ext1.buyhatke.com/feature-tracking/dashboard'

    // Fetch organizations on mount (for signup flow)
    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const response = await fetch(`${FEATURE_TRACKING_DASHBOARD_API}/organizationsList`)
                const result = await response.json()
                if (result.status === 1 && result.data?.organizationMap) {
                    const orgs: Organization[] = Object.entries(result.data.organizationMap).map(([id, name]) => ({
                        id: parseInt(id),
                        name: name as string
                    }))
                    setOrganizations(orgs)
                }
            } catch (err) {
                console.error("Failed to fetch organizations:", err)
            }
        }
        fetchOrgs()
    }, [])

    // Fetch features when an org is selected
    const fetchFeaturesForOrg = async (orgId: number) => {
        setFeaturesLoading(true)
        setAvailableFeatures([])
        setSelectedFeatures({})
        try {
            const response = await fetch(`${FEATURE_TRACKING_DASHBOARD_API}/featuresList?organizationId=${orgId}`)
            const result = await response.json()
            if (result.status === 1 && result.data?.featureMap) {
                const features: Feature[] = Object.entries(result.data.featureMap).map(([id, name]) => ({
                    id: parseInt(id),
                    name: name as string
                }))
                setAvailableFeatures(features)
            }
        } catch (err) {
            console.error("Failed to fetch features:", err)
        } finally {
            setFeaturesLoading(false)
        }
    }

    const handleOrgSelect = (orgId: number) => {
        setSelectedOrgId(orgId)
        fetchFeaturesForOrg(orgId)
    }

    const toggleFeature = (id: number) => {
        const idStr = String(id)
        setSelectedFeatures(prev => {
            const next = { ...prev }
            if (next[idStr]) {
                delete next[idStr]
            } else {
                next[idStr] = 'read'
            }
            return next
        })
    }

    const toggleAccessLevel = (id: number) => {
        const idStr = String(id)
        setSelectedFeatures(prev => ({
            ...prev,
            [idStr]: prev[idStr] === 'read' ? 'write' : 'read'
        }))
    }

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault()
        if (!username.trim() || !password.trim()) {
            setError('Please enter both email and password')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${getAuthUrl()}/validateLogin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: username.trim(), password: password.trim(), dashboard_id: 1 })
            })

            const result = await response.json()

            if (result.status === 1) {
                const normalizedUser = {
                    ...result.user,
                    id: result.user.userId || result.user.id,
                    username: result.user.userName || result.user.username,
                    role: result.user.type || result.user.role || 0
                }
                setUserData(normalizedUser)

                if (result.waitingApproval) {
                    setFlowState('waiting')
                    toast.info('Your account is pending admin approval')
                } else if (result.needsSetup) {
                    setFlowState('setup2fa')
                    await generate2FASecret(normalizedUser)
                } else if (result.requires2FA) {
                    setFlowState('verifyotp')
                }
            } else {
                setError(result.message || 'Login failed')
            }
        } catch (err) {
            setError('Connection failed. Please check your network.')
        } finally {
            setLoading(false)
        }
    }

    const handleSignup = async (e: FormEvent) => {
        e.preventDefault()
        if (!username.trim() || !password.trim()) {
            setError('Please enter both email and password')
            return
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@(buyhatke\.com|0fiat\.com|bitbns\.com|onramp\.money)$/i
        if (!emailRegex.test(username.trim())) {
            setError('Only @buyhatke.com, @0fiat.com, @bitbns.com, or @onramp.money email addresses are allowed')
            return
        }

        if (selectedOrgId === null) {
            setError('Please select an organization')
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        if (Object.keys(selectedFeatures).length === 0) {
            setError('Please select at least one feature')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${getAuthUrl()}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    password: password.trim(),
                    dashboard_id: 1,
                    permissions: { features: selectedFeatures }
                })
            })

            const result = await response.json()
            if (result.status === 1) {
                const user = {
                    id: result.data.userId || result.data.id,
                    username: result.data.username || result.data.userName,
                    role: 0,
                    dashboardId: result.data.dashboardId || 1,
                    permissions: null
                }
                setUserData(user)
                toast.success('Account created! Now link your authenticator app.')
                setFlowState('setup2fa')
                await generate2FASecret(user)
            } else {
                setError(result.message || 'Signup failed')
            }
        } catch (err) {
            setError('Connection failed. Please check your network.')
        } finally {
            setLoading(false)
        }
    }

    const generate2FASecret = async (user: UserData) => {
        setLoading(true)
        try {
            const response = await fetch(`${getAuthUrl()}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, userName: user.username })
            })

            const result = await response.json()
            if (result.status === 1) {
                setSecretData(result.data)
            } else {
                setError(result.message || 'Failed to generate 2FA')
            }
        } catch (err) {
            setError('Failed to generate 2FA code')
        } finally {
            setLoading(false)
        }
    }

    const linkAuthenticator = async () => {
        if (!secretData || !userData) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${getAuthUrl()}/link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userData.id, secret: secretData.tempSecret })
            })

            const result = await response.json()
            if (result.status === 1) {
                toast.success('Authenticator linked! Waiting for admin approval.')
                setFlowState('waiting')
            } else {
                setError(result.message || 'Failed to link authenticator')
            }
        } catch (err) {
            setError('Failed to link authenticator')
        } finally {
            setLoading(false)
        }
    }

    const checkApprovalStatus = async () => {
        if (!userData?.id) return

        setLoading(true)
        try {
            const response = await fetch(`${getAuthUrl()}/checkApproval`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userData.id })
            })

            const result = await response.json()
            if (result.status === 1 && result.data?.approved) {
                toast.success('Account approved! Enter your OTP to login.')
                setFlowState('verifyotp')
            } else {
                toast.info('Still waiting for approval')
            }
        } catch (err) {
            toast.error('Failed to check status')
        } finally {
            setLoading(false)
        }
    }

    const verifyOTPAndLogin = async () => {
        if (!otpCode || otpCode.length !== 6 || !userData) {
            setError('Please enter a valid 6-digit code')
            return
        }

        if (isNavigatingRef.current) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${getAuthUrl()}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userData.id, token: otpCode })
            })

            const result = await response.json()
            if (result.status === 1) {
                const backendUser = result.user || userData
                const normalizedUser: AppUser = {
                    id: backendUser.userId || backendUser.id,
                    username: backendUser.userName || backendUser.username,
                    role: backendUser.type ?? backendUser.role ?? 0,
                    dashboardId: backendUser.dashboardId,
                    permissions: backendUser.permissions,
                    pending_permissions: backendUser.pending_permissions,
                    pending_status: backendUser.pending_status
                }

                isNavigatingRef.current = true
                await loginUser(normalizedUser, true)
                toast.success('Login successful!')

                await new Promise(resolve => setTimeout(resolve, 100))
                const from = (location.state as any)?.from?.pathname || '/analytics'
                navigate(from, { replace: true })
            } else {
                setError(result.message || 'Invalid code')
                setOtpCode('')
            }
        } catch (err) {
            setError('Verification failed')
            isNavigatingRef.current = false
        } finally {
            setLoading(false)
        }
    }

    const handleForgotEmailSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!resetEmail.trim()) {
            setError('Please enter your username or email')
            return
        }

        setResetLoading(true)
        setError(null)

        try {
            const response = await fetch(`${getAuthUrl()}/forgot/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: resetEmail.trim() })
            })

            const result = await response.json()
            if (result.status === 1) {
                setResetUserData({ userId: result.data.userId, userName: result.data.userName })
                setForgotStep('otp')
                toast.success('Account found! Please enter your authenticator OTP.')
            } else {
                setError(result.message || 'Account not found or not eligible for password reset')
            }
        } catch (err) {
            setError('Failed to verify account. Please try again.')
        } finally {
            setResetLoading(false)
        }
    }

    const handleForgotOtpSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!resetOtp.trim() || resetOtp.length !== 6) {
            setError('Please enter a valid 6-digit OTP code')
            return
        }

        setResetLoading(true)
        setError(null)

        try {
            const response = await fetch(`${getAuthUrl()}/forgot/verifyOtp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: resetEmail.trim(), otp: resetOtp.trim() })
            })

            const result = await response.json()
            if (result.status === 1) {
                setForgotStep('password')
                toast.success('OTP verified! Now set your new password.')
            } else {
                setError(result.message || 'Invalid OTP code')
                setResetOtp('')
            }
        } catch (err) {
            setError('OTP verification failed. Please try again.')
        } finally {
            setResetLoading(false)
        }
    }

    const handleForgotPasswordSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (!resetPassword.trim() || !resetConfirmPassword.trim()) {
            setError('Please fill all password fields')
            return
        }

        if (resetPassword !== resetConfirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (resetPassword.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setResetLoading(true)
        setError(null)

        try {
            const response = await fetch(`${getAuthUrl()}/forgotPassword`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: resetEmail.trim(), newPassword: resetPassword.trim() })
            })

            const result = await response.json()
            if (result.status === 1) {
                toast.success('Password updated successfully! Please sign in with your new password.')
                setUsername(resetEmail.trim())
                setPassword('')
                setResetOtp('')
                setResetPassword('')
                setResetConfirmPassword('')
                setResetUserData(null)
                setForgotStep('email')
                setFlowState('login')
            } else {
                setError(result.message || 'Password reset failed')
            }
        } catch (err) {
            setError('Password reset failed. Please try again.')
        } finally {
            setResetLoading(false)
        }
    }

    const copySecret = () => {
        if (secretData?.tempSecret) {
            navigator.clipboard.writeText(secretData.tempSecret)
            toast.success('Secret key copied!')
        }
    }

    const resetToLogin = () => {
        setFlowState('login')
        setUserData(null)
        setSecretData(null)
        setOtpCode('')
        setError(null)
        setResetEmail('')
        setResetOtp('')
        setResetPassword('')
        setResetConfirmPassword('')
        setResetLoading(false)
        setForgotStep('email')
        setResetUserData(null)
        setSelectedOrgId(null)
        setAvailableFeatures([])
        setSelectedFeatures({})
        setFeatureSearch('')
    }

    const openForgotPassword = () => {
        setResetEmail(username.trim())
        setResetOtp('')
        setResetPassword('')
        setResetConfirmPassword('')
        setError(null)
        setForgotStep('email')
        setResetUserData(null)
        setFlowState('forgot')
    }

    // ========== CINEMATIC UI RENDER FUNCTIONS ==========

    const gradientTextStyle = {
        background: `linear-gradient(135deg, ${themeGradient.from}, ${themeGradient.to})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
    } as React.CSSProperties

    const gradientBgStyle = {
        background: `linear-gradient(135deg, ${themeGradient.from}, ${themeGradient.to})`,
    } as React.CSSProperties

    const glowRingStyle = {
        boxShadow: `0 0 30px ${themeGradient.from}4D`,
    } as React.CSSProperties

    const renderTabs = () => (
        <div className={`flex rounded-full p-1 mb-6 relative ${isDark ? 'bg-black/20 backdrop-blur-sm' : 'bg-slate-200/50'}`}>
            {flowState !== 'forgot' && (
                <>
                    <motion.div
                        layoutId="activeTab"
                        className="absolute inset-y-1 rounded-full"
                        style={{
                            left: flowState === 'login' ? '4px' : 'calc(50% + 4px)',
                            width: 'calc(50% - 8px)',
                            background: `linear-gradient(135deg, ${themeGradient.from}, ${themeGradient.to})`,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                    <button
                        onClick={() => { setFlowState('login'); setUsername(''); setPassword(''); setError(null) }}
                        className={`relative z-10 flex-1 py-3 px-4 rounded-full font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                            flowState === 'login' ? 'text-white' : isDark ? 'text-white/50 hover:text-white/80' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <LogIn className="w-4 h-4" />Sign In
                    </button>
                    <button
                        onClick={() => { setFlowState('signup'); setUsername(''); setPassword(''); setError(null) }}
                        className={`relative z-10 flex-1 py-3 px-4 rounded-full font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                            flowState === 'signup' ? 'text-white' : isDark ? 'text-white/50 hover:text-white/80' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <UserPlus className="w-4 h-4" />Sign Up
                    </button>
                </>
            )}
        </div>
    )

    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
                <Label htmlFor="username" className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                    <User className="h-4 w-4" style={{ color: themeGradient.from }} />Username
                </Label>
                <div className="relative">
                    <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="yourname@buyhatke.com"
                        disabled={loading}
                        className={`h-12 pl-10 ${isDark ? 'login-input-dark rounded-xl' : 'login-input-light rounded-xl'}`}
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" style={{ color: themeGradient.from }} />
                </div>
            </div>
            <p className={`text-[10px] italic ml-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                Use your official email (@buyhatke.com, @0fiat.com, @bitbns.com, @onramp.money)
            </p>

            <div className="space-y-2">
                <Label htmlFor="password" className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                    <Lock className="h-4 w-4" style={{ color: themeGradient.from }} />Password
                </Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        disabled={loading}
                        className={`h-12 pr-12 pl-10 ${isDark ? 'login-input-dark rounded-xl' : 'login-input-light rounded-xl'}`}
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" style={{ color: themeGradient.from }} />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-opacity ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl font-semibold text-white relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-70 disabled:hover:translate-y-0"
                style={{
                    background: `linear-gradient(135deg, ${themeGradient.from}, ${themeGradient.to})`,
                    backgroundSize: '200% 200%',
                    boxShadow: `0 8px 24px ${themeGradient.from}40`,
                }}
            >
                <span className="absolute inset-0 overflow-hidden">
                    <span className="absolute inset-0 -translate-x-full animate-[shimmer-sweep_2.5s_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-15deg]" />
                </span>
                {loading ? (
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Signing In...
                    </span>
                ) : (
                    <span className="relative z-10">Sign In</span>
                )}
            </button>

            <div className="text-center pt-1">
                <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-sm font-medium transition-all hover:underline"
                    style={{ color: themeGradient.from }}
                    disabled={loading}
                >
                    Forgot your password?
                </button>
            </div>
        </form>
    )

    const renderForgotPassword = () => {
        if (forgotStep === 'email') {
            return (
                <form onSubmit={handleForgotEmailSubmit} className="space-y-5">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${themeGradient.from}20, ${themeGradient.to}20)` }}>
                            <User className="h-8 w-8" style={{ color: themeGradient.from }} />
                        </div>
                        <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Reset Password</h3>
                        <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Enter your username or email to verify your account</p>
                    </div>

                    <div className="space-y-2">
                        <Label className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white/70' : 'text-slate-600'}`}><User className="h-4 w-4" style={{ color: themeGradient.from }} />Username or Email</Label>
                        <Input
                            type="text"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="Enter username or email"
                            disabled={resetLoading}
                            className={`h-12 ${isDark ? 'login-input-dark rounded-xl' : 'login-input-light rounded-xl'}`}
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={resetLoading}
                        className="w-full h-12 rounded-xl font-semibold text-white relative overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${themeGradient.from}, ${themeGradient.to})`, boxShadow: `0 8px 24px ${themeGradient.from}40` }}
                    >
                        {resetLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Checking...</span> : 'Continue'}
                    </button>

                    <div className="text-center">
                        <button type="button" onClick={resetToLogin} className={`text-sm ${isDark ? 'text-white/40 hover:text-white/70' : 'text-slate-400 hover:text-slate-600'}`}>
                            Back to login
                        </button>
                    </div>
                </form>
            )
        }

        if (forgotStep === 'otp') {
            return (
                <form onSubmit={handleForgotOtpSubmit} className="space-y-5">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${themeGradient.from}20, ${themeGradient.to}20)` }}>
                            <Smartphone className="h-8 w-8" style={{ color: themeGradient.from }} />
                        </div>
                        <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Enter OTP</h3>
                        <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Enter the 6-digit code from your authenticator app</p>
                        {resetUserData && (
                            <div className={`p-2 rounded-lg mt-2 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                                    Account: <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{resetUserData.userName}</span>
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white/70' : 'text-slate-600'}`}><Smartphone className="h-4 w-4" style={{ color: themeGradient.from }} />Authenticator OTP</Label>
                        <Input
                            type="text"
                            value={resetOtp}
                            onChange={(e) => setResetOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            disabled={resetLoading}
                            className={`h-12 text-center text-2xl tracking-widest font-mono ${isDark ? 'login-input-dark rounded-xl' : 'login-input-light rounded-xl'}`}
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={resetLoading || resetOtp.length !== 6}
                        className="w-full h-12 rounded-xl font-semibold text-white relative overflow-hidden disabled:opacity-50"
                        style={{ background: `linear-gradient(135deg, ${themeGradient.from}, ${themeGradient.to})`, boxShadow: `0 8px 24px ${themeGradient.from}40` }}
                    >
                        {resetLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Verifying...</span> : 'Verify OTP'}
                    </button>

                    <div className="text-center space-y-2">
                        <button type="button" onClick={() => { setForgotStep('email'); setResetOtp(''); setError(null) }} className={`text-sm ${isDark ? 'text-white/40 hover:text-white/70' : 'text-slate-400 hover:text-slate-600'}`}>
                            Back to email
                        </button>
                    </div>
                </form>
            )
        }

        return (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30">
                        <ShieldCheck className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Set New Password</h3>
                    <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Create a new password for your account</p>
                    {resetUserData && (
                        <div className={`p-2 rounded-lg mt-2 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                                Account: <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{resetUserData.userName}</span>
                            </p>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white/70' : 'text-slate-600'}`}><Lock className="h-4 w-4" style={{ color: themeGradient.from }} />New Password</Label>
                    <Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Minimum 6 characters" disabled={resetLoading} className={`h-12 ${isDark ? 'login-input-dark rounded-xl' : 'login-input-light rounded-xl'}`} autoFocus />
                </div>

                <div className="space-y-2">
                    <Label className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white/70' : 'text-slate-600'}`}><Lock className="h-4 w-4" style={{ color: themeGradient.from }} />Confirm Password</Label>
                    <Input type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder="Re-enter password" disabled={resetLoading} className={`h-12 ${isDark ? 'login-input-dark rounded-xl' : 'login-input-light rounded-xl'}`} />
                </div>

                <button type="submit" disabled={resetLoading || !resetPassword || !resetConfirmPassword} className="w-full h-12 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    {resetLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Updating...</span> : 'Reset Password'}
                </button>

                <div className="text-center">
                    <button type="button" onClick={() => { setForgotStep('otp'); setResetPassword(''); setResetConfirmPassword(''); setError(null) }} className={`text-sm ${isDark ? 'text-white/40 hover:text-white/70' : 'text-slate-400 hover:text-slate-600'}`}>
                        Back to OTP
                    </button>
                </div>
            </form>
        )
    }

    const renderSignupForm = () => (
        <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-3">
                <Label className={`flex items-center gap-2 text-sm font-bold ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                    <Building2 className="w-4 h-4" style={{ color: themeGradient.from }} />Select Organization
                </Label>
                {organizations.length === 0 ? (
                    <div className={`text-xs animate-pulse ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Loading organizations...</div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {organizations.map(org => (
                            <button
                                key={org.id}
                                type="button"
                                onClick={() => handleOrgSelect(org.id)}
                                className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                                    selectedOrgId === org.id
                                        ? 'text-white border-transparent shadow-sm'
                                        : isDark ? 'bg-white/5 border-white/10 text-white/70 hover:border-white/30' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                                style={selectedOrgId === org.id ? { background: `linear-gradient(135deg, ${themeGradient.from}, ${themeGradient.to})` } : {}}
                            >
                                {org.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white/70' : 'text-slate-600'}`}><User className="w-4 h-4" style={{ color: themeGradient.from }} />Username</Label>
                    <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourname@buyhatke.com" disabled={loading} className={`h-11 ${isDark ? 'login-input-dark rounded-xl' : 'login-input-light rounded-xl'}`} />
                </div>
                <p className={`text-[10px] italic ml-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                    Allowed: @buyhatke.com, @0fiat.com, @bitbns.com, @onramp.money
                </p>

                <div className="space-y-2">
                    <Label className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white/70' : 'text-slate-600'}`}><Lock className="w-4 h-4" style={{ color: themeGradient.from }} />Password</Label>
                    <div className="relative">
                        <Input type={showSignupPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" disabled={loading} className={`h-11 pr-10 ${isDark ? 'login-input-dark rounded-xl' : 'login-input-light rounded-xl'}`} />
                        <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                            {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5" style={{ color: themeGradient.from }} />
                        <Label className="text-sm font-bold" style={gradientTextStyle}>
                            Feature Access Permissions
                        </Label>
                    </div>
                    {selectedOrgId === null && (
                        <span className={`text-xs italic ${isDark ? 'text-amber-400/80' : 'text-amber-600'}`}>Select an organization above to load features</span>
                    )}
                </div>

                {selectedOrgId !== null && (
                    <div className={`flex items-center gap-2 p-2 rounded-xl border shadow-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/60 border-slate-200/80 backdrop-blur-sm'}`}>
                        <Input type="text" placeholder="Search features..." value={featureSearch} onChange={(e) => setFeatureSearch(e.target.value)} className="h-9 border-none bg-transparent shadow-none focus-visible:ring-0" />
                        <Badge variant="secondary" className="shrink-0 text-xs" style={{ background: `${themeGradient.from}15`, color: themeGradient.from, border: `1px solid ${themeGradient.from}30` }}>
                            {availableFeatures.filter(f => f.name.toLowerCase().includes(featureSearch.toLowerCase())).length} Available
                        </Badge>
                    </div>
                )}

                <div className={`rounded-2xl border overflow-hidden shadow-inner ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50/50 border-slate-200'}`}>
                    {featuresLoading ? (
                        <div className="h-[200px] flex items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: themeGradient.from }} />
                            <span className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Loading features...</span>
                        </div>
                    ) : selectedOrgId === null ? (
                        <div className={`h-[120px] flex items-center justify-center text-sm ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Select an organization to see available features</div>
                    ) : availableFeatures.length === 0 ? (
                        <div className={`h-[120px] flex items-center justify-center text-sm ${isDark ? 'text-white/30' : 'text-slate-400'}`}>No features found for this organization</div>
                    ) : (
                        <ScrollArea className="h-[280px] px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {availableFeatures
                                    .filter(f => f.name.toLowerCase().includes(featureSearch.toLowerCase()))
                                    .map(feature => {
                                        const isSelected = !!selectedFeatures[String(feature.id)];
                                        const access = selectedFeatures[String(feature.id)] || 'read';
                                        return (
                                            <div key={feature.id} className={`group relative flex flex-col p-3 rounded-xl border transition-all duration-300 ${isSelected
                                                ? (isDark ? 'bg-white/10 border-white/20 shadow-sm' : 'bg-white border-slate-200 shadow-sm')
                                                : (isDark ? 'bg-white/5 border-transparent hover:border-white/10' : 'bg-white/50 border-transparent hover:border-slate-200')
                                                }`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Checkbox id={`f-${feature.id}`} checked={isSelected} onCheckedChange={() => toggleFeature(feature.id)} className="data-[state=checked]:border-transparent" style={{ backgroundColor: isSelected ? themeGradient.from : undefined, borderColor: isSelected ? themeGradient.from : undefined }} />
                                                        <Label htmlFor={`f-${feature.id}`} className={`text-sm font-semibold truncate cursor-pointer transition-colors ${isSelected ? (isDark ? 'text-white' : 'text-slate-800') : (isDark ? 'text-white/60' : 'text-slate-500')}`}>
                                                            {feature.name}
                                                        </Label>
                                                    </div>
                                                    {isSelected && (
                                                        <Badge className="text-[10px]" style={{ background: access === 'write' ? themeGradient.from : '#94a3b8', color: 'white' }}>
                                                            {access.toUpperCase()}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <AnimatePresence>
                                                    {isSelected && (
                                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                            <div className={`flex items-center justify-between p-1.5 rounded-lg mt-1 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${access === 'read' ? (isDark ? 'bg-white/10 text-white' : 'bg-white text-slate-700 shadow-sm') : (isDark ? 'text-white/40' : 'text-slate-400')}`}>READ</span>
                                                                <Switch checked={access === 'write'} onCheckedChange={() => toggleAccessLevel(feature.id)} className="h-5 w-9" style={{ backgroundColor: access === 'write' ? themeGradient.from : undefined }} />
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${access === 'write' ? (isDark ? 'bg-white/10 text-white' : 'bg-white text-slate-700 shadow-sm') : (isDark ? 'text-white/40' : 'text-slate-400')}`}>WRITE</span>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl font-semibold text-white relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-70"
                style={{ background: `linear-gradient(135deg, ${themeGradient.from}, ${themeGradient.to})`, boxShadow: `0 8px 24px ${themeGradient.from}40` }}
            >
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Processing...</span> : <span className="flex items-center justify-center gap-2"><ShieldCheck className="w-5 h-5" />Create Protected Account</span>}
            </button>
        </form>
    )

    const render2FASetup = () => (
        <div className="space-y-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${themeGradient.from}20, ${themeGradient.to}20)` }}>
                <QrCode className="w-10 h-10" style={{ color: themeGradient.from }} />
            </div>
            <div>
                <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Link Authenticator App</h3>
                <div className={`p-3 rounded-xl inline-block mx-auto mt-2 mb-2 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Account: <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{userData?.username}</span></p>
                </div>
                <p className={`text-sm mt-2 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Scan with Google Authenticator or Authy</p>
            </div>

            {secretData && (
                <>
                    <div className={`p-4 rounded-xl border mx-auto w-fit ${isDark ? 'bg-white/10 border-white/10' : 'bg-white border-slate-200'}`}>
                        <img src={secretData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                    <div className={`p-4 rounded-lg flex items-center justify-between ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                        <span className={`text-xs font-mono ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Key: {secretData.tempSecret}</span>
                        <button onClick={copySecret} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-white'}`}>
                            <Copy className="w-4 h-4" style={{ color: themeGradient.from }} />
                        </button>
                    </div>
                    <button onClick={linkAuthenticator} className="w-full h-12 rounded-xl font-semibold text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${themeGradient.from}, ${themeGradient.to})`, boxShadow: `0 8px 24px ${themeGradient.from}40` }} disabled={loading}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <span className="flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" />I've Scanned the QR Code</span>}
                    </button>
                </>
            )}
        </div>
    )

    const renderWaitingApproval = () => (
        <div className="text-center space-y-6">
            <motion.div
                className="w-24 h-24 mx-auto rounded-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${themeGradient.from}20, ${themeGradient.to}20)` }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <Clock className="w-12 h-12" style={{ color: themeGradient.from }} />
            </motion.div>
            <div>
                <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Waiting for Approval</h3>
                <p className={isDark ? 'text-white/50' : 'text-slate-500'}>Your account is pending admin approval.</p>
            </div>
            <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Username: <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{userData?.username}</span></p>
                <p className="text-xs flex items-center justify-center gap-1 mt-2" style={{ color: themeGradient.from }}>
                    <CheckCircle2 className="w-4 h-4" /> Authenticator linked
                </p>
            </div>
            <button onClick={checkApprovalStatus} className="w-full h-12 rounded-xl font-semibold text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${themeGradient.from}, ${themeGradient.to})`, boxShadow: `0 8px 24px ${themeGradient.from}40` }} disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <span className="flex items-center justify-center gap-2"><RefreshCw className="w-5 h-5" />Check Approval Status</span>}
            </button>
            <button onClick={resetToLogin} className={`text-sm ${isDark ? 'text-white/40 hover:text-white/70' : 'text-slate-400 hover:text-slate-600'}`}>Back to Login</button>
        </div>
    )

    const renderOTPVerification = () => (
        <div className="space-y-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${themeGradient.from}20, ${themeGradient.to}20)` }}>
                <Smartphone className="w-10 h-10" style={{ color: themeGradient.from }} />
            </div>
            <div>
                <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Enter Verification Code</h3>
                <div className={`p-3 rounded-xl inline-block mx-auto mt-2 mb-2 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Verifying: <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{userData?.username}</span></p>
                </div>
                <p className={isDark ? 'text-white/40' : 'text-slate-400'}>Enter the 6-digit code from your authenticator</p>
            </div>
            <Input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} className={`h-16 text-center text-3xl tracking-[0.5em] font-mono ${isDark ? 'login-input-dark rounded-xl' : 'login-input-light rounded-xl'}`} placeholder="000000" maxLength={6} autoFocus disabled={loading} />
            <button onClick={verifyOTPAndLogin} disabled={loading || otpCode.length !== 6} className="w-full h-12 rounded-xl font-semibold text-white relative overflow-hidden disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${themeGradient.from}, ${themeGradient.to})`, boxShadow: `0 8px 24px ${themeGradient.from}40` }}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <span className="flex items-center justify-center gap-2"><ArrowRight className="w-5 h-5" />Verify & Login</span>}
            </button>
            <button onClick={resetToLogin} className={`text-sm ${isDark ? 'text-white/40 hover:text-white/70' : 'text-slate-400 hover:text-slate-600'}`}>Back to Login</button>
        </div>
    )

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: isDark ? '#020617' : '#f8fafc' }}>
            {/* Animated Mesh Gradient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="mesh-blob mesh-blob-1 w-[500px] h-[500px] -top-32 -left-32" />
                <div className="mesh-blob mesh-blob-2 w-[600px] h-[600px] top-1/3 -right-48" />
                <div className="mesh-blob mesh-blob-3 w-[450px] h-[450px] -bottom-32 left-1/4" />
                <div className="mesh-blob mesh-blob-4 w-[400px] h-[400px] top-1/4 left-1/2" />
            </div>

            {/* Floating Glass Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="glass-orb glass-orb-1 w-96 h-96 top-[10%] left-[5%] opacity-30" />
                <div className="glass-orb glass-orb-2 w-80 h-80 top-[60%] right-[8%] opacity-20" />
                <div className="glass-orb glass-orb-3 w-72 h-72 bottom-[15%] left-[20%] opacity-25" />
            </div>

            {/* Noise Texture Overlay */}
            <div className="noise-overlay" />

            {/* Theme Toggle - Top Right */}
            <button
                onClick={toggleMode}
                className={`fixed top-4 right-4 z-50 h-10 w-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${isDark ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white/60 backdrop-blur-md border border-white/40'}`}
                aria-label="Toggle theme"
            >
                {mode === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>

            <motion.div
                className={`w-full transition-all duration-500 relative z-10 ${flowState === 'signup' ? 'max-w-xl' : 'max-w-[420px]'}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
            >
                {/* Glassmorphism Card */}
                <div className={`relative overflow-hidden rounded-[28px] p-8 ${isDark ? 'glass-v3-dark' : 'glass-v3-light'}`}>
                    {/* Subtle inner glow */}
                    <div className="absolute inset-0 rounded-[28px] pointer-events-none" style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)' }} />

                    {/* Logo Area */}
                    <motion.div
                        className="flex flex-col items-center mb-6"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                    >
                        <div
                            className="h-[72px] w-[72px] rounded-2xl p-2 shadow-lg mb-4 relative z-10 flex items-center justify-center"
                            style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)'}`, ...glowRingStyle }}
                        >
                            <img src="/assets/logo_512x512.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>

                        {/* Title with gradient and shimmer */}
                        <h1
                            className="text-3xl font-bold tracking-tight text-center text-shimmer"
                            style={{
                                ...gradientTextStyle,
                                backgroundSize: '200% auto',
                            }}
                        >
                            Feature Tracking Dashboard
                        </h1>

                        {/* Subtitle */}
                        <motion.p
                            className={`mt-2 text-sm text-center ${isDark ? 'text-white/50' : 'text-slate-500'}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            Sign in to access analytics & insights
                        </motion.p>
                    </motion.div>

                    {/* Error Alert */}
                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-4">
                                <Alert variant="destructive" className="py-2 rounded-xl border-red-500/30 bg-red-500/10">
                                    <AlertDescription className="text-red-400">{error}</AlertDescription>
                                </Alert>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={flowState}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {(flowState === 'login' || flowState === 'signup') && renderTabs()}
                            {flowState === 'login' && renderLoginForm()}
                            {flowState === 'forgot' && renderForgotPassword()}
                            {flowState === 'signup' && renderSignupForm()}
                            {flowState === 'setup2fa' && render2FASetup()}
                            {flowState === 'waiting' && renderWaitingApproval()}
                            {flowState === 'verifyotp' && renderOTPVerification()}
                        </motion.div>
                    </AnimatePresence>

                    {/* Protected by Buyhatke Guard */}
                    <div className="text-center pt-6 mt-4 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.15)' }}>
                        <p className={`text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-1.5 ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
                            <ShieldCheck className="w-3 h-3 animate-pulse" style={{ color: themeGradient.from }} />
                            Protected by Buyhatke Guard
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className={`mt-6 text-center text-xs ${isDark ? 'text-white/15' : 'text-slate-400'}`}>
                    <p> 2026 Buyhatke Technologies Pvt. Ltd.</p>
                </div>
            </motion.div>
        </div>
    )
}
