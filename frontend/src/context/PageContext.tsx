import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface PageContextValue {
  titleKey: string
  setTitleKey: (key: string) => void
}

const PageContext = createContext<PageContextValue>({ titleKey: '', setTitleKey: () => {} })

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [titleKey, setTitleKey] = useState('')
  const set = useCallback((key: string) => setTitleKey(key), [])
  return (
    <PageContext.Provider value={{ titleKey, setTitleKey: set }}>
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
