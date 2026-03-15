import { useEffect, useState } from 'react';
import { Plus, FileText, Trash2, LogOut, Moon, Sun, Copy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../lib/router';
import { supabase, Roadmap } from '../lib/supabase';
import salesforceLogo from '../assets/69416b267de7ae6888996981_logo_(1).svg';
import astroImage from '../assets/Newastro.png';
import astroGif from '../assets/ASTRO_Tshirt_RunRight_SFS19_2000px.gif';
import astroFloatingGif from '../assets/ASTRO_NoOutfitTriangle_RingFront_Shadow_SFS20_300px.gif';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

export default function Dashboard() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; roadmapId: string; roadmapTitle: string }>({
    isOpen: false,
    roadmapId: '',
    roadmapTitle: ''
  });
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
        },
        {
          id: 'g2',
          number: 'Goal #2',
          title: 'Customer Retention',
          color: '#45C65A',
          initiatives: [
            {
              id: 'i2',
              label: 'Key Initiative',
              activities: { q1: [], q2: [], q3: [], q4: [] }
            }
          ]
        },
        {
          id: 'g3',
          number: 'Goal #3',
          title: 'Product Adoption',
          color: '#F38303',
          initiatives: [
            {
              id: 'i3',
              label: 'Key Initiative',
              activities: { q1: [], q2: [], q3: [], q4: [] }
            }
          ]
        }
      ]
    };

    const { data, error} = await supabase
      .from('roadmaps')
      .insert([
        {
          user_id: user?.id,
          title: 'New Success Path',
          data: defaultData,
          fiscal_start_month: 0,
          base_fiscal_year: 26,
          roadmap_start_quarter: 1
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

  const duplicateRoadmap = async (roadmap: Roadmap) => {
    const { data, error } = await supabase
      .from('roadmaps')
      .insert([
        {
          user_id: user?.id,
          title: `Copy of ${roadmap.title}`,
          data: roadmap.data,
          fiscal_start_month: roadmap.fiscal_start_month,
          base_fiscal_year: roadmap.base_fiscal_year,
          roadmap_start_quarter: roadmap.roadmap_start_quarter,
          customer_logo_base64: roadmap.customer_logo_base64
        }
      ])
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error duplicating roadmap:', error);
    } else if (data) {
      loadRoadmaps();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  const getFirstName = () => {
    if (!user?.email) return 'there';
    const emailPrefix = user.email.split('@')[0];
    const firstName = emailPrefix.split('.')[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  };

  const getTotalActivities = (roadmap: Roadmap) => {
    let total = 0;
    roadmap.data.goals.forEach(goal => {
      goal.initiatives.forEach(initiative => {
        total += initiative.activities.q1.length;
        total += initiative.activities.q2.length;
        total += initiative.activities.q3.length;
        total += initiative.activities.q4.length;
      });
    });
    if (roadmap.data.accountSpanning) {
      total += roadmap.data.accountSpanning.length;
    }
    return total;
  };

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg-app)' }}>
      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }
        .floating-astro {
          animation: bounce 2s ease-in-out infinite;
        }
      `}</style>
      <div className="border-b sticky top-0 z-50" style={{ borderColor: '#e5e7eb', background: 'white' }}>
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold" style={{ color: '#001e5b' }}>
              Success Path Builder
            </h1>
            <img src={salesforceLogo} alt="Salesforce" className="h-8" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: '#001e5b' }}>{user?.email}</span>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors"
              style={{ color: '#001e5b' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-semibold border"
              style={{ color: '#001e5b', borderColor: '#001e5b', background: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0B5CAB 0%, #00B3FF 100%)',
        }}
      >
        <div className="max-w-6xl mx-auto px-8 py-16 flex items-center justify-between gap-12">
          <div className="flex-1">
            <h2 className="text-4xl font-bold mb-4 text-white">
              Welcome back, {getFirstName()}!
            </h2>
            <p className="text-xl text-white/90">
              Build and manage your customer success paths
            </p>
          </div>
          <div className="flex-shrink-0">
            <img
              src={astroImage}
              alt="Salesforce Astro"
              className="w-80 h-80 object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>My Success Paths</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Create and manage your customer success paths</p>
          </div>
          <button
            onClick={createRoadmap}
            className="flex items-center gap-2 px-5 py-3 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5 shadow-lg"
            style={{ background: '#066afe' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#0554d1'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#066afe'}
          >
            <Plus size={20} />
            New Success Path
          </button>
        </div>

        {roadmaps.length === 0 ? (
          <div className="text-center py-20">
            <img src={astroGif} alt="Astro" className="w-32 h-32 mx-auto mb-6 object-contain" />
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>No roadmaps yet</h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Create your first roadmap to get started</p>
            <button
              onClick={createRoadmap}
              className="inline-flex items-center gap-2 px-5 py-3 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5 shadow-lg"
              style={{ background: '#066afe' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0554d1'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#066afe'}
            >
              <Plus size={20} />
              Create Roadmap
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadmaps.map((roadmap) => {
              const firstGoalColor = roadmap.data.goals[0]?.color || '#00B3FF';
              const totalActivities = getTotalActivities(roadmap);

              return (
                <div
                  key={roadmap.id}
                  className="border rounded-xl overflow-hidden transition-all cursor-pointer group hover:shadow-xl relative"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = firstGoalColor;
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                  }}
                  onClick={() => navigate(`/roadmap/${roadmap.id}`)}
                >
                  <div
                    className="h-1.5"
                    style={{ background: firstGoalColor }}
                  />
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      {roadmap.customer_logo_base64 ? (
                        <img
                          src={roadmap.customer_logo_base64}
                          alt="Customer logo"
                          className="w-10 h-10 object-contain rounded-lg"
                        />
                      ) : (
                        <FileText size={32} style={{ color: firstGoalColor }} />
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateRoadmap(roadmap);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-blue-500/10 hover:text-blue-600 rounded-lg transition-all"
                          style={{ color: 'var(--text-secondary)' }}
                          title="Duplicate roadmap"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({
                              isOpen: true,
                              roadmapId: roadmap.id,
                              roadmapTitle: roadmap.title
                            });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-[#e8194b]/10 hover:text-[#e8194b] rounded-lg transition-all"
                          style={{ color: 'var(--text-secondary)' }}
                          title="Delete roadmap"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold mb-3 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                      {roadmap.title}
                    </h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: firstGoalColor }} />
                        <span>{roadmap.data.goals.length} goal{roadmap.data.goals.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: firstGoalColor }} />
                        <span>{totalActivities} activit{totalActivities !== 1 ? 'ies' : 'y'}</span>
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Updated {new Date(roadmap.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {roadmaps.length < 3 && (
        <div className="fixed bottom-4 right-4 floating-astro pointer-events-none z-50">
          <img
            src={astroFloatingGif}
            alt="Astro"
            className="w-96 h-96 object-contain transition-opacity"
            style={{ opacity: 1 }}
          />
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, roadmapId: '', roadmapTitle: '' })}
        onConfirm={() => deleteRoadmap(deleteModal.roadmapId)}
        roadmapTitle={deleteModal.roadmapTitle}
      />
    </div>
  );
}
