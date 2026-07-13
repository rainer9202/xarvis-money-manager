/**
 * Single source of truth for the app's dark theme palette. Plain CommonJS
 * (not .ts) so it can be `require`d directly by tailwind.config.js — Node
 * runs that file without a TypeScript loader, and TS/TSX files can still
 * `import { colors } from '@/lib/theme'` without issue.
 *
 * Consumed two ways:
 *  - `tailwind.config.js` spreads `colors` into `theme.extend.colors`, so
 *    className usages like `bg-surface-card` pick these up.
 *  - Native components that don't accept Tailwind classNames (Ionicons'
 *    `color` prop, `ActivityIndicator`'s `color` prop, RN `style` objects)
 *    import `colors` directly instead of hardcoding a hex string.
 *
 * Changing a value here changes it everywhere at once — that's the point.
 */

/** @type {Record<string, string>} */
const colors = {
  // Screen background — the darkest layer, everything else sits on top of
  // this.
  background: '#0a0a0a',

  // Chrome: MovementsSummaryHeader, PageHeader, the bottom tab bar.
  // Deliberately the lightest surface in the app — chrome stays visually
  // anchored/distinct at the top and bottom of every screen instead of
  // blending into the content below it.
  nav: '#232323',
  navBorder: '#363636',

  // Containers: the shared `Card` component (Profile/Categories/Accounts/
  // Groups/Reports list rows and stat tiles) — the main "surface" content
  // sits on. Close to `background` on purpose — subtle, content-first,
  // clearly darker than the `nav` chrome above/below it.
  card: '#1c1c1c',
  cardBorder: '#2e2e2e',

  // Elements nested inside a `card` (icon circles, badge pills) that need to
  // stand out from the darker `card` fill instead of blending into it.
  cardRaised: '#404040',

  // Accent + semantic colors, pulled out of their many inline `color="#..."`
  // call sites so they're all changeable from one place too.
  accent: '#fbbf24', // amber-400 — primary brand/interactive accent
  danger: '#ef4444', // red-500 — destructive actions, expense amounts
  success: '#10b981', // emerald-500 — income amounts, "good" deltas
};

module.exports = { colors };
