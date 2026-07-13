# Code Review Rules

## TypeScript

- Strict mode; no `any`.
- Prefer named exports (`export function X`) over default exports, except for Expo Router screen files, which require a default export.
- Type props with a local `type X = { ... }`, not inline destructured types.

## React / React Native

- Functional components only.
- Styling via NativeWind (`className`), not `StyleSheet.create`. Use inline `style` only for values that can't be expressed with Tailwind classes (e.g. dynamic safe-area insets).
- Respect safe-area insets (`useSafeAreaInsets`) on any screen-edge UI (headers, tab bars, floating elements).
- Data fetching goes through TanStack Query hooks in `lib/hooks/`, not ad-hoc `fetch` calls in components.

## Formatting

- Prettier: single quotes, semicolons, trailing commas, 100 char width, 2-space indent.
- ESLint: `eslint-config-expo/flat`.

## Testing

- Jest + `@testing-library/react-native`, colocated under `__tests__/`.
- Cover pure logic (formatting, aggregation, calculations) over snapshot tests.
