import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

interface PageContextValue {
  titleKey: string
  setTitleKey: (key: string) => void
}

const PageContext = createContext<PageContextValue>({ titleKey: '', setTitleKey: () => {} })

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [titleKey, setTitleKey] = useState('')
  const set = useCallback((key: string) => setTitleKey(key), [])
  // Memoise context value — new object identity each render would re-render
  // every consumer (incl. AppShell route announcer + Topbar) on unrelated state changes.
  const value = useMemo(() => ({ titleKey, setTitleKey: set }), [titleKey, set])
  return (
    <PageContext.Provider value={value}>
      {children}
    </PageContext.Provider>
  )
}

export function usePageTitle(key: string) {
  const { setTitleKey } = useContext(PageContext)
  useEffect(() => {
    setTitleKey(key)
    return () => setTitleKey('')
  }, [key, setTitleKey])
}

export function usePageTitleKey(): string {
  return useContext(PageContext).titleKey
}
