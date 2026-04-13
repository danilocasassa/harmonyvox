import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Users, Music, Flame, DollarSign, Bell, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';

const PLAN_LABELS = { monthly: 'Mensal', semester: 'Semestral', annual: 'Anual' };
const PLAN_COLORS = { monthly: '#38bdf8', semester: '#a78bfa', annual: '#FFD700' };

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState(false);
  const { axiosAuth } = useAuth();

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const res = await axiosAuth().get('/admin/dashboard');
      setStats(res.data);
    } catch { toast.error('Erro ao carregar dashboard'); }
    finally { setLoading(false); }
  };

  const handleNotifyExpiring = async () => {
    setNotifying(true);
    try {
      const res = await axiosAuth().post('/admin/notify-expiring');
      toast.success(res.data.message);
    } catch { toast.error('Erro ao enviar notificações'); }
    finally { setNotifying(false); }
  };

  const StatCard = ({ icon: Icon, label, value, color, sub }) => (
    <div className="glass-card rounded-xl p-5" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>
        {loading ? '-' : value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: '#475569' }}>{sub}</p>}
    </div>
  );

  const pm = stats?.plan_metrics || {};
  const totalByPlan = Object.values(pm).reduce((s, p) => s + p.total, 0) || 1;

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Dashboard</h1>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Users} label="Usuários Ativos" value={stats?.active_users || 0} color="#22c55e" />
        <StatCard icon={Users} label="Inativos" value={stats?.inactive_users || 0} color="#ef4444" />
        <StatCard icon={Music} label="Músicas" value={stats?.total_songs || 0} color="#FFD700" />
        <StatCard icon={DollarSign} label="Receita Total" value={`R$ ${(stats?.total_revenue || 0).toFixed(2)}`} color="#22c55e"
          sub={`${stats?.total_payments || 0} pagamentos`} />
      </div>

      {/* Metrics by plan */}
      <div className="glass-card rounded-xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base sm:text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>
            <TrendingUp className="w-4 h-4 inline mr-2" style={{ color: '#FFD700' }} />
            Métricas por Plano
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {Object.entries(pm).map(([key, data]) => {
            const color = PLAN_COLORS[key] || '#94a3b8';
            const renewalRate = data.total > 0 ? Math.round((data.active / data.total) * 100) : 0;
            const revenue = stats?.revenue_by_plan?.[key] || 0;
            return (
              <div key={key} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${color}20` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold" style={{ color }}>{data.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${color}15`, color }}>
                    {data.total} usuários
                  </span>
                </div>
                {/* Mini bar chart */}
                <div className="w-full h-2 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${renewalRate}%`, background: color, minWidth: data.active > 0 ? '4px' : '0' }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p style={{ color: '#475569' }}>Ativos</p>
                    <p className="font-bold" style={{ color: '#22c55e' }}>{data.active}</p>
                  </div>
                  <div>
                    <p style={{ color: '#475569' }}>Expirados</p>
                    <p className="font-bold" style={{ color: '#ef4444' }}>{data.expired}</p>
                  </div>
                  <div>
                    <p style={{ color: '#475569' }}>Renovação</p>
                    <p className="font-bold" style={{ color }}>{renewalRate}%</p>
                  </div>
                </div>
                {revenue > 0 && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-xs" style={{ color: '#475569' }}>Receita</p>
                    <p className="text-sm font-bold" style={{ color: '#FFD700' }}>R$ {revenue.toFixed(2)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Distribution bar */}
        {Object.keys(pm).length > 0 && (
          <div>
            <p className="text-xs mb-2" style={{ color: '#94a3b8' }}>Distribuição de Planos</p>
            <div className="flex w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {Object.entries(pm).map(([key, data]) => (
                <div key={key} style={{
                  width: `${(data.total / totalByPlan) * 100}%`,
                  background: PLAN_COLORS[key] || '#94a3b8',
                  minWidth: data.total > 0 ? '4px' : '0'
                }} title={`${data.label}: ${data.total}`} />
              ))}
            </div>
            <div className="flex gap-4 mt-2">
              {Object.entries(pm).map(([key, data]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PLAN_COLORS[key] }} />
                  <span className="text-xs" style={{ color: '#94a3b8' }}>{data.label} ({data.total})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expiring soon + notifications */}
      <div className="glass-card rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-base sm:text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>
            <AlertTriangle className="w-4 h-4 inline mr-2" style={{ color: '#fbbf24' }} />
            Expirando em breve
            {stats?.expiring_soon?.length > 0 && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                {stats.expiring_soon.length}
              </span>
            )}
          </h2>
          <Button onClick={handleNotifyExpiring} disabled={notifying} data-testid="notify-expiring-btn"
            className="h-9 text-xs font-bold text-black shrink-0" style={{ background: '#FFD700' }}>
            <Bell className="w-3.5 h-3.5 mr-1" />
            {notifying ? 'Enviando...' : 'Notificar por Email'}
          </Button>
        </div>

        {!stats?.expiring_soon?.length ? (
          <p className="text-sm py-6 text-center" style={{ color: '#94a3b8' }}>Nenhum usuário expirando nos próximos 7 dias.</p>
        ) : (
          <div className="space-y-2">
            {stats.expiring_soon.map(u => {
              const expDate = u.subscription_expires ? new Date(u.subscription_expires) : null;
              const daysLeft = expDate ? Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;
              return (
                <div key={u.id} data-testid={`expiring-user-${u.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg gap-2"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(251,191,36,0.1)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#f8fafc' }}>{u.name}</p>
                    <p className="text-xs truncate" style={{ color: '#94a3b8' }}>{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-shrink-0">
                    <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(255,215,0,0.1)', color: '#FFD700' }}>
                      {PLAN_LABELS[u.plan_type] || 'Mensal'}
                    </span>
                    <span style={{ color: '#94a3b8' }}>R$ {(u.price_locked || 0).toFixed(2)}</span>
                    <span className="font-bold" style={{ color: daysLeft <= 2 ? '#ef4444' : '#fbbf24' }}>
                      <Calendar className="w-3 h-3 inline mr-0.5" />
                      {daysLeft} dia{daysLeft !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inactive users */}
      {stats?.inactive_user_list?.length > 0 && (
        <div className="glass-card rounded-xl p-5 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>
            Usuários Inativos ({stats.inactive_user_list.length})
          </h2>
          <div className="space-y-1">
            {stats.inactive_user_list.map(u => (
              <div key={u.id || u.email} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.02]">
                <span className="text-sm" style={{ color: '#f8fafc' }}>{u.name}</span>
                <span className="text-xs" style={{ color: '#94a3b8' }}>{u.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
