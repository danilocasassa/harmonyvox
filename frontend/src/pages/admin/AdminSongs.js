import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { Plus, Music, Upload, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const TRACK_TYPES = [
  { value: 'soprano', label: 'Soprano' },
  { value: 'contralto', label: 'Contralto' },
  { value: 'tenor', label: 'Tenor' },
  { value: 'baritono', label: 'Barítono' },
  { value: 'base_melodica', label: 'Base Melódica' },
  { value: 'base_harmonica', label: 'Base Harmônica' },
];

export default function AdminSongs() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [newSong, setNewSong] = useState({ title: '', artist: '' });
  const [saving, setSaving] = useState(false);
  const [trackUpload, setTrackUpload] = useState({ name: '', type: 'soprano', file: null });
  const [uploadingSong, setUploadingSong] = useState(null);
  const { axiosAuth } = useAuth();

  useEffect(() => { loadSongs(); }, []);

  const loadSongs = async () => {
    try {
      const res = await axiosAuth().get('/admin/songs');
      setSongs(res.data);
    } catch { toast.error('Erro ao carregar músicas'); }
    finally { setLoading(false); }
  };

  const handleCreateSong = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', newSong.title);
      formData.append('artist', newSong.artist);
      await axiosAuth().post('/admin/songs', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Música criada!');
      setShowCreate(false);
      setNewSong({ title: '', artist: '' });
      loadSongs();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar música');
    } finally { setSaving(false); }
  };

  const handleUploadTrack = async (songId) => {
    if (!trackUpload.name || !trackUpload.file) {
      toast.error('Preencha nome e selecione um arquivo');
      return;
    }
    setUploadingSong(songId);
    try {
      const formData = new FormData();
      formData.append('track_name', trackUpload.name);
      formData.append('track_type', trackUpload.type);
      formData.append('file', trackUpload.file);
      await axiosAuth().post(`/admin/songs/${songId}/tracks`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Faixa adicionada!');
      setTrackUpload({ name: '', type: 'soprano', file: null });
      loadSongs();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar faixa');
    } finally { setUploadingSong(null); }
  };

  const handleDeleteTrack = async (songId, trackIndex) => {
    if (!window.confirm('Remover esta faixa?')) return;
    try {
      await axiosAuth().delete(`/admin/songs/${songId}/tracks/${trackIndex}`);
      toast.success('Faixa removida');
      loadSongs();
    } catch { toast.error('Erro ao remover faixa'); }
  };

  const handleDeleteSong = async (song) => {
    if (!window.confirm(`Remover "${song.title}"?`)) return;
    try {
      await axiosAuth().delete(`/admin/songs/${song.id}`);
      toast.success('Música removida');
      loadSongs();
    } catch { toast.error('Erro ao remover música'); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Músicas</h1>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="admin-create-song-btn" className="h-10 font-bold text-black" style={{ background: '#a60ef7' }}>
              <Plus className="w-4 h-4 mr-2" /> Nova Música
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-white/10" style={{ background: '#0f111a' }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Nova Música</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSong} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label style={{ color: '#94a3b8' }}>Título</Label>
                <Input data-testid="admin-new-song-title" value={newSong.title} onChange={(e) => setNewSong({ ...newSong, title: e.target.value })} required placeholder="ex: Maior que Tudo" className="bg-black/20 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div className="space-y-2">
                <Label style={{ color: '#94a3b8' }}>Artista</Label>
                <Input data-testid="admin-new-song-artist" value={newSong.artist} onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })} placeholder="ex: Danilo Casassa" className="bg-black/20 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <Button type="submit" disabled={saving} data-testid="admin-save-song-btn" className="w-full h-10 font-bold text-black" style={{ background: '#a60ef7' }}>
                {saving ? 'Criando...' : 'Criar Música'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="glass-card rounded-xl p-6 animate-pulse h-20" />)}</div>
      ) : songs.length === 0 ? (
        <div className="text-center py-20">
          <Music className="w-16 h-16 mx-auto mb-4" style={{ color: '#475569' }} />
          <p style={{ color: '#94a3b8' }}>Nenhuma música cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {songs.map(song => (
            <div key={song.id} data-testid={`admin-song-${song.id}`} className="glass-card rounded-xl overflow-hidden">
              {/* Song header */}
              <div className="flex items-center justify-between p-5">
                <button onClick={() => setExpanded(expanded === song.id ? null : song.id)} className="flex items-center gap-3 flex-1 text-left">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(166,14,247,0.1)' }}>
                    <Music className="w-5 h-5" style={{ color: '#a60ef7' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: '#f8fafc' }}>{song.title}</h3>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{song.artist || 'Sem artista'} • {song.tracks?.length || 0} faixas</p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDeleteSong(song)} data-testid={`admin-delete-song-${song.id}`} className="p-2 rounded-lg hover:bg-red-500/10" style={{ color: '#ef4444' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setExpanded(expanded === song.id ? null : song.id)} className="p-2 rounded-lg hover:bg-white/5" style={{ color: '#94a3b8' }}>
                    {expanded === song.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded: tracks */}
              {expanded === song.id && (
                <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="pt-4">
                    <h4 className="text-sm font-medium mb-3" style={{ color: '#94a3b8' }}>Faixas</h4>
                    {song.tracks?.length > 0 ? (
                      <div className="space-y-2">
                        {song.tracks.map((track, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                              <p className="text-sm font-medium" style={{ color: '#f8fafc' }}>{track.name}</p>
                              <p className="text-xs" style={{ color: '#475569' }}>{track.type} • {track.file_ext}</p>
                            </div>
                            <button onClick={() => handleDeleteTrack(song.id, i)} data-testid={`admin-delete-track-${song.id}-${i}`} className="p-2 rounded-lg hover:bg-red-500/10" style={{ color: '#ef4444' }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: '#475569' }}>Nenhuma faixa adicionada.</p>
                    )}
                  </div>

                  {/* Add track form */}
                  <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 className="text-sm font-medium mb-3" style={{ color: '#94a3b8' }}>Adicionar Faixa</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        data-testid={`admin-track-name-${song.id}`}
                        value={trackUpload.name}
                        onChange={(e) => setTrackUpload({ ...trackUpload, name: e.target.value })}
                        placeholder="Nome da faixa"
                        className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                      />
                      <Select value={trackUpload.type} onValueChange={(v) => setTrackUpload({ ...trackUpload, type: v })}>
                        <SelectTrigger data-testid={`admin-track-type-${song.id}`} className="bg-black/20 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent style={{ background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)' }}>
                          {TRACK_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                          <Upload className="w-4 h-4" />
                          {trackUpload.file ? trackUpload.file.name.substring(0, 15) + '...' : 'MP3 / WAV'}
                          <input
                            type="file"
                            data-testid={`admin-track-file-${song.id}`}
                            accept=".mp3,.wav"
                            className="hidden"
                            onChange={(e) => setTrackUpload({ ...trackUpload, file: e.target.files[0] })}
                          />
                        </label>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleUploadTrack(song.id)}
                      disabled={uploadingSong === song.id}
                      data-testid={`admin-upload-track-${song.id}`}
                      className="mt-3 h-9 text-sm font-bold text-black"
                      style={{ background: '#a60ef7' }}
                    >
                      {uploadingSong === song.id ? 'Enviando...' : 'Adicionar Faixa'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
