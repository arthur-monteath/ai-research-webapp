'use client'

import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const handleLogout = () => {
    // In a real app, you'd clear the session/token here
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">AI Research</h1>
          <Button onClick={handleLogout}>Logout</Button>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}

