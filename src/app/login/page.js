"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          if (data.user.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/');
          }
        }
      });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!email || !password || (isRegister && !name)) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister ? { name, email, password } : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setSuccess(isRegister ? 'Account created! Redirecting...' : 'Welcome back! Redirecting...');
      
      setTimeout(() => {
        if (data.user?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/');
        }
      }, 1000);
    } catch (err) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-[var(--surface-container-low)] rounded-[32px] p-6 shadow-[var(--el-2)]">
        
        {/* Logo & Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-[var(--primary-container)] text-[var(--on-primary-container)] rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-black italic">C</span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--on-surface)] mb-2">Curius Cricket</h1>
          <p className="text-[15px] text-[var(--on-surface-variant)] leading-relaxed">
            {isRegister ? 'Create your account to join the squad' : 'Sign in to your cricket club portal'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-[var(--error-container)] text-[var(--on-error-container)] flex items-center gap-3 text-sm font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--error)] shrink-0" />
            {error}
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-[var(--success-container)] text-[var(--on-success-container)] flex items-center gap-3 text-sm font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] shrink-0" />
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {isRegister && (
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-[var(--on-surface)] uppercase tracking-wider" htmlFor="login-name">Full Name</label>
              <input
                id="login-name"
                type="text"
                placeholder="Enter your name"
                className="h-[52px] px-4 rounded-2xl bg-[var(--surface-container-highest)] border border-[var(--outline-variant)] text-[15px] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-[var(--on-surface)] uppercase tracking-wider" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              placeholder="name@example.com"
              className="h-[52px] px-4 rounded-2xl bg-[var(--surface-container-highest)] border border-[var(--outline-variant)] text-[15px] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-2 mb-2">
            <label className="text-[13px] font-bold text-[var(--on-surface)] uppercase tracking-wider" htmlFor="login-password">Password</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full h-[52px] pl-4 pr-12 rounded-2xl bg-[var(--surface-container-highest)] border border-[var(--outline-variant)] text-[15px] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors rounded-full"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            full
            disabled={loading}
          >
            {loading ? 'Processing…' : isRegister ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        {/* Toggle */}
        <div className="mt-8 text-center text-[14px] text-[var(--on-surface-variant)]">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}
            className="font-bold text-[var(--primary)] hover:underline ml-1"
          >
            {isRegister ? 'Sign in here' : 'Create account'}
          </button>
        </div>

        <p className="mt-8 text-center text-[12px] text-[var(--outline)] font-medium">Powered by Curius Cricket Club</p>
      </div>
    </div>
  );
}
