import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, User, Lock, CreditCard, Phone } from 'lucide-react';

export default function ProfilePage() {
  const { user, axiosAuth, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('info');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setWhatsapp(user.whatsapp || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axiosAuth().put('/users/me', { name, whatsapp });
      await refreshUser();
      toast.success('Perfil atualizado!');
    } catch {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    setSaving(true);
    try {
      await axiosAuth().put('/users/me/password', { current_password: currentPw, new_password: newPw });
      toast.success('Senha alterada!');
      setCurrentPw('');
      setNewPw('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async () => {
    setSaving(true);
    try {
      const origin = window.location.origin;
      const res = await axiosAuth().post('/payments/create-session', { origin_url: origin });
      window.location.href = res.data.url;
    } catch (err) {
      toast.error('Erro ao iniciar pagamento');
      setSaving(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR');
  };

  const tabs = [
    { id: 'info', label: 'Dados', icon: User },
    { id: 'password', label: 'Senha', icon: Lock },
    { id: 'subscription', label: 'Assinatura', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#02040a' }}>
      <header className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(2,4,10,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/')} data-testid="profile-back" className="p-2 rounded-lg hover:bg-white/5" style={{ color: '#94a3b8' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Meu Perfil</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              data-testid={`profile-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === t.id ? 'rgba(166,14,247,0.1)' : 'transparent',
                color: tab === t.id ? '#a60ef7' : '#94a3b8',
                border: tab === t.id ? '1px solid rgba(166,14,247,0.2)' : '1px solid transparent'
              }}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Info Tab */}
        {tab === 'info' && (
          <form onSubmit={handleUpdateProfile} className="glass-card rounded-xl p-8 space-y-6">
            <div className="space-y-2">
              <Label style={{ color: '#94a3b8' }}>Nome</Label>
              <Input data-testid="profile-name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 bg-black/20 border-white/10 focus:border-[#a60ef7] text-white" />
            </div>
            <div className="space-y-2">
              <Label style={{ color: '#94a3b8' }}>Email</Label>
              <Input value={user?.email || ''} disabled className="h-12 bg-black/30 border-white/5 text-white/50" />
            </div>
            <div className="space-y-2">
              <Label style={{ color: '#94a3b8' }}>
                <Phone className="w-4 h-4 inline mr-1" /> WhatsApp
              </Label>
              <Input data-testid="profile-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(99) 99999-9999" className="h-12 bg-black/20 border-white/10 focus:border-[#a60ef7] text-white placeholder:text-white/30" />
            </div>
            <Button type="submit" disabled={saving} data-testid="profile-save-button" className="w-full h-12 font-bold text-black" style={{ background: '#a60ef7' }}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </form>
        )}

        {/* Password Tab */}
        {tab === 'password' && (
          <form onSubmit={handleChangePassword} className="glass-card rounded-xl p-8 space-y-6">
            <div className="space-y-2">
              <Label style={{ color: '#94a3b8' }}>Senha Atual</Label>
              <Input data-testid="profile-current-pw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required className="h-12 bg-black/20 border-white/10 focus:border-[#a60ef7] text-white" />
            </div>
            <div className="space-y-2">
              <Label style={{ color: '#94a3b8' }}>Nova Senha</Label>
              <Input data-testid="profile-new-pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required className="h-12 bg-black/20 border-white/10 focus:border-[#a60ef7] text-white" />
            </div>
            <Button type="submit" disabled={saving} data-testid="profile-change-pw-button" className="w-full h-12 font-bold text-black" style={{ background: '#a60ef7' }}>
              {saving ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </form>
        )}

        {/* Subscription Tab */}
        {tab === 'subscription' && (
          <div className="glass-card rounded-xl p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs mb-1" style={{ color: '#475569' }}>Ativação</p>
                <p className="font-semibold" style={{ color: '#f8fafc' }}>{formatDate(user?.activation_date)}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs mb-1" style={{ color: '#475569' }}>Expira em</p>
                <p className="font-semibold" style={{ color: '#f8fafc' }}>{formatDate(user?.subscription_expires)}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs mb-1" style={{ color: '#475569' }}>Valor</p>
                <p className="font-semibold" style={{ color: '#a60ef7' }}>R$ {user?.price_locked?.toFixed(2) || '29.90'}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs mb-1" style={{ color: '#475569' }}>Plano</p>
                <p className="font-semibold" style={{ color: '#f8fafc' }}>
                  {{ monthly: 'Mensal', semester: 'Semestral', annual: 'Anual' }[user?.plan_type] || 'Mensal'}
                </p>
              </div>
              <div className="p-4 rounded-lg col-span-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs mb-1" style={{ color: '#475569' }}>Status</p>
                <p className="font-semibold" style={{ color: user?.is_active ? '#22c55e' : '#ef4444' }}>
                  {user?.is_active ? 'Ativo' : 'Inativo'}
                </p>
              </div>
            </div>
            <Button onClick={handlePayment} disabled={saving} data-testid="renew-subscription-button" className="w-full h-12 font-bold text-black" style={{ background: '#a60ef7' }}>
              <CreditCard className="w-4 h-4 mr-2" />
              {saving ? 'Processando...' : 'Renovar Assinatura'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
