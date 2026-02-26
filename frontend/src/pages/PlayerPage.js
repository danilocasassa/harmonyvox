import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Play, Pause, ArrowLeft, Volume2, VolumeX, RotateCcw } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const TRACK_COLORS = {
  soprano: '#FF6B9D',
  contralto: '#C084FC',
  tenor: '#38BDF8',
  baritono: '#34D399',
  base: '#FFD700',
  default: '#94A3B8'
};

function getTrackColor(type) {
  if (!type) return TRACK_COLORS.default;
  const t = type.toLowerCase();
  if (t.includes('soprano')) return TRACK_COLORS.soprano;
  if (t.includes('contralto') || t.includes('alto')) return TRACK_COLORS.contralto;
  if (t.includes('tenor')) return TRACK_COLORS.tenor;
  if (t.includes('bari')) return TRACK_COLORS.baritono;
  if (t.includes('base') || t.includes('melod') || t.includes('harmon')) return TRACK_COLORS.base;
  return TRACK_COLORS.default;
}

export default function PlayerPage() {
  const { songId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trackStates, setTrackStates] = useState([]);
  const audioRefs = useRef([]);
  const animationRef = useRef(null);
  const isSeekingRef = useRef(false);

  useEffect(() => {
    loadSong();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioRefs.current.forEach(a => { if (a) { a.pause(); a.src = ''; } });
    };
  }, [songId]);

  const loadSong = async () => {
    try {
      const res = await fetch(`${API}/songs/${songId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Não encontrada');
      const data = await res.json();
      setSong(data);
      setTrackStates(data.tracks.map(() => ({ volume: 1, muted: false, solo: false })));
      audioRefs.current = new Array(data.tracks.length).fill(null);
    } catch (err) {
      toast.error('Erro ao carregar música');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const initAudio = useCallback((index, el) => {
    if (!el || audioRefs.current[index] === el) return;
    audioRefs.current[index] = el;
    el.crossOrigin = 'anonymous';
    el.preload = 'auto';
    el.src = `${API}/audio/stream/${songId}/${index}?token=${token}`;

    el.onloadedmetadata = () => {
      if (el.duration && el.duration > duration) {
        setDuration(el.duration);
      }
    };

    el.onended = () => {
      setIsPlaying(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [songId, token, duration]);

  const updateTime = useCallback(() => {
    if (!isSeekingRef.current) {
      const audio = audioRefs.current.find(a => a && !a.paused);
      if (audio) {
        setCurrentTime(audio.currentTime);
      }
    }
    animationRef.current = requestAnimationFrame(updateTime);
  }, []);

  const applySoloMute = useCallback(() => {
    const hasSolo = trackStates.some(t => t.solo);
    audioRefs.current.forEach((audio, i) => {
      if (!audio) return;
      const state = trackStates[i];
      if (hasSolo) {
        audio.volume = state.solo ? state.volume : 0;
        audio.muted = state.solo ? false : true;
      } else {
        audio.volume = state.muted ? 0 : state.volume;
        audio.muted = state.muted;
      }
    });
  }, [trackStates]);

  useEffect(() => {
    applySoloMute();
  }, [trackStates, applySoloMute]);

  const togglePlay = async () => {
    if (isPlaying) {
      audioRefs.current.forEach(a => { if (a) a.pause(); });
      setIsPlaying(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    } else {
      applySoloMute();
      const playPromises = audioRefs.current.map(a => {
        if (a) return a.play().catch(() => {});
        return Promise.resolve();
      });
      await Promise.all(playPromises);
      setIsPlaying(true);
      animationRef.current = requestAnimationFrame(updateTime);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    isSeekingRef.current = true;
    setCurrentTime(time);
    audioRefs.current.forEach(a => { if (a) a.currentTime = time; });
    setTimeout(() => { isSeekingRef.current = false; }, 100);
  };

  const handleVolumeChange = (index, value) => {
    setTrackStates(prev => prev.map((t, i) => i === index ? { ...t, volume: value } : t));
  };

  const toggleMute = (index) => {
    setTrackStates(prev => prev.map((t, i) => i === index ? { ...t, muted: !t.muted, solo: false } : t));
  };

  const toggleSolo = (index) => {
    setTrackStates(prev => prev.map((t, i) => {
      if (i === index) return { ...t, solo: !t.solo, muted: false };
      return { ...t, solo: false };
    }));
  };

  const resetAll = () => {
    setTrackStates(prev => prev.map(t => ({ ...t, volume: 1, muted: false, solo: false })));
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Prevent right-click on the entire player page
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'AUDIO' || e.target.closest('[data-player-area]')) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#02040a' }}>
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,215,0,0.1)' }} />
          <p style={{ color: '#94a3b8' }}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!song) return null;

  return (
    <div className="min-h-screen" style={{ background: '#02040a' }} data-player-area="true" onContextMenu={(e) => e.preventDefault()}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(2,4,10,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/')} data-testid="player-back-button" className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#94a3b8' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>{song.title}</h1>
            {song.artist && <p className="text-sm" style={{ color: '#94a3b8' }}>{song.artist}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 pb-40">
        {/* Track Lanes */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif', color: '#f8fafc' }}>Faixas</h2>
            <Button variant="ghost" size="sm" onClick={resetAll} data-testid="reset-all-button" className="text-xs" style={{ color: '#94a3b8' }}>
              <RotateCcw className="w-3 h-3 mr-1" /> Resetar
            </Button>
          </div>
          {song.tracks.map((track, i) => {
            const color = getTrackColor(track.type);
            const state = trackStates[i] || { volume: 1, muted: false, solo: false };
            const hasSolo = trackStates.some(t => t.solo);
            const isActive = state.solo || (!hasSolo && !state.muted);
            return (
              <div
                key={i}
                data-testid={`track-lane-${i}`}
                className="track-lane flex items-center gap-4 p-4 rounded-xl"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                  border: `1px solid ${isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`,
                  opacity: isActive ? 1 : 0.4,
                  transition: 'all 0.3s ease-out'
                }}
              >
                {/* Hidden audio element */}
                <audio
                  ref={(el) => initAudio(i, el)}
                  preload="auto"
                  style={{ display: 'none' }}
                  controlsList="nodownload"
                />
                {/* Track color indicator */}
                <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: color }} />
                {/* Track name */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: '#f8fafc' }}>{track.name}</p>
                  <p className="text-xs" style={{ color: '#475569' }}>{track.type}</p>
                </div>
                {/* Solo button */}
                <button
                  data-testid={`track-solo-${i}`}
                  onClick={() => toggleSolo(i)}
                  className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all"
                  style={{
                    border: `1px solid ${state.solo ? '#FFD700' : 'rgba(255,215,0,0.3)'}`,
                    background: state.solo ? '#FFD700' : 'transparent',
                    color: state.solo ? '#000' : '#FFD700',
                  }}
                >
                  S
                </button>
                {/* Mute button */}
                <button
                  data-testid={`track-mute-${i}`}
                  onClick={() => toggleMute(i)}
                  className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all"
                  style={{
                    border: `1px solid ${state.muted ? '#ef4444' : 'rgba(239,68,68,0.3)'}`,
                    background: state.muted ? '#ef4444' : 'transparent',
                    color: state.muted ? '#fff' : '#ef4444',
                  }}
                >
                  M
                </button>
                {/* Volume */}
                <div className="flex items-center gap-2 w-32">
                  <button onClick={() => toggleMute(i)} className="flex-shrink-0">
                    {state.muted || (hasSolo && !state.solo)
                      ? <VolumeX className="w-4 h-4" style={{ color: '#ef4444' }} />
                      : <Volume2 className="w-4 h-4" style={{ color }} />
                    }
                  </button>
                  <input
                    type="range"
                    data-testid={`track-volume-${i}`}
                    min="0"
                    max="1"
                    step="0.01"
                    value={state.volume}
                    onChange={(e) => handleVolumeChange(i, parseFloat(e.target.value))}
                    className="w-full"
                    style={{ accentColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {song.tracks.length === 0 && (
          <div className="text-center py-20">
            <p style={{ color: '#94a3b8' }}>Nenhuma faixa disponível para esta música.</p>
          </div>
        )}
      </main>

      {/* Fixed Player Bar */}
      {song.tracks.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50" style={{ background: '#050508', borderTop: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' }}>
          <div className="max-w-4xl mx-auto px-6 py-4">
            {/* Progress bar */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono w-12 text-right" style={{ color: '#94a3b8' }}>{formatTime(currentTime)}</span>
              <input
                type="range"
                data-testid="player-seek-bar"
                min="0"
                max={duration || 0}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="flex-1"
                style={{ accentColor: '#FFD700' }}
              />
              <span className="text-xs font-mono w-12" style={{ color: '#94a3b8' }}>{formatTime(duration)}</span>
            </div>
            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                data-testid="player-play-button"
                onClick={togglePlay}
                className="w-14 h-14 rounded-full flex items-center justify-center text-black"
                style={{ background: '#FFD700', boxShadow: '0 0 20px rgba(255,215,0,0.3)' }}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
