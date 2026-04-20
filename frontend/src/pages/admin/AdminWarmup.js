import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { Plus, Flame, Upload, Trash2 } from 'lucide-react';

export default function AdminWarmup() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', content_type: 'audio', file: null });
  const [saving, setSaving] = useState(false);
  const { axiosAuth } = useAuth();

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    try {
      const res = await axiosAuth().get('/admin/warmup');
      setItems(res.data);
    } catch { toast.error('Erro ao carregar conteúdo'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newItem.file) {
      toast.error('Selecione um arquivo');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', newItem.title);
      formData.append('description', newItem.description);
      formData.append('content_type', newItem.content_type);
      formData.append('file', newItem.file);
      await axiosAuth().post('/admin/warmup', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Conteúdo criado!');
      setShowCreate(false);
      setNewItem({ title: '', description: '', content_type: 'audio', file: null });
      loadItems();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar conteúdo');
    } finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Remover "${item.title}"?`)) return;
    try {
      await axiosAuth().delete(`/admin/warmup/${item.id}`);
      toast.success('Conteúdo removido');
      loadItems();
    } catch { toast.error('Erro ao remover'); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Warm Up</h1>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="admin-create-warmup-btn" className="h-10 font-bold text-black" style={{ background: '#a60ef7' }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Conteúdo
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-white/10" style={{ background: '#0f111a' }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Novo Conteúdo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label style={{ color: '#94a3b8' }}>Título</Label>
                <Input data-testid="admin-warmup-title" value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} required placeholder="ex: Aquecimento Vocal" className="bg-black/20 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div className="space-y-2">
                <Label style={{ color: '#94a3b8' }}>Descrição</Label>
                <Input data-testid="admin-warmup-desc" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} placeholder="Descrição breve" className="bg-black/20 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div className="space-y-2">
                <Label style={{ color: '#94a3b8' }}>Tipo</Label>
                <Select value={newItem.content_type} onValueChange={(v) => setNewItem({ ...newItem, content_type: v })}>
                  <SelectTrigger data-testid="admin-warmup-type" className="bg-black/20 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <SelectItem value="audio">Áudio</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label style={{ color: '#94a3b8' }}>Arquivo</Label>
                <label className="flex items-center justify-center gap-2 p-4 rounded-lg cursor-pointer" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                  <Upload className="w-5 h-5" />
                  {newItem.file ? newItem.file.name : 'MP3, WAV, MP4 ou WebM'}
                  <input
                    type="file"
                    data-testid="admin-warmup-file"
                    accept=".mp3,.wav,.mp4,.webm"
                    className="hidden"
                    onChange={(e) => setNewItem({ ...newItem, file: e.target.files[0] })}
                  />
                </label>
              </div>
              <Button type="submit" disabled={saving} data-testid="admin-warmup-save-btn" className="w-full h-10 font-bold text-black" style={{ background: '#a60ef7' }}>
                {saving ? 'Criando...' : 'Criar Conteúdo'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="glass-card rounded-xl p-6 animate-pulse h-20" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Flame className="w-16 h-16 mx-auto mb-4" style={{ color: '#475569' }} />
          <p style={{ color: '#94a3b8' }}>Nenhum conteúdo de warm up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.id} data-testid={`admin-warmup-item-${item.id}`} className="glass-card rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(166,14,247,0.1)' }}>
                  <Flame className="w-5 h-5" style={{ color: '#a60ef7' }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: '#f8fafc' }}>{item.title}</h3>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>{item.description || '-'} • {item.content_type === 'audio' ? 'Áudio' : 'Vídeo'}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(item)} data-testid={`admin-delete-warmup-${item.id}`} className="p-2 rounded-lg hover:bg-red-500/10" style={{ color: '#ef4444' }}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
