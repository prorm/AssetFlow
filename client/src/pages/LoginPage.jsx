import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState('credentials'); // 'credentials' or 'otp' (signup only)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        // Direct login — no OTP
        await login(email, password);
        navigate('/dashboard');
      } else {
        // Signup — sends OTP to email
        const res = await signup(name, email, password);
        if (res.requiresVerification) {
          setStep('otp');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptLTQgOHYyaC0ydi0yaDJ6bTQgMHYyaC0ydi0yaDJ6bS00LTR2MmgtMnYtMmgyem0wLTR2MmgtMnYtMmgyem04IDR2MmgtMnYtMmgyem0wIDR2MmgtMnYtMmgyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-foreground/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary-foreground">AssetFlow</span>
          </div>
          <p className="text-primary-foreground/70 text-sm">Enterprise Asset Management</p>
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-primary-foreground leading-tight">
            Track, manage &<br />optimize your assets<br />
            <span className="text-primary-foreground/60">effortlessly.</span>
          </h1>
          <p className="text-primary-foreground/70 max-w-md">
            From allocation to audits, AssetFlow gives your organization full visibility and
            control over every asset in real time.
          </p>
        </div>
        <p className="relative z-10 text-primary-foreground/60 text-sm">© 2026 AssetFlow. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">AssetFlow</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {step === 'otp' ? 'Verify your Email' : (isLogin ? 'Welcome back' : 'Create your account')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === 'otp'
                ? `We sent a 6-digit code to ${email}. Check your inbox (or server console in dev mode).`
                : (isLogin
                  ? 'Enter your credentials to access your account.'
                  : 'Fill in your details to get started.')}
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 'otp' ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="otp" className="text-sm font-medium text-foreground">
                  6-Digit Verification Code
                </label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify & Create Account'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  className="text-primary font-medium hover:underline"
                  onClick={() => { setStep('credentials'); setError(''); }}
                >
                  Back to signup
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-foreground">
                    Full Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => alert('Password reset email sent (mock)')}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {isLogin ? 'Signing in…' : 'Creating account…'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          )}

          {step === 'credentials' && (
            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
