import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import {
  Plus, Search, Key, Trash2, CalendarDays, Lock, Unlock,
  DollarSign, Mail, Users, RefreshCw
} from 'lucide-react';

const PLAN_LABELS = { monthly: 'Mensal', semester: 'Semestral', annual: 'Anual' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const { axiosAuth } = useAuth();

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showPwReset, setShowPwReset] = useState(null);
  const [showActivate, setShowActivate] = useState(null);
  const [showEditPrice, setShowEditPrice] = useState(null);
  const [showEditExpiry, setShowEditExpiry] = useState(null);
  const [showBatchPricing, setShowBatchPricing] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user', plan_type: 'monthly', price_locked: '' });
  const [newPw, setNewPw] = useState('');
  const [activateDate, setActivateDate] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [batchPrice, setBatchPrice] = useState('');
  const [batchOnlyIncrease, setBatchOnlyIncrease] = useState(true);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await axiosAuth().get('/admin/users');
      setUsers(res.data);
    } catch { toast.error('Erro ao carregar usuários'); }
    finally { setLoading(false); }
  };

  // ---- CREATE USER ----
  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        plan_type: newUser.plan_type,
      };
      if (newUser.price_locked) payload.price_locked = parseFloat(newUser.price_locked);
      await axiosAuth().post('/admin/users', payload);
      toast.success('Usuário criado!');
      setShowCreate(false);
      setNewUser({ name: '', email: '', password: '', role: 'user', plan_type: 'monthly', price_locked: '' });
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar');
    } finally { setSaving(false); }
  };

  // ---- TOGGLE LOCK/UNLOCK ----
  const toggleActive = async (user) => {
    try {
      await axiosAuth().put(`/admin/users/${user.id}`, { is_active: !user.is_active });
      toast.success(user.is_active ? 'Usuário travado' : 'Usuário destravado');
      loadUsers();
    } catch { toast.error('Erro ao atualizar'); }
  };

  // ---- ACTIVATE WITH DATE ----
  const handleActivate = async (userId) => {
    if (!activateDate) { toast.error('Selecione uma data'); return; }
    setSaving(true);
    try {
      const isoDate = new Date(activateDate + 'T23:59:59Z').toISOString();
      await axiosAuth().post(`/admin/users/${userId}/activate`, { subscription_expires: isoDate });
      toast.success('Usuário ativado com nova data!');
      setShowActivate(null);
      setActivateDate('');
      loadUsers();
    } catch { toast.error('Erro ao ativar'); }
    finally { setSaving(false); }
  };

  // ---- EDIT EXPIRY DATE ----
  const handleEditExpiry = async (userId) => {
    if (!editExpiry) { toast.error('Selecione uma data'); return; }
    setSaving(true);
    try {
      const isoDate = new Date(editExpiry + 'T23:59:59Z').toISOString();
      await axiosAuth().put(`/admin/users/${userId}`, { subscription_expires: isoDate });
      toast.success('Data de expiração atualizada!');
      setShowEditExpiry(null);
      setEditExpiry('');
      loadUsers();
    } catch { toast.error('Erro ao atualizar'); }
    finally { setSaving(false); }
  };

  // ---- EDIT INDIVIDUAL PRICE ----
  const handleEditPrice = async (userId) => {
    const val = parseFloat(editPrice);
    if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
    setSaving(true);
    try {
      await axiosAuth().put(`/admin/users/${userId}`, { price_locked: val });
      toast.success('Valor individual atualizado!');
      setShowEditPrice(null);
      setEditPrice('');
      loadUsers();
    } catch { toast.error('Erro ao atualizar'); }
    finally { setSaving(false); }
  };

  // ---- PASSWORD RESET ----
  const resetPassword = async (userId, sendEmail = false) => {
    if (!sendEmail && (!newPw || newPw.length < 6)) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    setSaving(true);
    try {
      const payload = sendEmail ? { send_email: true } : { new_password: newPw };
      const res = await axiosAuth().put(`/admin/users/${userId}/password`, payload);
      toast.success(res.data.message);
      setShowPwReset(null);
      setNewPw('');
    } catch { toast.error('Erro ao alterar senha'); }
    finally { setSaving(false); }
  };

  // ---- BATCH PRICING ----
  const handleBatchPricing = async () => {
    const val = parseFloat(batchPrice);
    if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
    setSaving(true);
    try {
      const res = await axiosAuth().post('/admin/users/batch-pricing', {
        new_price: val,
        only_increase: batchOnlyIncrease
      });
      toast.success(res.data.message);
      setShowBatchPricing(false);
      setBatchPrice('');
      loadUsers();
    } catch { toast.error('Erro ao atualizar'); }
    finally { setSaving(false); }
  };

  // ---- DELETE ----
  const deleteUser = async (user) => {
    if (!window.confirm(`Remover ${user.name}?`)) return;
    try {
      await axiosAuth().delete(`/admin/users/${user.id}`);
      toast.success('Usuário removido');
      loadUsers();
    } catch { toast.error('Erro ao remover'); }
  };

  // ---- EDIT ACTIVATION DATE ----
  const [showEditActivation, setShowEditActivation] = useState(null);
  const [editActivation, setEditActivation] = useState('');

  const handleEditActivation = async (userId) => {
    if (!editActivation) { toast.error('Selecione uma data'); return; }
    setSaving(true);
    try {
      const isoDate = new Date(editActivation + 'T00:00:00Z').toISOString();
      await axiosAuth().put(`/admin/users/${userId}`, { activation_date: isoDate });
      toast.success('Data de ingresso atualizada!');
      setShowEditActivation(null);
      setEditActivation('');
      loadUsers();
    } catch { toast.error('Erro ao atualizar'); }
    finally { setSaving(false); }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
  const isExpired = (d) => {
    if (!d) return false;
    return new Date(d) < new Date();
  };

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>
          Gestão de Usuários
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setShowBatchPricing(true)} data-testid="admin-batch-pricing-btn"
            variant="outline" className="h-9 text-xs border-white/10 hover:bg-white/5" style={{ color: '#FFD700' }}>
            <Users className="w-3.5 h-3.5 mr-1" /> Preço em Lote
          </Button>
          <Button onClick={() => setShowCreate(true)} data-testid="admin-create-user-btn"
            className="h-9 text-xs font-bold text-black" style={{ background: '#FFD700' }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Novo Usuário
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
        <Input data-testid="admin-user-search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar usuário..." className="pl-9 h-10 bg-black/20 border-white/10 text-white placeholder:text-white/30" />
      </div>

      {/* Users grid - cards on mobile, table on desktop */}
      <div className="space-y-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="glass-card rounded-xl p-6 animate-pulse h-24" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><p style={{ color: '#94a3b8' }}>Nenhum usuário encontrado.</p></div>
        ) : (
          filtered.map(user => {
            const expired = isExpired(user.subscription_expires);
            const isAdmin = user.role === 'admin';
            return (
              <div key={user.id} data-testid={`user-row-${user.id}`}
                className="glass-card rounded-xl p-4 sm:p-5 space-y-3">
                {/* Row 1: Name, Email, Status badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate" style={{ color: '#f8fafc' }}>{user.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded"
                        style={{ background: isAdmin ? 'rgba(255,215,0,0.1)' : 'rgba(56,189,248,0.1)', color: isAdmin ? '#FFD700' : '#38bdf8' }}>
                        {isAdmin ? 'Admin' : PLAN_LABELS[user.plan_type] || 'Mensal'}
                      </span>
                      {!isAdmin && (
                        <span className="text-xs px-2 py-0.5 rounded"
                          style={{
                            background: !user.is_active ? 'rgba(239,68,68,0.1)' : expired ? 'rgba(251,191,36,0.1)' : 'rgba(34,197,94,0.1)',
                            color: !user.is_active ? '#ef4444' : expired ? '#fbbf24' : '#22c55e'
                          }}>
                          {!user.is_active ? 'Travado' : expired ? 'Expirado' : 'Ativo'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm truncate" style={{ color: '#94a3b8' }}>{user.email}</p>
                  </div>
                  {/* Quick actions */}
                  {!isAdmin && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button data-testid={`user-lock-${user.id}`} onClick={() => toggleActive(user)}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors" title={user.is_active ? 'Travar' : 'Destravar'}
                        style={{ color: user.is_active ? '#22c55e' : '#ef4444' }}>
                        {user.is_active ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                      <button data-testid={`user-activate-btn-${user.id}`}
                        onClick={() => { setShowActivate(user.id); setActivateDate(''); }}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Ativar com data"
                        style={{ color: '#38bdf8' }}>
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button data-testid={`user-edit-price-btn-${user.id}`}
                        onClick={() => { setShowEditPrice(user.id); setEditPrice(user.price_locked?.toString() || ''); }}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Editar preço"
                        style={{ color: '#FFD700' }}>
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button data-testid={`user-reset-pw-btn-${user.id}`}
                        onClick={() => { setShowPwReset(user.id); setNewPw(''); }}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Resetar senha"
                        style={{ color: '#94a3b8' }}>
                        <Key className="w-4 h-4" />
                      </button>
                      <button data-testid={`user-delete-${user.id}`} onClick={() => deleteUser(user)}
                        className="p-2 rounded-lg hover:bg-red-500/10 transition-colors" title="Remover"
                        style={{ color: '#ef4444' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                {/* Row 2: Info grid */}
                {!isAdmin && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <p style={{ color: '#475569' }}>Ingresso</p>
                      <button onClick={() => { setShowEditActivation(user.id); setEditActivation(user.activation_date ? user.activation_date.substring(0,10) : ''); }}
                        data-testid={`user-edit-date-${user.id}`}
                        className="font-medium flex items-center gap-1 hover:underline cursor-pointer" style={{ color: '#f8fafc' }}>
                        {formatDate(user.activation_date)} <CalendarDays className="w-3 h-3 opacity-40" />
                      </button>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <p style={{ color: '#475569' }}>Expira</p>
                      <button onClick={() => { setShowEditExpiry(user.id); setEditExpiry(user.subscription_expires ? user.subscription_expires.substring(0,10) : ''); }}
                        data-testid={`user-edit-expiry-${user.id}`}
                        className="font-medium flex items-center gap-1 hover:underline cursor-pointer"
                        style={{ color: expired ? '#fbbf24' : '#f8fafc' }}>
                        {formatDate(user.subscription_expires)} <CalendarDays className="w-3 h-3 opacity-40" />
                      </button>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <p style={{ color: '#475569' }}>Valor</p>
                      <p className="font-medium" style={{ color: '#FFD700' }}>R$ {user.price_locked?.toFixed(2) || '-'}</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <p style={{ color: '#475569' }}>Plano</p>
                      <p className="font-medium" style={{ color: '#f8fafc' }}>{PLAN_LABELS[user.plan_type] || '-'}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========== MODALS ========== */}

      {/* Create User */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-card border-white/10 max-w-md" style={{ background: '#0f111a' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Novo Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label style={{ color: '#94a3b8' }}>Nome</Label>
              <Input data-testid="admin-new-user-name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required className="bg-black/20 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: '#94a3b8' }}>Email</Label>
              <Input data-testid="admin-new-user-email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required className="bg-black/20 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: '#94a3b8' }}>Senha</Label>
              <Input data-testid="admin-new-user-password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required className="bg-black/20 border-white/10 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label style={{ color: '#94a3b8' }}>Tipo</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger data-testid="admin-new-user-role" className="bg-black/20 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent style={{ background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label style={{ color: '#94a3b8' }}>Plano</Label>
                <Select value={newUser.plan_type} onValueChange={(v) => setNewUser({ ...newUser, plan_type: v })}>
                  <SelectTrigger data-testid="admin-new-user-plan" className="bg-black/20 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent style={{ background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="semester">Semestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: '#94a3b8' }}>Valor individual (opcional)</Label>
              <Input data-testid="admin-new-user-price" type="number" step="0.01" placeholder="Usar padrão" value={newUser.price_locked}
                onChange={(e) => setNewUser({ ...newUser, price_locked: e.target.value })} className="bg-black/20 border-white/10 text-white placeholder:text-white/30" />
            </div>
            <Button type="submit" disabled={saving} data-testid="admin-save-user-btn" className="w-full h-10 font-bold text-black" style={{ background: '#FFD700' }}>
              {saving ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activate User */}
      <Dialog open={!!showActivate} onOpenChange={(v) => { if (!v) setShowActivate(null); }}>
        <DialogContent className="glass-card border-white/10 max-w-sm" style={{ background: '#0f111a' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Ativar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm" style={{ color: '#94a3b8' }}>Defina até quando este usuário ficará ativo.</p>
            <div className="space-y-1.5">
              <Label style={{ color: '#94a3b8' }}>Nova data de expiração</Label>
              <Input data-testid="admin-activate-date-input" type="date" value={activateDate}
                onChange={(e) => setActivateDate(e.target.value)} className="bg-black/20 border-white/10 text-white" />
            </div>
            <Button onClick={() => handleActivate(showActivate)} disabled={saving} data-testid="admin-activate-submit"
              className="w-full h-10 font-bold text-black" style={{ background: '#FFD700' }}>
              {saving ? 'Ativando...' : 'Ativar Usuário'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Expiry Date */}
      <Dialog open={!!showEditExpiry} onOpenChange={(v) => { if (!v) setShowEditExpiry(null); }}>
        <DialogContent className="glass-card border-white/10 max-w-sm" style={{ background: '#0f111a' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Alterar Expiração</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input data-testid="admin-edit-expiry-input" type="date" value={editExpiry}
              onChange={(e) => setEditExpiry(e.target.value)} className="bg-black/20 border-white/10 text-white" />
            <Button onClick={() => handleEditExpiry(showEditExpiry)} disabled={saving} data-testid="admin-save-expiry"
              className="w-full h-10 font-bold text-black" style={{ background: '#FFD700' }}>
              {saving ? 'Salvando...' : 'Salvar Data'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Activation Date */}
      <Dialog open={!!showEditActivation} onOpenChange={(v) => { if (!v) setShowEditActivation(null); }}>
        <DialogContent className="glass-card border-white/10 max-w-sm" style={{ background: '#0f111a' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Data de Ingresso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm" style={{ color: '#94a3b8' }}>Defina desde quando este usuário está ativo.</p>
            <Input data-testid="admin-edit-activation-input" type="date" value={editActivation}
              onChange={(e) => setEditActivation(e.target.value)} className="bg-black/20 border-white/10 text-white" />
            <Button onClick={() => handleEditActivation(showEditActivation)} disabled={saving} data-testid="admin-save-activation"
              className="w-full h-10 font-bold text-black" style={{ background: '#FFD700' }}>
              {saving ? 'Salvando...' : 'Salvar Data'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Individual Price */}
      <Dialog open={!!showEditPrice} onOpenChange={(v) => { if (!v) setShowEditPrice(null); }}>
        <DialogContent className="glass-card border-white/10 max-w-sm" style={{ background: '#0f111a' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Valor Individual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm" style={{ color: '#94a3b8' }}>Defina o valor mensal para este usuário. Não afeta débitos anteriores.</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#FFD700' }}>R$</span>
              <Input data-testid="admin-edit-price-input" type="number" step="0.01" min="0" value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)} className="pl-10 bg-black/20 border-white/10 text-white" />
            </div>
            <Button onClick={() => handleEditPrice(showEditPrice)} disabled={saving} data-testid="admin-save-price"
              className="w-full h-10 font-bold text-black" style={{ background: '#FFD700' }}>
              {saving ? 'Salvando...' : 'Salvar Valor'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset */}
      <Dialog open={!!showPwReset} onOpenChange={(v) => { if (!v) setShowPwReset(null); }}>
        <DialogContent className="glass-card border-white/10 max-w-sm" style={{ background: '#0f111a' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Resetar Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label style={{ color: '#94a3b8' }}>Nova senha manual</Label>
              <Input data-testid="admin-reset-pw-input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                placeholder="Mínimo 6 caracteres" className="bg-black/20 border-white/10 text-white placeholder:text-white/30" />
            </div>
            <Button onClick={() => resetPassword(showPwReset, false)} disabled={saving} data-testid="admin-reset-pw-submit"
              className="w-full h-10 font-bold text-black" style={{ background: '#FFD700' }}>
              {saving ? 'Salvando...' : 'Definir Senha'}
            </Button>
            <div className="relative text-center">
              <span className="relative z-10 px-3 text-xs" style={{ color: '#475569', background: '#0f111a' }}>ou</span>
              <div className="absolute top-1/2 left-0 right-0 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <Button onClick={() => resetPassword(showPwReset, true)} disabled={saving} data-testid="admin-reset-pw-email"
              variant="outline" className="w-full h-10 text-sm border-white/10 hover:bg-white/5" style={{ color: '#94a3b8' }}>
              <Mail className="w-4 h-4 mr-2" />
              Enviar senha temporária por email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Pricing */}
      <Dialog open={showBatchPricing} onOpenChange={setShowBatchPricing}>
        <DialogContent className="glass-card border-white/10 max-w-sm" style={{ background: '#0f111a' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Preço em Lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              Atualize o valor para todos os usuários de uma vez. Não refaz débitos anteriores.
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#FFD700' }}>R$</span>
              <Input data-testid="admin-batch-price-input" type="number" step="0.01" min="0" value={batchPrice}
                onChange={(e) => setBatchPrice(e.target.value)} placeholder="Novo valor mensal"
                className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-white/30" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: '#f8fafc' }}>Somente aumentar</p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>
                  {batchOnlyIncrease
                    ? 'Só sobe para quem paga menos. Quem já paga mais mantém.'
                    : 'Aplica para TODOS, inclusive os que pagam mais.'}
                </p>
              </div>
              <Switch checked={batchOnlyIncrease} onCheckedChange={setBatchOnlyIncrease} data-testid="admin-batch-only-increase" />
            </div>
            <Button onClick={handleBatchPricing} disabled={saving} data-testid="admin-batch-submit"
              className="w-full h-10 font-bold text-black" style={{ background: '#FFD700' }}>
              {saving ? 'Atualizando...' : 'Aplicar para Todos'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
