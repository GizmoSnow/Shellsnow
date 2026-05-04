import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Save, User, X } from 'lucide-react';
import { useNavigate } from '../lib/router';
import { supabase } from '../lib/supabase';
import type { OrgRow, TeamMember, RoadmapData } from '../lib/supabase';

interface AccountDetailsProps {
  roadmapId: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 9);
}

function emptyOrgRow(): OrgRow {
  return { id: uid(), accountName: '', products: '', instanceUrl: '', maintenanceUrl: '', orgId: '', notes: '' };
}

function emptyMember(): TeamMember {
  return { id: uid(), photoUrl: '', name: '', title: '', pronouns: '', email: '', phone: '' };
}

const INPUT_CLS = 'w-full px-2 py-1.5 rounded-lg text-sm focus:outline-none transition-colors';
const inputStyle = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-primary)',
};

// ─── MemberCard ──────────────────────────────────────────────────────────────

interface MemberCardProps {
  member: TeamMember;
  onUpdate: (field: keyof TeamMember, value: string) => void;
  onRemove: () => void;
}

function MemberCard({ member, onUpdate, onRemove }: MemberCardProps) {
  return (
    <div className="rounded-xl border p-4 relative flex flex-col gap-2" style={{ background: 'var(--surface)', borderColor: 'var(--border-subtle)' }}>
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 p-1 rounded transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
        title="Remove member"
      >
        <X size={14} />
      </button>

      {/* Avatar + name/title */}
      <div className="flex items-center gap-3 pr-6">
        <div
          className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: 'var(--bg-shell)', border: '1px solid var(--border-subtle)' }}
        >
          {member.photoUrl ? (
            <img src={member.photoUrl} alt={member.name || 'Member'} className="w-full h-full object-cover" />
          ) : (
            <User size={22} style={{ color: 'var(--text-muted)' }} />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <input
            value={member.name}
            onChange={(e) => onUpdate('name', e.target.value)}
            className={`${INPUT_CLS} font-semibold`}
            style={inputStyle}
            placeholder="Name"
          />
          <input
            value={member.title}
            onChange={(e) => onUpdate('title', e.target.value)}
            className={INPUT_CLS}
            style={inputStyle}
            placeholder="Title"
          />
        </div>
      </div>

      <input
        value={member.photoUrl || ''}
        onChange={(e) => onUpdate('photoUrl', e.target.value)}
        className={INPUT_CLS}
        style={inputStyle}
        placeholder="Photo URL"
      />
      <input
        value={member.pronouns || ''}
        onChange={(e) => onUpdate('pronouns', e.target.value)}
        className={INPUT_CLS}
        style={inputStyle}
        placeholder="Pronouns"
      />
      <input
        value={member.email || ''}
        onChange={(e) => onUpdate('email', e.target.value)}
        className={INPUT_CLS}
        style={inputStyle}
        placeholder="Email"
      />
      <input
        value={member.phone || ''}
        onChange={(e) => onUpdate('phone', e.target.value)}
        className={INPUT_CLS}
        style={inputStyle}
        placeholder="Phone"
      />
    </div>
  );
}

// ─── TeamSection ─────────────────────────────────────────────────────────────

interface TeamSectionProps {
  title: string;
  members: TeamMember[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onUpdate: (id: string, field: keyof TeamMember, value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

function TeamSection({ title, members, collapsed, onToggleCollapse, onUpdate, onAdd, onRemove }: TeamSectionProps) {
  return (
    <section>
      <button
        onClick={onToggleCollapse}
        className="flex items-center gap-2 w-full text-left mb-4 group"
      >
        <span style={{ color: 'var(--text-secondary)' }}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        </span>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>
          ({members.length})
        </span>
      </button>

      {!collapsed && (
        <>
          {members.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onUpdate={(field, value) => onUpdate(member.id, field, value)}
                  onRemove={() => onRemove(member.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>No members yet.</p>
          )}
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-colors"
            style={{ background: 'var(--button-neutral-bg)', borderColor: 'var(--border-subtle)', color: 'var(--button-neutral-text)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--button-neutral-bg)'; }}
          >
            <Plus size={14} />
            Add Member
          </button>
        </>
      )}
    </section>
  );
}

// ─── AccountDetails page ──────────────────────────────────────────────────────

export function AccountDetails({ roadmapId }: AccountDetailsProps) {
  const navigate = useNavigate();

  const [roadmapTitle, setRoadmapTitle] = useState('');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [fullData, setFullData] = useState<RoadmapData | null>(null);

  const [orgRows, setOrgRows] = useState<OrgRow[]>([emptyOrgRow()]);
  const [sfTeam, setSfTeam] = useState<TeamMember[]>([]);
  const [customerTeam, setCustomerTeam] = useState<TeamMember[]>([]);

  const [sfCollapsed, setSfCollapsed] = useState(false);
  const [customerCollapsed, setCustomerCollapsed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('roadmaps')
      .select('title, customer_logo_base64, data')
      .eq('id', roadmapId)
      .maybeSingle();

    if (error || !data) {
      navigate('/dashboard');
      return;
    }

    setRoadmapTitle(data.title);
    setLogoBase64(data.customer_logo_base64 || null);
    setFullData(data.data as RoadmapData);

    const details = (data.data as RoadmapData).accountDetails;
    if (details) {
      setOrgRows(details.orgRows?.length ? details.orgRows : [emptyOrgRow()]);
      setSfTeam(details.salesforceTeam || []);
      setCustomerTeam(details.customerTeam || []);
    }

    setLoading(false);
  }, [roadmapId, navigate]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!fullData) return;
    setSaveStatus('saving');
    try {
      const updatedData: RoadmapData = {
        ...fullData,
        accountDetails: {
          orgRows,
          salesforceTeam: sfTeam,
          customerTeam,
        },
      };
      const { error } = await supabase
        .from('roadmaps')
        .update({ data: updatedData })
        .eq('id', roadmapId);
      if (error) throw error;
      setFullData(updatedData);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // ── Org rows ──
  const updateOrgRow = (id: string, field: keyof OrgRow, value: string) =>
    setOrgRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  const addOrgRow = () => setOrgRows((rows) => [...rows, emptyOrgRow()]);
  const deleteOrgRow = (id: string) => setOrgRows((rows) => rows.filter((r) => r.id !== id));

  // ── Team members ──
  const updateMember = (team: 'sf' | 'customer', id: string, field: keyof TeamMember, value: string) => {
    const setter = team === 'sf' ? setSfTeam : setCustomerTeam;
    setter((members) => members.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };
  const addMember = (team: 'sf' | 'customer') => {
    (team === 'sf' ? setSfTeam : setCustomerTeam)((members) => [...members, emptyMember()]);
  };
  const removeMember = (team: 'sf' | 'customer', id: string) => {
    (team === 'sf' ? setSfTeam : setCustomerTeam)((members) => members.filter((m) => m.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  const saveLabel =
    saveStatus === 'saving' ? 'Saving…' :
    saveStatus === 'saved'  ? 'Saved ✓' :
    saveStatus === 'error'  ? 'Save failed' :
    'Save';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-50 border-b px-8 py-4 flex items-center justify-between"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/roadmap/${roadmapId}`)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--icon-primary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-extrabold" style={{ color: 'var(--header-text)' }}>
            {roadmapTitle ? `${roadmapTitle} — Account Details` : 'Account Details'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {logoBase64 && (
            <img src={logoBase64} alt="Customer logo" className="h-10 object-contain" />
          )}
          <button
            onClick={save}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all hover:-translate-y-0.5 text-sm font-semibold disabled:opacity-50"
            style={{ background: saveStatus === 'error' ? '#dc2626' : 'var(--primary)' }}
            onMouseEnter={(e) => { if (saveStatus === 'idle') e.currentTarget.style.background = 'var(--primary-hover)'; }}
            onMouseLeave={(e) => { if (saveStatus === 'idle') e.currentTarget.style.background = 'var(--primary)'; }}
          >
            <Save size={16} />
            {saveLabel}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-10">

        {/* ── Org Details ── */}
        <section>
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Org Details
          </h2>
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border-subtle)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '860px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-shell)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Account Name', 'Products / Description', 'Instance URL', 'Maintenance URL', 'Org ID', 'Notes', ''].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orgRows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>

                      {/* Account Name */}
                      <td className="px-2 py-1.5">
                        <input
                          value={row.accountName}
                          onChange={(e) => updateOrgRow(row.id, 'accountName', e.target.value)}
                          className={INPUT_CLS}
                          style={{ ...inputStyle, minWidth: '130px' }}
                          placeholder="Account name"
                        />
                      </td>

                      {/* Products */}
                      <td className="px-2 py-1.5">
                        <input
                          value={row.products}
                          onChange={(e) => updateOrgRow(row.id, 'products', e.target.value)}
                          className={INPUT_CLS}
                          style={{ ...inputStyle, minWidth: '160px' }}
                          placeholder="Products / description"
                        />
                      </td>

                      {/* Instance URL */}
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <input
                            value={row.instanceUrl}
                            onChange={(e) => updateOrgRow(row.id, 'instanceUrl', e.target.value)}
                            className={INPUT_CLS}
                            style={{ ...inputStyle, minWidth: '140px' }}
                            placeholder="https://…"
                          />
                          {row.instanceUrl && (
                            <a
                              href={row.instanceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 px-1.5 py-1 rounded text-xs font-semibold transition-colors"
                              style={{ color: 'var(--primary)', border: '1px solid var(--primary)' }}
                            >
                              ↗
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Maintenance URL */}
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <input
                            value={row.maintenanceUrl}
                            onChange={(e) => updateOrgRow(row.id, 'maintenanceUrl', e.target.value)}
                            className={INPUT_CLS}
                            style={{ ...inputStyle, minWidth: '140px' }}
                            placeholder="https://…"
                          />
                          {row.maintenanceUrl && (
                            <a
                              href={row.maintenanceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 px-1.5 py-1 rounded text-xs font-semibold transition-colors"
                              style={{ color: 'var(--primary)', border: '1px solid var(--primary)' }}
                            >
                              ↗
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Org ID */}
                      <td className="px-2 py-1.5">
                        <input
                          value={row.orgId}
                          onChange={(e) => updateOrgRow(row.id, 'orgId', e.target.value)}
                          className={INPUT_CLS}
                          style={{ ...inputStyle, minWidth: '100px' }}
                          placeholder="Org ID"
                        />
                      </td>

                      {/* Notes */}
                      <td className="px-2 py-1.5">
                        <input
                          value={row.notes}
                          onChange={(e) => updateOrgRow(row.id, 'notes', e.target.value)}
                          className={INPUT_CLS}
                          style={{ ...inputStyle, minWidth: '160px' }}
                          placeholder="Notes"
                        />
                      </td>

                      {/* Delete */}
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => deleteOrgRow(row.id)}
                          className="p-1 rounded transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                          title="Delete row"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                onClick={addOrgRow}
                className="flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
                style={{ color: 'var(--primary)' }}
              >
                <Plus size={14} />
                Add Row
              </button>
            </div>
          </div>
        </section>

        {/* ── Salesforce Team ── */}
        <TeamSection
          title="Salesforce Team"
          members={sfTeam}
          collapsed={sfCollapsed}
          onToggleCollapse={() => setSfCollapsed((c) => !c)}
          onUpdate={(id, field, value) => updateMember('sf', id, field, value)}
          onAdd={() => addMember('sf')}
          onRemove={(id) => removeMember('sf', id)}
        />

        {/* ── Customer Team ── */}
        <TeamSection
          title="Customer Team"
          members={customerTeam}
          collapsed={customerCollapsed}
          onToggleCollapse={() => setCustomerCollapsed((c) => !c)}
          onUpdate={(id, field, value) => updateMember('customer', id, field, value)}
          onAdd={() => addMember('customer')}
          onRemove={(id) => removeMember('customer', id)}
        />
      </div>
    </div>
  );
}
