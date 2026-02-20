import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useLocation, useNavigate } from './lib/router';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import RoadmapBuilder from './pages/RoadmapBuilder';
import ResetPassword from './pages/ResetPassword';

function Router() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  if (pathname === '/reset-password') {
    return <ResetPassword />;
  }

  if (!user && pathname !== '/login' && pathname !== '/signup') {
    navigate('/login');
    return <Login />;
  }

  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
    navigate('/dashboard');
    return <Dashboard />;
  }

  if (pathname === '/login') return <Login />;
  if (pathname === '/signup') return <Signup />;
  if (pathname === '/dashboard') return <Dashboard />;

  const roadmapMatch = pathname.match(/^\/roadmap\/(.+)$/);
  if (roadmapMatch) {
    return <RoadmapBuilder roadmapId={roadmapMatch[1]} />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
