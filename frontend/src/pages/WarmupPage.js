import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Flame, Play, Pause } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function WarmupPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const { token } = useAuth();
  const navigate = useNavigate();
  const audioRef = React.useRef(null);

  useEffect(() => {
    loadItems();
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, []);

  const loadItems = async () => {
    try {
      const res = await fetch(`${API}/warmup`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setItems(data);
    } catch {
      toast.error('Erro ao carregar conteúdo');
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (item) => {
    if (playingId === item.id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(`${API}/warmup/stream/${item.id}?token=${token}`);
      audio.headers = { Authorization: `Bearer ${token}` };
      audioRef.current = audio;
      // For streaming with auth, we need fetch
      fetch(`${API}/warmup/stream/${item.id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          audio.src = url;
          audio.play();
          setPlayingId(item.id);
          audio.onended = () => setPlayingId(null);
        })
        .catch(() => toast.error('Erro ao reproduzir'));
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#02040a' }}>
      <header className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(2,4,10,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/')} data-testid="warmup-back" className="p-2 rounded-lg hover:bg-white/5" style={{ color: '#94a3b8' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5" style={{ color: '#FFD700' }} />
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Warm Up</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <p className="mb-8 text-sm" style={{ color: '#94a3b8' }}>
          Aquecimento vocal, exercícios de timbragem e conteúdos complementares.
        </p>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="glass-card rounded-xl p-6 animate-pulse h-24" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Flame className="w-16 h-16 mx-auto mb-4" style={{ color: '#475569' }} />
            <p style={{ color: '#94a3b8' }}>Nenhum conteúdo de warm up disponível.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.id}
                data-testid={`warmup-item-${item.id}`}
                className="glass-card rounded-xl p-6 flex items-center gap-4 animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.05}s`, opacity: 0 }}
              >
                <button
                  onClick={() => togglePlay(item)}
                  data-testid={`warmup-play-${item.id}`}
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: playingId === item.id ? '#FFD700' : 'rgba(255,215,0,0.1)', color: playingId === item.id ? '#000' : '#FFD700' }}
                >
                  {playingId === item.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate" style={{ color: '#f8fafc' }}>{item.title}</h3>
                  {item.description && <p className="text-sm truncate" style={{ color: '#94a3b8' }}>{item.description}</p>}
                  <span className="text-xs px-2 py-0.5 rounded mt-1 inline-block" style={{ background: 'rgba(255,215,0,0.1)', color: '#FFD700' }}>
                    {item.content_type === 'audio' ? 'Áudio' : 'Vídeo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
