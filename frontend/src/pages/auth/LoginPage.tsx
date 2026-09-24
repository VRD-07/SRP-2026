import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, LogIn, ShieldAlert, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassButton } from '../../components/ui/GlassButton';
import { apiRequest } from '../../services/api';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest<{
        success: boolean;
        message: string;
        data: { token: string; user: any };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res.success && res.data) {
        login(res.data.token, res.data.user);

        // Redirect to role-specific dashboard
        if (res.data.user.role === 'ADMIN') {
          navigate('/admin');
        } else if (res.data.user.role === 'TEACHER') {
          navigate('/teacher/mark');
        } else if (res.data.user.role === 'CLERK') {
          navigate('/clerk');
        } else if (res.data.user.role === 'STUDENT') {
          navigate('/student');
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative selection:bg-olive-600 selection:text-white">
      {/* Ambient Animated Mesh Background */}
      <div className="ambient-mesh-bg" />

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-olive-700 via-olive-600 to-olive-500 text-white shadow-xl shadow-olive-600/25 mb-2">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">
            AURA <span className="text-olive-600">ERP</span>
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            College Academic & Revenue Bursar Suite
          </p>
        </div>

        {/* Login Glass Card */}
        <GlassCard variant="elevated" className="p-6 sm:p-8 space-y-6 border border-white/80 shadow-glassElevated">
          <div>
            <h2 className="text-lg font-bold text-charcoal">Sign In</h2>
            <p className="text-xs text-muted mt-1">
              Enter your institutional credentials to access your portal
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-terracotta/15 border border-terracotta/30 text-xs text-terracotta flex items-start gap-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <GlassInput
              label="Email Address / User ID"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@college.edu"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <GlassInput
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <GlassButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
              rightIcon={<LogIn className="w-4 h-4" />}
            >
              Sign In to Portal
            </GlassButton>
          </form>

          {/* Quick Demo Logins for Client Demo */}
          <div className="pt-4 border-t border-olive-500/15">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              Quick Demo Access (1-Click Fill):
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@college.edu', 'Admin@123')}
                className="px-2 py-2.5 rounded-xl text-xs font-semibold bg-stone-500/10 hover:bg-stone-500/20 text-stone-700 border border-stone-500/20 transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('teacher.sunita@college.edu', 'Teacher@123')}
                className="px-2 py-2.5 rounded-xl text-xs font-semibold bg-olive-500/15 hover:bg-olive-500/25 text-olive-800 border border-olive-500/25 transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Teacher</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('clerk.raj@college.edu', 'Clerk@123')}
                className="px-2 py-2.5 rounded-xl text-xs font-semibold bg-spruce/15 hover:bg-spruce/25 text-spruce-700 border border-spruce/25 transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Clerk</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('student.aarav@college.edu', 'Student@123')}
                className="px-2 py-2.5 rounded-xl text-xs font-semibold bg-gold/15 hover:bg-gold/25 text-gold-700 border border-gold/25 transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Student</span>
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Footer info */}
        <p className="text-center text-[11px] text-muted">
          Metropolitan Institute of Technology & Higher Studies • ERP Core v1.0
        </p>
      </div>
    </div>
  );
};
