import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { DependencyList } from 'react';

type AnimatedListOptions = {
  duration?: number;
  easing?: string;
  dependencies?: DependencyList;
};

export function useAnimatedList<T extends HTMLElement>({
  duration = 360,
  easing = 'cubic-bezier(0.22, 1, 0.36, 1)',
  dependencies
}: AnimatedListOptions = {}) {
  const parentRef = useRef<T | null>(null);
  const positionsRef = useRef<Map<Element, DOMRect>>(new Map());
  const animationsRef = useRef(new WeakMap<Element, Animation[]>());
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
    Array.from(node.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        initialPositions.set(child, child.getBoundingClientRect());
      }
    });
    positionsRef.current = initialPositions;
    animationsRef.current = new WeakMap<Element, Animation[]>();
    hasInitializedRef.current = false;
  }, []);

  useLayoutEffect(() => {
    const parent = parentRef.current;
    if (!parent) {
      positionsRef.current.clear();
      return;
    }

    const elements = Array.from(parent.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement
    );

    elements.forEach((element) => {
      const activeAnimations = animationsRef.current.get(element);
      if (activeAnimations?.length) {
        activeAnimations.forEach((animation) => animation.cancel());
      }
    });

    const nextPositions = new Map<Element, DOMRect>();
    elements.forEach((element) => {
      nextPositions.set(element, element.getBoundingClientRect());
    });

    const shouldAnimate = hasInitializedRef.current && !reduceMotionRef.current;

    if (shouldAnimate) {
      nextPositions.forEach((rect, element) => {
        const previous = positionsRef.current.get(element);
        if (!previous) {
          const targetOpacity = (() => {
            const view = element.ownerDocument?.defaultView;
            if (!view) return 1;
            const parsed = Number.parseFloat(view.getComputedStyle(element).opacity);
            return Number.isFinite(parsed) ? parsed : 1;
          })();
          const fromOpacity = Math.max(
            0,
            Number.isFinite(targetOpacity) ? Math.min(targetOpacity * 0.7, targetOpacity) : 0
          );
          const animation = element.animate(
            [
              { opacity: fromOpacity, transform: 'scale(0.96)' },
              { opacity: targetOpacity, transform: 'scale(1)' }
            ],
            { duration, easing, fill: 'none' }
          );
          animationsRef.current.set(element, [animation]);
          return;
        }

        const deltaX = previous.left - rect.left;
        const deltaY = previous.top - rect.top;

        if (deltaX !== 0 || deltaY !== 0) {
          const animation = element.animate(
            [
              { transform: `translate(${deltaX}px, ${deltaY}px)` },
              { transform: 'translate(0, 0)' }
            ],
            { duration, easing, fill: 'none' }
          );
          animationsRef.current.set(element, [animation]);
        }
      });
    }

    hasInitializedRef.current = true;
    positionsRef.current = nextPositions;
  }, dependencies ? [...dependencies, duration, easing] : undefined);

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
