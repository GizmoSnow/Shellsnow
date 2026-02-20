import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../lib/router';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery event detected');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Failed to reset password');
      setLoading(false);
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
          <p style={{ color: 'var(--text-muted)' }}>Reset your password</p>
        </div>

        <div className="border rounded-2xl p-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {success ? (
            <div className="text-center space-y-4">
              <div className="bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded-lg px-4 py-6">
                <p className="text-[#00d4aa] font-semibold mb-2">Password reset successful!</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Redirecting to login...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                  New Password
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

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6c63ff] hover:bg-[#5a52e0] text-white font-semibold py-3 rounded-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting password...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Remember your password?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-[#6c63ff] hover:text-[#5a52e0] font-semibold"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
