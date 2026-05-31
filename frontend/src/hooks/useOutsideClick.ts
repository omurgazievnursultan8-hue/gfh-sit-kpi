import { useEffect, useRef, type RefObject } from 'react'

/** Calls `onOutside` when a pointerdown lands outside `ref`, or Escape is
 *  pressed. Pass `active=false` to disable (e.g. while the menu is closed).
 *  `onOutside` is held in a ref so passing an inline callback does not re-bind
 *  the document listeners on every render. */
export function useOutsideClick(
  ref: RefObject<HTMLElement>,
  active: boolean,
  onOutside: () => void,
): void {
  const onOutsideRef = useRef(onOutside)
  useEffect(() => { onOutsideRef.current = onOutside })

  useEffect(() => {
    if (!active) return
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutsideRef.current()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOutsideRef.current()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, active])
}
