import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../lib/router';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        console.error('Login error:', error);
        setError(error.message || 'Failed to sign in');
        setLoading(false);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setResetLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setResetSent(true);
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: 'var(--bg)' }}>
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-lg transition-colors"
        style={{ background: 'var(--surface)', color: 'var(--text)' }}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#6c63ff] to-[#00d4aa] bg-clip-text text-transparent mb-2">
            Success Path Builder
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Sign in to manage your roadmaps</p>
        </div>

        <div className="border rounded-2xl p-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-[#6c63ff] transition-colors"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-[#6c63ff] transition-colors"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-[#e8194b]/10 border border-[#e8194b]/30 rounded-lg px-4 py-3 text-[#e8194b] text-sm">
                {error}
              </div>
            )}

            {resetSent && (
              <div className="bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded-lg px-4 py-3 text-[#00d4aa] text-sm">
                Password reset email sent! Check your inbox.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#6c63ff] hover:bg-[#5a52e0] text-white font-semibold py-3 rounded-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={handleForgotPassword}
              disabled={resetLoading}
              className="text-sm text-[#6c63ff] hover:text-[#5a52e0] font-semibold disabled:opacity-50"
            >
              {resetLoading ? 'Sending...' : 'Forgot Password?'}
            </button>
          </div>

          <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-[#6c63ff] hover:text-[#5a52e0] font-semibold"
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
