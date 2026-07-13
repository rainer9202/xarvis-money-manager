// Closed enum per for-frontend.md §5.0/§6 — MovementType is no longer an API
// resource (there is no list/create/delete route for it at all). It's a
// fixed, compile-time list of exactly three stable, opaque codes; validate/
// select against this hardcoded list client-side, no lookup call needed. The
// server resolves each code to a display label (`movementTypeLabel`)
// independently, so this list is for validation/picker values only, never
// for display text.
export const MOVEMENT_TYPES = ['MT01', 'MT02', 'MT03'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

// Fallback display labels for create forms only (category create, movement
// create), where there's no fetched Category/Movement yet to read a
// server-resolved `movementTypeLabel` from. Any screen displaying an
// already-fetched category/movement must render its own `movementTypeLabel`
// instead — the label can be edited independently of the code server-side,
// so this map is not a source of truth for display.
export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  MT01: 'Gasto',
  MT02: 'Ingreso',
  MT03: 'Transferencia',
};
