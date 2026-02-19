import { useEffect, useState } from 'react';
import { Plus, FileText, Trash2, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../lib/router';
import { supabase, Roadmap } from '../lib/supabase';

export default function Dashboard() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    loadRoadmaps();
  }, []);

  const loadRoadmaps = async () => {
    const { data, error } = await supabase
      .from('roadmaps')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading roadmaps:', error);
    } else {
      setRoadmaps(data || []);
    }
    setLoading(false);
  };

  const createRoadmap = async () => {
    const defaultData = {
      goals: [
        {
          id: 'g1',
          number: 'Goal #1',
          title: 'New Business Growth',
          color: '#6c63ff',
          initiatives: [
            {
              id: 'i1',
              label: 'Key Initiative',
              activities: { q1: [], q2: [], q3: [], q4: [] }
            }
          ]
        }
      ]
    };

    const { data, error } = await supabase
      .from('roadmaps')
      .insert([
        {
          user_id: user?.id,
          title: 'New Roadmap',
          data: defaultData
        }
      ])
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error creating roadmap:', error);
    } else if (data) {
      navigate(`/roadmap/${data.id}`);
    }
  };

  const deleteRoadmap = async (id: string) => {
    if (!confirm('Delete this roadmap?')) return;

    const { error } = await supabase
      .from('roadmaps')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting roadmap:', error);
    } else {
      loadRoadmaps();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="border-b sticky top-0 z-50" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-extrabold" style={{ color: 'var(--text)' }}>
            Success Path Builder
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{user?.email}</span>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors"
              style={{ background: 'var(--surface2)', color: 'var(--text)' }}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
              style={{ background: 'var(--surface2)', color: 'var(--text)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface2)'}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>My Roadmaps</h2>
            <p style={{ color: 'var(--text-muted)' }}>Create and manage your success roadmaps</p>
          </div>
          <button
            onClick={createRoadmap}
            className="flex items-center gap-2 px-5 py-3 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
          >
            <Plus size={20} />
            New Roadmap
          </button>
        </div>

        {roadmaps.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={64} className="mx-auto mb-4" style={{ color: 'var(--border)' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>No roadmaps yet</h3>
            <p className="mb-6" style={{ color: 'var(--text-muted)' }}>Create your first roadmap to get started</p>
            <button
              onClick={createRoadmap}
              className="inline-flex items-center gap-2 px-5 py-3 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
            >
              <Plus size={20} />
              Create Roadmap
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadmaps.map((roadmap) => (
              <div
                key={roadmap.id}
                className="border rounded-xl p-6 transition-all cursor-pointer group hover:shadow-lg"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                onClick={() => navigate(`/roadmap/${roadmap.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <FileText size={32} style={{ color: 'var(--primary)' }} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRoadmap(roadmap.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-[#e8194b]/10 hover:text-[#e8194b] rounded-lg transition-all"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3 className="text-lg font-bold mb-2 line-clamp-2" style={{ color: 'var(--text)' }}>
                  {roadmap.title}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  {roadmap.data.goals.length} goal{roadmap.data.goals.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Updated {new Date(roadmap.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
