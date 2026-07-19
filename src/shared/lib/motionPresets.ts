export const smoothSpring = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.85,
} as const

export const softSpring = {
  type: 'spring',
  stiffness: 280,
  damping: 30,
  mass: 0.9,
} as const

export const panelPresence = {
  initial: { opacity: 0, y: 18, scale: 0.97, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, y: 12, scale: 0.97, filter: 'blur(5px)' },
  transition: softSpring,
} as const

export const sidePanelPresence = {
  initial: { opacity: 0, x: 28, scale: 0.98, filter: 'blur(8px)' },
  animate: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, x: 28, scale: 0.98, filter: 'blur(8px)' },
  transition: smoothSpring,
} as const

export const toastPresence = {
  initial: { opacity: 0, y: 20, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 14, scale: 0.96 },
  transition: smoothSpring,
} as const

export const listContainer = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.035, delayChildren: 0.03 },
  },
} as const

export const listItem = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: smoothSpring },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.16 } },
} as const
