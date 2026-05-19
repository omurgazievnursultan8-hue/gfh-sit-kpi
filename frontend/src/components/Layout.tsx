export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 sm:p-6 mx-auto" style={{ maxWidth: 1280 }}>
      {children}
    </div>
  )
}
