const { colors } = require('./lib/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'media' (Tailwind's default) crashes NativeWind's web runtime in dev:
  // its MutationObserver tries to set the color scheme as soon as the
  // stylesheet is injected, which is only allowed when darkMode is 'class'.
  // The app doesn't toggle dark mode manually, so 'class' is a safe no-op fix.
  darkMode: 'class',
  theme: {
    extend: {
      // Maps Tailwind's font-* utilities to the loaded Poppins weights (see
      // app/_layout.tsx's useFonts call) — React Native doesn't synthesize
      // bold from a single custom font file the way web does, each weight
      // needs its own exact family name.
      fontFamily: {
        sans: ['Poppins_400Regular'],
        normal: ['Poppins_400Regular'],
        medium: ['Poppins_500Medium'],
        semibold: ['Poppins_600SemiBold'],
        bold: ['Poppins_700Bold'],
      },
      // Surface hierarchy (background/nav/card) + accent colors, sourced
      // from lib/theme.js — change a value there, not here. Yields
      // bg-background, bg-nav, border-nav-border, bg-card,
      // border-card-border, bg-card-raised, text-accent, etc.
      colors: {
        background: colors.background,
        nav: { DEFAULT: colors.nav, border: colors.navBorder },
        card: { DEFAULT: colors.card, border: colors.cardBorder, raised: colors.cardRaised },
        accent: colors.accent,
        danger: colors.danger,
        success: colors.success,
      },
    },
  },
  plugins: [],
};
