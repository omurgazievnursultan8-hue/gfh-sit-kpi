export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {children}
    </div>
  )
}
