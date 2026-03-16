import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useLocation, useNavigate } from './lib/router';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import RoadmapBuilder from './pages/RoadmapBuilder';
import ResetPassword from './pages/ResetPassword';
import { ImportWorkspace } from './pages/ImportWorkspace';
import { ImportStagingPage } from './pages/ImportStagingPage';

// Main router component that handles authentication and page routing
function Router() {
  const { user, loading, isSignedOut } = useAuth();
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

  // Only redirect if user is definitively signed out (not just temporarily null during refresh)
  if (isSignedOut && pathname !== '/login' && pathname !== '/signup') {
    navigate('/login');
    return <Login />;
  }

  // If user is null but not signed out, show loading state (session is refreshing)
  if (!user && !isSignedOut && pathname !== '/login' && pathname !== '/signup') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading session...</div>
      </div>
    );
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

  const importWorkspaceMatch = pathname.match(/^\/import-workspace\/(.+)$/);
  if (importWorkspaceMatch) {
    return <ImportWorkspace roadmapId={importWorkspaceMatch[1]} />;
  }

  const importStagingMatch = pathname.match(/^\/import-staging\/([^/]+)\/(.+)$/);
  if (importStagingMatch) {
    return <ImportStagingPage roadmapId={importStagingMatch[1]} batchId={importStagingMatch[2]} />;
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
