/**
 * HarmonyVox — Paleta de cores global
 * Para alterar a identidade visual, edite apenas este arquivo.
 */

export const COLORS = {
  // Cor principal da marca
  primary: '#a60ef7',
  primaryHover: '#8a0bc9',
  primaryLight: 'rgba(166, 14, 247, 0.15)',
  primaryBorder: 'rgba(166, 14, 247, 0.3)',

  // Gradiente das faixas de voz (do roxo ao coral)
  tracks: {
    soprano:   '#a60ef7', // roxo puro
    contralto: '#b925c9', // roxo magenta
    tenor:     '#cc3c9b', // rosa roxo
    baritono:  '#df536d', // rosa coral
    base:      '#f26a40', // laranja coral
    default:   '#94A3B8', // cinza (fallback)
  },

  // UI geral
  success: '#22c55e',
  danger:  '#ef4444',
  warning: '#f59e0b',
  muted:   '#475569',
};

/** Retorna a cor de uma faixa pelo tipo de voz */
export function trackColor(type) {
  return COLORS.tracks[type] || COLORS.tracks.default;
}
