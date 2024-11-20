'use client';

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="w-full bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          
        </div>
      </header>
      
      <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-orange-50 via-red-50 to-orange-100">
        <Button
          onClick={() => router.push('/podcast')}
          className="bg-red-500 hover:bg-red-600 rounded-full px-8 py-4 text-lg"
        >
          Go to Podcast
        </Button>
      </main>
    </div>
  )
}
