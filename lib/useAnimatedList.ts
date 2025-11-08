import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

type AnimatedListOptions = {
  duration?: number;
  easing?: string;
};

export function useAnimatedList<T extends HTMLElement>({
  duration = 260,
  easing = 'cubic-bezier(0.16, 1, 0.3, 1)'
}: AnimatedListOptions = {}) {
  const parentRef = useRef<T | null>(null);
  const positionsRef = useRef<Map<Element, DOMRect>>(new Map());
  const reduceMotionRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const setRef = useCallback((node: T | null) => {
    parentRef.current = node;
    if (!node) {
      positionsRef.current.clear();
      hasInitializedRef.current = false;
      return;
    }
    const initialPositions = new Map<Element, DOMRect>();
    node.childNodes.forEach((child) => {
      if (child instanceof HTMLElement) {
        initialPositions.set(child, child.getBoundingClientRect());
      }
    });
    positionsRef.current = initialPositions;
    hasInitializedRef.current = false;
  }, []);

  useLayoutEffect(() => {
    const parent = parentRef.current;
    if (!parent) {
      positionsRef.current.clear();
      return;
    }

    const nextPositions = new Map<Element, DOMRect>();
    parent.childNodes.forEach((child) => {
      if (child instanceof HTMLElement) {
        nextPositions.set(child, child.getBoundingClientRect());
      }
    });

    const shouldAnimate = hasInitializedRef.current && !reduceMotionRef.current;

    if (shouldAnimate) {
      nextPositions.forEach((rect, element) => {
        const previous = positionsRef.current.get(element);
        if (!previous) {
          element.getAnimations?.().forEach((animation) => animation.cancel());
          element.animate(
            [
              { opacity: 0, transform: 'scale(0.97)' },
              { opacity: 1, transform: 'scale(1)' }
            ],
            { duration, easing, fill: 'both' }
          );
          return;
        }

        const deltaX = previous.left - rect.left;
        const deltaY = previous.top - rect.top;

        if (deltaX !== 0 || deltaY !== 0) {
          element.getAnimations?.().forEach((animation) => animation.cancel());
          element.animate(
            [
              { transform: `translate(${deltaX}px, ${deltaY}px)` },
              { transform: 'translate(0, 0)' }
            ],
            { duration, easing, fill: 'both' }
          );
        }
      });
    }

    hasInitializedRef.current = true;
    positionsRef.current = nextPositions;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyPreference = (matches: boolean) => {
      reduceMotionRef.current = matches;
    };

    applyPreference(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      applyPreference(event.matches);
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener);
      return () => {
        media.removeEventListener('change', listener);
      };
    }

    media.addListener?.(listener);
    return () => {
      media.removeListener?.(listener);
    };
  }, []);

  return setRef;
}
