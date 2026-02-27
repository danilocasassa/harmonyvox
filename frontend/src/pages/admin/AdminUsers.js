import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { Plus, Search, UserCheck, UserX, Key, Trash2, CalendarDays } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showPwReset, setShowPwReset] = useState(null);
  const [showDateEdit, setShowDateEdit] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);
  const { axiosAuth } = useAuth();

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await axiosAuth().get('/admin/users');
      setUsers(res.data);
    } catch { toast.error('Erro ao carregar usuários'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axiosAuth().post('/admin/users', newUser);
      toast.success('Usuário criado!');
      setShowCreate(false);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar usuário');
    } finally { setSaving(false); }
  };

  const toggleActive = async (user) => {
    try {
      await axiosAuth().put(`/admin/users/${user.id}`, { is_active: !user.is_active });
      toast.success(user.is_active ? 'Usuário desativado' : 'Usuário ativado');
      loadUsers();
    } catch { toast.error('Erro ao atualizar'); }
  };

  const resetPassword = async (userId) => {
    if (!newPw || newPw.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    setSaving(true);
    try {
      await axiosAuth().put(`/admin/users/${userId}/password`, { new_password: newPw });
      toast.success('Senha alterada!');
      setShowPwReset(null);
      setNewPw('');
    } catch { toast.error('Erro ao alterar senha'); }
    finally { setSaving(false); }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Remover ${user.name}?`)) return;
    try {
      await axiosAuth().delete(`/admin/users/${user.id}`);
      toast.success('Usuário removido');
      loadUsers();
    } catch { toast.error('Erro ao remover'); }
  };

  const saveActivationDate = async (userId) => {
    if (!editDate) { toast.error('Selecione uma data'); return; }
    setSaving(true);
    try {
      const isoDate = new Date(editDate + 'T00:00:00Z').toISOString();
      await axiosAuth().put(`/admin/users/${userId}`, { activation_date: isoDate });
      toast.success('Data de ingresso atualizada!');
      setShowDateEdit(null);
      setEditDate('');
      loadUsers();
    } catch { toast.error('Erro ao atualizar data'); }
    finally { setSaving(false); }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Usuários</h1>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="admin-create-user-btn" className="h-10 font-bold text-black" style={{ background: '#FFD700' }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-white/10" style={{ background: '#0f111a' }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Novo Usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label style={{ color: '#94a3b8' }}>Nome</Label>
                <Input data-testid="admin-new-user-name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required className="bg-black/20 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label style={{ color: '#94a3b8' }}>Email</Label>
                <Input data-testid="admin-new-user-email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required className="bg-black/20 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label style={{ color: '#94a3b8' }}>Senha</Label>
                <Input data-testid="admin-new-user-password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required className="bg-black/20 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label style={{ color: '#94a3b8' }}>Tipo</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger data-testid="admin-new-user-role" className="bg-black/20 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={saving} data-testid="admin-save-user-btn" className="w-full h-10 font-bold text-black" style={{ background: '#FFD700' }}>
                {saving ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
        <Input data-testid="admin-user-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar usuário..." className="pl-9 h-10 bg-black/20 border-white/10 text-white placeholder:text-white/30" />
      </div>

      {/* Users table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Nome</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Email</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Tipo</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Ativação</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Expira</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Status</th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} data-testid={`user-row-${user.id}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="py-3 px-4 font-medium" style={{ color: '#f8fafc' }}>{user.name}</td>
                  <td className="py-3 px-4" style={{ color: '#94a3b8' }}>{user.email}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: user.role === 'admin' ? 'rgba(255,215,0,0.1)' : 'rgba(56,189,248,0.1)', color: user.role === 'admin' ? '#FFD700' : '#38bdf8' }}>
                      {user.role === 'admin' ? 'Admin' : 'Usuário'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => {
                        setShowDateEdit(user.id);
                        setEditDate(user.activation_date ? user.activation_date.substring(0, 10) : '');
                      }}
                      data-testid={`user-edit-date-${user.id}`}
                      className="flex items-center gap-1 hover:underline cursor-pointer"
                      style={{ color: '#94a3b8' }}
                      title="Editar data de ingresso"
                    >
                      {formatDate(user.activation_date)}
                      <CalendarDays className="w-3 h-3 opacity-50" />
                    </button>
                  </td>
                  <td className="py-3 px-4" style={{ color: '#94a3b8' }}>{formatDate(user.subscription_expires)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={() => toggleActive(user)}
                        data-testid={`user-toggle-${user.id}`}
                      />
                      <span className="text-xs" style={{ color: user.is_active ? '#22c55e' : '#ef4444' }}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Dialog open={showDateEdit === user.id} onOpenChange={(v) => { setShowDateEdit(v ? user.id : null); setEditDate(''); }}>
                        <DialogTrigger asChild>
                          <button data-testid={`user-edit-activation-${user.id}`} className="p-2 rounded-lg hover:bg-white/5" style={{ color: '#94a3b8' }} title="Editar data de ingresso">
                            <CalendarDays className="w-4 h-4" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="glass-card border-white/10" style={{ background: '#0f111a' }}>
                          <DialogHeader>
                            <DialogTitle style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Data de Ingresso - {user.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <p className="text-sm" style={{ color: '#94a3b8' }}>Defina desde quando este usuário está ativo na plataforma.</p>
                            <Input
                              data-testid={`admin-edit-date-input-${user.id}`}
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="bg-black/20 border-white/10 text-white"
                            />
                            <Button onClick={() => saveActivationDate(user.id)} disabled={saving} data-testid={`admin-save-date-${user.id}`} className="w-full h-10 font-bold text-black" style={{ background: '#FFD700' }}>
                              {saving ? 'Salvando...' : 'Salvar Data'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={showPwReset === user.id} onOpenChange={(v) => { setShowPwReset(v ? user.id : null); setNewPw(''); }}>
                        <DialogTrigger asChild>
                          <button data-testid={`user-reset-pw-${user.id}`} className="p-2 rounded-lg hover:bg-white/5" style={{ color: '#94a3b8' }} title="Alterar senha">
                            <Key className="w-4 h-4" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="glass-card border-white/10" style={{ background: '#0f111a' }}>
                          <DialogHeader>
                            <DialogTitle style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Alterar Senha - {user.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <Input data-testid="admin-reset-pw-input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Nova senha" className="bg-black/20 border-white/10 text-white" />
                            <Button onClick={() => resetPassword(user.id)} disabled={saving} data-testid="admin-reset-pw-submit" className="w-full h-10 font-bold text-black" style={{ background: '#FFD700' }}>
                              {saving ? 'Salvando...' : 'Alterar Senha'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      {user.role !== 'admin' && (
                        <button data-testid={`user-delete-${user.id}`} onClick={() => deleteUser(user)} className="p-2 rounded-lg hover:bg-red-500/10" style={{ color: '#ef4444' }} title="Remover">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
