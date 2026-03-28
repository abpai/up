export const LUXURY_EASE = [0.16, 1, 0.3, 1]

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: LUXURY_EASE },
  },
}
