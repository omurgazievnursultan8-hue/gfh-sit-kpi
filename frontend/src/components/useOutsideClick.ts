import { useEffect, type RefObject } from 'react'

/** Calls `onOutside` when a pointerdown lands outside `ref`, or Escape is
 *  pressed. Pass `active=false` to disable (e.g. while the menu is closed). */
export function useOutsideClick(
  ref: RefObject<HTMLElement>,
  active: boolean,
  onOutside: () => void,
): void {
  useEffect(() => {
    if (!active) return
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOutside()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, active, onOutside])
}
