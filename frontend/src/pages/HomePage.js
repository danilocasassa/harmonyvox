import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Search, Music, LogOut, User, Flame } from 'lucide-react';
import { toast } from 'sonner';

export default function HomePage() {
  const [songs, setSongs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { user, logout, axiosAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      const res = await axiosAuth().get('/songs');
      setSongs(res.data);
    } catch (err) {
      toast.error('Erro ao carregar músicas');
    } finally {
      setLoading(false);
    }
  };

  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.artist && s.artist.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen" style={{ background: '#02040a' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(2,4,10,0.9)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <Music className="w-6 h-6" style={{ color: '#a60ef7' }} />
            <span className="text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>HarmonyVox</span>
          </div>
          <nav className="flex items-center gap-2">
            <button
              onClick={() => navigate('/warmup')}
              data-testid="nav-warmup"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
              style={{ color: '#94a3b8' }}
            >
              <Flame className="w-4 h-4" />
              Warm Up
            </button>
            <button
              onClick={() => navigate('/profile')}
              data-testid="nav-profile"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
              style={{ color: '#94a3b8' }}
            >
              <User className="w-4 h-4" />
              Perfil
            </button>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              data-testid="nav-logout"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
              style={{ color: '#94a3b8' }}
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>
            Repertório
          </h1>
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            Olá, {user?.name}! Selecione uma música para começar a praticar.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#475569' }} />
          <Input
            data-testid="song-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar música ou artista..."
            className="pl-10 h-12 bg-black/20 border-white/10 focus:border-[#a60ef7] text-white placeholder:text-white/30"
          />
        </div>

        {/* Song Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="glass-card rounded-xl p-6 animate-pulse" style={{ height: 120 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Music className="w-16 h-16 mx-auto mb-4" style={{ color: '#475569' }} />
            <p style={{ color: '#94a3b8' }}>{songs.length === 0 ? 'Nenhuma música cadastrada ainda.' : 'Nenhuma música encontrada.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((song, idx) => (
              <button
                key={song.id}
                data-testid={`song-card-${song.id}`}
                onClick={() => navigate(`/player/${song.id}`)}
                className="glass-card rounded-xl p-6 text-left transition-all duration-300 hover:border-[#a60ef7]/20 hover:-translate-y-0.5 group animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.05}s`, opacity: 0 }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(166,14,247,0.1)' }}>
                    <Music className="w-6 h-6 group-hover:scale-110 transition-transform" style={{ color: '#a60ef7' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate" style={{ color: '#f8fafc' }}>{song.title}</h3>
                    {song.artist && <p className="text-sm truncate" style={{ color: '#94a3b8' }}>{song.artist}</p>}
                    <p className="text-xs mt-1" style={{ color: '#475569' }}>
                      {song.tracks?.length || 0} faixa{(song.tracks?.length || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
