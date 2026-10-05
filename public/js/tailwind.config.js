// Configuração do Tailwind CDN compartilhada entre as páginas.
// Deve ser carregado logo após <script src="https://cdn.tailwindcss.com">.
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#07070a',
          900: '#0d0d12',
          800: '#15151c',
          700: '#1f1f29',
        },
        ember: {
          300: '#fcd38d',
          400: '#fbbf5a',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(245, 158, 11, 0.45)',
      },
    },
  },
};
