/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#070b16',
        surface: '#0c1220',
        panel: '#101728',
        panel2: '#0f1626',
        edge: 'rgba(148,163,184,0.10)',
        edge2: 'rgba(148,163,184,0.16)',
        ink: '#e6edf7',
        mute: '#93a1b8',
        faint: '#5b6b83',
        brand: '#2f6bff',
        saffron: '#f59a23',
        sage: '#48d29b',
        gold: '#f0b64b',
        orange: '#ff8a3d',
        danger: '#ff5860',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.02) inset, 0 12px 30px -18px rgba(0,0,0,0.9)',
        glow: '0 0 0 1px rgba(47,107,255,0.35), 0 0 28px -6px rgba(47,107,255,0.45)',
        soft: '0 20px 50px -20px rgba(0,0,0,0.85)',
      },
      keyframes: {
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.45' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(400%)' } },
        floatUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
      animation: {
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
        shimmer: 'shimmer 1.8s linear infinite',
        scan: 'scan 2.4s linear infinite',
        floatUp: 'floatUp .5s ease-out both',
      },
    },
  },
  plugins: [],
}
