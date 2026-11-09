// Configuração do Tailwind CDN compartilhada entre as páginas da Harmonia.
// Paleta "Teal on paper" e tipografia "Erode" (tasteskill direction: page-is-the-object).
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Erode', 'Georgia', 'serif'],
        display: ['Erode', 'Georgia', 'serif'],
        serif: ['Erode', 'Georgia', 'serif'],
      },
      colors: {
        paper: '#f7f9f8',
        folio: {
          50: '#f7f9f8',
          100: '#ebf0ee',
          200: '#dfe7e4',
          300: '#cdd9d5',
        },
        ink: {
          DEFAULT: '#06525c',
          950: '#06525c',
          900: '#08454d',
          800: '#175a63',
          700: '#2f737d',
          600: '#498992',
        },
        ember: {
          300: '#dcebe7',
          400: '#06525c',
          500: '#06525c',
          600: '#043d45',
        },
      },
    },
  },
};
