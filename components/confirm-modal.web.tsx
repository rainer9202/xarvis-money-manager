import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useConfirmModalStore } from '@/store/confirm-modal-store';

// Higher than anything else in the app should ever need — this must always
// win regardless of DOM order against other Modals' portal divs.
const Z_INDEX = 999999;

/**
 * Web implementation (Metro picks this file automatically for web builds —
 * see confirm-modal.tsx for the native implementation).
 *
 * react-native-web's `Modal` portals into its own top-level `document.body`
 * child with `position: fixed` and NO `zIndex` at all (confirmed in
 * react-native-web/src/exports/Modal/ModalContent.js) — stacking between
 * separate Modal instances (e.g. this confirm sheet opening while
 * MovementDetailModal is already open underneath it) is decided purely by
 * DOM append order, which isn't controllable through RN's public `Modal`
 * API (any `style`/`zIndex` passed to it gets overwritten internally).
 * Nesting a high-zIndex element inside our own JSX doesn't escape that
 * either — an ancestor with `overflow`/`transform` (SafeAreaProvider,
 * React Navigation's own wrappers) can trap it in a local stacking context
 * before it ever reaches document.body's top level, exactly the failure
 * mode observed here.
 *
 * The fix: portal directly to `document.body` ourselves — same mechanism
 * react-native-web's own Modal uses internally, but with an explicit
 * `zIndex` we control, guaranteeing this always renders above every other
 * modal regardless of open order. The container div is created once (lazy
 * `useState` initializer) and lives for the component's whole lifetime;
 * only its content (and `pointerEvents`) toggle with `isOpen`, so the two
 * effects below are pure DOM synchronization with no `setState` calls.
 */
export function ConfirmModal() {
  const isOpen = useConfirmModalStore((state) => state.isOpen);
  const title = useConfirmModalStore((state) => state.title);
  const message = useConfirmModalStore((state) => state.message);
  const onConfirm = useConfirmModalStore((state) => state.onConfirm);
  const close = useConfirmModalStore((state) => state.close);

  // Lazy ref init, read during render — react-native-web's own Modal
  // implementation uses this exact pattern for its portal target
  // (react-native-web/src/exports/Modal/ModalPortal.js: `if (canUseDOM &&
  // !elementRef.current) { ... }` followed by reading `elementRef.current`
  // in its return statement). `createPortal`'s target has to be resolved
  // synchronously at render time — there's no effect-only way to do this —
  // and a `useState` value can't be mutated in place for the `pointerEvents`
  // toggle below, so a ref is the only fit here despite the lint rule.
  const containerRef = useRef<HTMLDivElement | null>(null);
  if (containerRef.current === null) {
    const element = document.createElement('div');
    element.style.position = 'fixed';
    element.style.inset = '0';
    element.style.zIndex = String(Z_INDEX);
    // A plain DOM div defaults to `display: block` — RN's `View` always
    // renders `display: flex` under the hood, which the `flex-1
    // justify-end` Pressable inside relies on to stretch full-height and
    // push its content to the bottom. Without this, the Pressable
    // shrink-wraps its content at the top and the "cover the screen"
    // backdrop (position: absolute; inset: 0, sized off its parent) only
    // covers that shrunk area instead of the viewport.
    element.style.display = 'flex';
    element.style.pointerEvents = 'none';
    containerRef.current = element;
  }
  // eslint-disable-next-line react-hooks/refs -- see comment above
  const container = containerRef.current;

  useEffect(() => {
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  }, [container]);

  useEffect(() => {
    container.style.pointerEvents = isOpen ? 'auto' : 'none';
  }, [isOpen, container]);

  const confirm = () => {
    onConfirm?.();
    close();
  };

  return createPortal(
    isOpen ? (
      <Pressable className="flex-1 items-center justify-center px-4" onPress={close}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}
        />
        <View style={{ width: '100%', maxWidth: 440 }}>
          <Pressable onPress={(event) => event.stopPropagation()}>
            <View className="rounded-lg border border-neutral-800 bg-neutral-900 p-8">
              <Text className="mb-3 text-2xl font-semibold text-neutral-50">{title}</Text>
              <Text className="mb-8 text-base text-neutral-400">{message}</Text>
              <View className="flex-row gap-4">
                <Button className="flex-1" variant="secondary" onPress={close}>
                  Cancelar
                </Button>
                <Button className="flex-1" variant="destructive" onPress={confirm}>
                  Eliminar
                </Button>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    ) : null,
    container,
  );
}
