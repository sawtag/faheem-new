const EASE = [0.4, 0, 0.2, 1] as const; // mirrors --ease
const STAGGER_CAP = 8;
const STAGGER_S = 0.03;

/**
 * Motion props for a staggered list/grid reveal (design-briefs §0.3): 30ms
 * per item, capped at 8, items past the cap reveal together with the 8th.
 */
export function reveal(index: number) {
  return {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.25,
      ease: EASE,
      delay: Math.min(index, STAGGER_CAP) * STAGGER_S,
    },
  };
}
