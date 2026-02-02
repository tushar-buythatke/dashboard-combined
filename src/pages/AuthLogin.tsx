import { useState, useEffect, useRef, type FormEvent } from 'react'
import { Eye, EyeOff, Lock, User, LogIn, UserPlus, Clock, QrCode, Smartphone, CheckCircle2, RefreshCw, ArrowRight, Copy, Loader2, ShieldCheck, ShieldAlert, Settings2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

export default function AuthLogin() {
    const navigate = useNavigate()
    const location = useLocation()
    const { loginUser } = useAnalyticsAuth()
    
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

    // Redirect if already authenticated - only check on mount
    useEffect(() => {
        // Prevent if already navigating from OTP verification
        if (isNavigatingRef.current) return
        
        const stored = localStorage.getItem('dashboard_combined_auth')
        if (stored) {
            try {
                const sessionData = JSON.parse(stored)
                // Verify session is valid before redirecting
                if (sessionData.expiry && Date.now() < sessionData.expiry && sessionData.user) {
                    isNavigatingRef.current = true
                    const from = (location.state as any)?.from?.pathname || '/analytics'
                    navigate(from, { replace: true })
                }
            } catch (e) {
                // Invalid session data, don't redirect
                localStorage.removeItem('dashboard_combined_auth')
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Only run on mount to prevent navigation loops

    // Hardcoded features for local testing to avoid CORS/404 issues
    const MOCK_FEATURES: Feature[] = [
        { id: 1, name: "Price Alert" },
        { id: 2, name: "Auto Coupons" },
        { id: 3, name: "Spend Calculator" },
        { id: 4, name: "Spidy" },
        { id: 6, name: "lookAlike" },
        { id: 7, name: "PriceComparison" },
        { id: 8, name: "Grocery" },
        { id: 9, name: "Chat AI" },
        { id: 10, name: "Gift Voucher" },
        { id: 11, name: "Checkout" },
        { id: 12, name: "Cab Comparison" },
        { id: 13, name: "Deal Scanner" },
        { id: 14, name: "Coupon Scraper" },
        { id: 15, name: "Send Pair/Current" },
        { id: 16, name: "Price Data Consumer" },
        { id: 17, name: "Cloudflare API Monitoring" },
        { id: 18, name: "Pid Data Consumer" },
        { id: 19, name: "Search Api" },
        { id: 20, name: "Grocery Send Pair/Current" },
        { id: 21, name: "Buyhatke Website" },
        { id: 22, name: "Offers" },
        { id: 23, name: "Graph" },
        { id: 24, name: "Grocery Pid Data Consumer" },
        { id: 25, name: "Grocery Price Data Consumer" },
        { id: 26, name: "Buyhatke App Stats" }
    ];

    // Fetch features on mount
    useEffect(() => {
        // use hardcoded for now as requested
        setAvailableFeatures(MOCK_FEATURES);

        /* Uncomment when backend is ready/accessible
        const fetchFeatures = async () => {
            try {
                const response = await fetch(`${FEATURE_TRACKING_API}/featuresList?organizationId=0`)
                const result = await response.json()
                if (result.status === 1 && result.data?.featureMap) {
                    const features = Object.entries(result.data.featureMap).map(([id, name]) => ({
                        id: parseInt(id),
                        name: name as string
                    }))
                    setAvailableFeatures(features)
                }
            } catch (err) {
                console.error("Failed to fetch features:", err)
            }
        }
        fetchFeatures()
        */
    }, [])

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
                // Normalize user data - backend uses 'userId', frontend uses 'id'
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

        // Validate @buyhatke.com email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@buyhatke\.com$/i
        if (!emailRegex.test(username.trim())) {
            setError('Only @buyhatke.com email addresses are allowed')
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
                    dashboard_id: 1, // Feature Tracking
                    permissions: {
                        features: selectedFeatures
                    }
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
                body: JSON.stringify({
                    userId: userData.id,
                    secret: secretData.tempSecret
                })
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
        
        // Prevent double navigation
        if (isNavigatingRef.current) {
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${getAuthUrl()}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    token: otpCode
                })
            })

            const result = await response.json()
            if (result.status === 1) {
                // Normalize user data from backend to frontend format
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
                
                // Mark as navigating to prevent double navigation
                isNavigatingRef.current = true
                
                // Pass true for is2FAVerified to trigger IP whitelisting
                await loginUser(normalizedUser, true)
                toast.success('Login successful!')
                
                // Small delay to ensure state is persisted before navigation
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

    // Step 1: Check if user exists
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
                body: JSON.stringify({
                    userName: resetEmail.trim()
                })
            })

            const result = await response.json()
            if (result.status === 1) {
                setResetUserData({
                    userId: result.data.userId,
                    userName: result.data.userName
                })
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

    // Step 2: Verify OTP
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
                body: JSON.stringify({
                    userName: resetEmail.trim(),
                    otp: resetOtp.trim()
                })
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

    // Step 3: Reset password
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
                body: JSON.stringify({
                    userName: resetEmail.trim(),
                    newPassword: resetPassword.trim()
                })
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
    }

    // Render functions
    const renderTabs = () => (
        <div className="flex rounded-xl bg-muted p-1 mb-6">
            <button
                onClick={() => { setFlowState('login'); setUsername(''); setPassword(''); setError(null) }}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${flowState === 'login' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
            >
                <LogIn className="w-4 h-4" />Sign In
            </button>
            <button
                onClick={() => { setFlowState('signup'); setUsername(''); setPassword(''); setError(null) }}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${flowState === 'signup' ? 'bg-background text-emerald-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
            >
                <UserPlus className="w-4 h-4" />Sign Up
            </button>
        </div>
    )

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

    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />Username
                </Label>
                <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="yourname@buyhatke.com"
                    disabled={loading}
                    className="h-12"
                />
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground ml-1 italic">
                Use your official @buyhatke.com email
            </p>

            <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />Password
                </Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        disabled={loading}
                        className="h-12 pr-12"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            <Button type="submit" className="w-full h-12" disabled={loading}>
                {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Signing In...</> : <>Sign In</>}
            </Button>

            <div className="text-center">
                <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-sm text-primary hover:underline font-medium"
                    disabled={loading}
                >
                    Forgot your password?
                </button>
            </div>
        </form>
    )

    const renderForgotPassword = () => {
        // Step 1: Enter Email
        if (forgotStep === 'email') {
            return (
                <form onSubmit={handleForgotEmailSubmit} className="space-y-5">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold">Reset Password</h3>
                        <p className="text-sm text-muted-foreground">Enter your username or email to verify your account</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><User className="h-4 w-4 text-primary" />Username or Email</Label>
                        <Input
                            type="text"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="Enter username or email"
                            disabled={resetLoading}
                            className="h-12"
                            autoFocus
                        />
                    </div>

                    <Button type="submit" className="w-full h-12" disabled={resetLoading}>
                        {resetLoading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Checking...</> : <>Continue</>}
                    </Button>

                    <div className="text-center">
                        <button type="button" onClick={resetToLogin} className="text-sm text-muted-foreground hover:text-foreground">
                            ← Back to login
                        </button>
                    </div>
                </form>
            )
        }

        // Step 2: Enter OTP
        if (forgotStep === 'otp') {
            return (
                <form onSubmit={handleForgotOtpSubmit} className="space-y-5">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                            <Smartphone className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold">Enter OTP</h3>
                        <p className="text-sm text-muted-foreground">
                            Enter the 6-digit code from your authenticator app
                        </p>
                        {resetUserData && (
                            <div className="bg-muted p-2 rounded-lg mt-2">
                                <p className="text-xs text-muted-foreground">
                                    Account: <span className="font-semibold text-foreground">{resetUserData.userName}</span>
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" />Authenticator OTP</Label>
                        <Input
                            type="text"
                            value={resetOtp}
                            onChange={(e) => setResetOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            disabled={resetLoading}
                            className="h-12 text-center text-2xl tracking-widest font-mono"
                            autoFocus
                        />
                    </div>

                    <Button type="submit" className="w-full h-12" disabled={resetLoading || resetOtp.length !== 6}>
                        {resetLoading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Verifying...</> : <>Verify OTP</>}
                    </Button>

                    <div className="text-center space-y-2">
                        <button
                            type="button"
                            onClick={() => {
                                setForgotStep('email')
                                setResetOtp('')
                                setError(null)
                            }}
                            className="text-sm text-muted-foreground hover:text-foreground"
                        >
                            ← Back to email
                        </button>
                    </div>
                </form>
            )
        }

        // Step 3: Set New Password
        return (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                        <ShieldCheck className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-bold">Set New Password</h3>
                    <p className="text-sm text-muted-foreground">Create a new password for your account</p>
                    {resetUserData && (
                        <div className="bg-muted p-2 rounded-lg mt-2">
                            <p className="text-xs text-muted-foreground">
                                Account: <span className="font-semibold text-foreground">{resetUserData.userName}</span>
                            </p>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" />New Password</Label>
                    <Input
                        type="password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        disabled={resetLoading}
                        className="h-12"
                        autoFocus
                    />
                </div>

                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" />Confirm Password</Label>
                    <Input
                        type="password"
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        disabled={resetLoading}
                        className="h-12"
                    />
                </div>

                <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" disabled={resetLoading || !resetPassword || !resetConfirmPassword}>
                    {resetLoading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Updating...</> : <>Reset Password</>}
                </Button>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setForgotStep('otp')
                            setResetPassword('')
                            setResetConfirmPassword('')
                            setError(null)
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        ← Back to OTP
                    </button>
                </div>
            </form>
        )
    }

    const renderSignupForm = () => (
        <form onSubmit={handleSignup} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><User className="w-4 h-4 text-emerald-600" />Username</Label>
                    <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="yourname@buyhatke.com"
                        disabled={loading}
                        className="h-11"
                    />
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground ml-1 italic">
                    Registration requires a @buyhatke.com email
                </p>

                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-600" />Password</Label>
                    <div className="relative">
                        <Input
                            type={showSignupPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min. 6 characters"
                            disabled={loading}
                            className="h-11 pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-emerald-600" />
                        <Label className="text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            Feature Access Permissions
                        </Label>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-900/50 p-2 rounded-xl border border-emerald-100 shadow-sm">
                    <Input
                        type="text"
                        placeholder="Search features (e.g. 'Price', 'Calcul') ..."
                        value={featureSearch}
                        onChange={(e) => setFeatureSearch(e.target.value)}
                        className="h-9 border-none bg-transparent shadow-none focus-visible:ring-0"
                    />
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100 shrink-0">
                        {availableFeatures.filter(f => f.name.toLowerCase().includes(featureSearch.toLowerCase())).length} Available
                    </Badge>
                </div>

                <div className="rounded-2xl border bg-muted/30 overflow-hidden shadow-inner">
                    <ScrollArea className="h-[280px] px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {availableFeatures
                                .filter(f => f.name.toLowerCase().includes(featureSearch.toLowerCase()))
                                .map(feature => {
                                    const isSelected = !!selectedFeatures[String(feature.id)];
                                    const access = selectedFeatures[String(feature.id)] || 'read';

                                    return (
                                        <div
                                            key={feature.id}
                                            className={`group relative flex flex-col p-3 rounded-xl border transition-all duration-300 ${isSelected
                                                ? 'bg-white dark:bg-slate-800 border-emerald-200 shadow-sm ring-1 ring-emerald-100'
                                                : 'bg-white/50 dark:bg-slate-900/50 border-transparent hover:border-slate-200'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Checkbox
                                                        id={`f-${feature.id}`}
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleFeature(feature.id)}
                                                        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                                    />
                                                    <Label
                                                        htmlFor={`f-${feature.id}`}
                                                        className={`text-sm font-semibold truncate cursor-pointer transition-colors ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                                                            }`}
                                                    >
                                                        {feature.name}
                                                    </Label>
                                                </div>

                                                {isSelected && (
                                                    <Badge className={access === 'write' ? 'bg-teal-500' : 'bg-slate-400'}>
                                                        {access.toUpperCase()}
                                                    </Badge>
                                                )}
                                            </div>

                                            <AnimatePresence>
                                                {isSelected && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg mt-1 border border-slate-100 dark:border-slate-800">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${access === 'read' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>READ</span>
                                                            <Switch
                                                                checked={access === 'write'}
                                                                onCheckedChange={() => toggleAccessLevel(feature.id)}
                                                                className="h-5 w-9 data-[state=checked]:bg-emerald-500"
                                                            />
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${access === 'write' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>WRITE</span>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-none" disabled={loading}>
                {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Processing...</> : <><ShieldCheck className="w-5 h-5 mr-2" />Create Protected Account</>}
            </Button>
        </form>
    )

    const render2FASetup = () => (
        <div className="space-y-6 text-center">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <QrCode className="w-10 h-10 text-primary" />
            </div>
            <div>
                <h3 className="text-2xl font-bold">Link Authenticator App</h3>

                <div className="bg-muted p-3 rounded-xl inline-block mx-auto mt-2 mb-2 border">
                    <p className="text-sm text-muted-foreground">
                        Account: <span className="font-semibold text-foreground">{userData?.username}</span>
                    </p>
                </div>

                <p className="text-muted-foreground text-sm mt-2">Scan with Google Authenticator or Authy</p>
            </div>

            {secretData && (
                <>
                    <div className="bg-white p-4 rounded-xl border mx-auto w-fit">
                        <img src={secretData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                    </div>

                    <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
                        <span className="text-xs font-mono">Key: {secretData.tempSecret}</span>
                        <button onClick={copySecret} className="p-2 hover:bg-background rounded-lg">
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>

                    <Button onClick={linkAuthenticator} className="w-full h-12" disabled={loading}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                        I've Scanned the QR Code
                    </Button>
                </>
            )}
        </div>
    )

    const renderWaitingApproval = () => (
        <div className="text-center space-y-6">
            <motion.div
                className="w-24 h-24 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <Clock className="w-12 h-12 text-amber-600" />
            </motion.div>

            <div>
                <h3 className="text-2xl font-bold">Waiting for Approval</h3>
                <p className="text-muted-foreground">Your account is pending admin approval.</p>
            </div>

            <div className="bg-muted p-4 rounded-xl">
                <p className="text-sm">Username: <span className="font-semibold">{userData?.username}</span></p>
                <p className="text-xs text-emerald-600 flex items-center justify-center gap-1 mt-2">
                    <CheckCircle2 className="w-4 h-4" /> Authenticator linked
                </p>
            </div>

            <Button onClick={checkApprovalStatus} className="w-full h-12" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <RefreshCw className="w-5 h-5 mr-2" />}
                Check Approval Status
            </Button>

            <button onClick={resetToLogin} className="text-sm text-muted-foreground hover:text-foreground">
                ← Back to Login
            </button>
        </div>
    )

    const renderOTPVerification = () => (
        <div className="space-y-6 text-center">
            <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <Smartphone className="w-10 h-10 text-emerald-600" />
            </div>

            <div>
                <h3 className="text-2xl font-bold">Enter Verification Code</h3>

                <div className="bg-muted p-3 rounded-xl inline-block mx-auto mt-2 mb-2 border">
                    <p className="text-sm text-muted-foreground">
                        Verifying: <span className="font-semibold text-foreground">{userData?.username}</span>
                    </p>
                </div>

                <p className="text-muted-foreground">Enter the 6-digit code from your authenticator</p>
            </div>

            <Input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="h-16 text-center text-3xl tracking-[0.5em] font-mono"
                placeholder="000000"
                maxLength={6}
                autoFocus
                disabled={loading}
            />

            <Button onClick={verifyOTPAndLogin} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" disabled={loading || otpCode.length !== 6}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRight className="w-5 h-5 mr-2" />}
                Verify & Login
            </Button>

            <button onClick={resetToLogin} className="text-sm text-muted-foreground hover:text-foreground">
                ← Back to Login
            </button>
        </div>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
            <motion.div
                className={`w-full transition-all duration-500 ${flowState === 'signup' ? 'max-w-xl' : 'max-w-md'}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Card className="border shadow-2xl relative overflow-hidden">
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />

                    <CardHeader className="text-center pb-4 pt-8 shrink-0">
                        <div className="h-20 w-20 rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-lg mx-auto mb-4 border border-slate-50 relative z-10">
                            <img src="/assets/logo_512x512.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <CardTitle className="text-3xl font-black bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                            Feature Tracking Dashboard
                        </CardTitle>
                        <CardDescription className="mt-2">Sign in to access analytics & insights</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <AnimatePresence shrink-0>
                            {error && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                    <Alert variant="destructive" className="py-2">
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence mode="wait">
                            <motion.div key={flowState} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                {(flowState === 'login' || flowState === 'signup') && renderTabs()}
                                {flowState === 'login' && renderLoginForm()}
                                {flowState === 'forgot' && renderForgotPassword()}
                                {flowState === 'signup' && renderSignupForm()}
                                {flowState === 'setup2fa' && render2FASetup()}
                                {flowState === 'waiting' && renderWaitingApproval()}
                                {flowState === 'verifyotp' && renderOTPVerification()}
                            </motion.div>
                        </AnimatePresence>

                        <div className="text-center pt-2">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-50">
                                Protected by Buyhatke Guard
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="mt-6 text-center text-xs text-muted-foreground">
                    <p>© 2025 Buyhatke Technologies Pvt. Ltd.</p>
                </div>
            </motion.div>
        </div>
    )
}
