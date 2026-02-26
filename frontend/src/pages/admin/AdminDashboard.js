import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Users, Music, Flame, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { axiosAuth } = useAuth();

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const res = await axiosAuth().get('/admin/dashboard');
      setStats(res.data);
    } catch {
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="glass-card rounded-xl p-6" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>{label}</span>
      </div>
      <p className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>{loading ? '-' : value}</p>
    </div>
  );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Music} label="Músicas" value={stats?.total_songs || 0} color="#FFD700" />
        <StatCard icon={Users} label="Usuários Ativos" value={stats?.active_users || 0} color="#22c55e" />
        <StatCard icon={Users} label="Usuários Inativos" value={stats?.inactive_users || 0} color="#ef4444" />
        <StatCard icon={Flame} label="Warm Up" value={stats?.total_warmup || 0} color="#38bdf8" />
      </div>

      {/* Inactive users */}
      {stats && stats.inactive_user_list && stats.inactive_user_list.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>
            Usuários Inativos
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Nome</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Email</th>
                </tr>
              </thead>
              <tbody>
                {stats.inactive_user_list.map(u => (
                  <tr key={u.id || u.email} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="py-3 px-4" style={{ color: '#f8fafc' }}>{u.name}</td>
                    <td className="py-3 px-4" style={{ color: '#94a3b8' }}>{u.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
