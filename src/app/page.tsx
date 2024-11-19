'use client';

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, Search } from 'lucide-react'

export default function Home() {
  const [url, setUrl] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (url) {
      try {
        const encodedUrl = encodeURIComponent(url)
        router.push(`/video?url=${encodedUrl}`)
        router.refresh()
      } catch (error) {
        console.error('Navigation error:', error)
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="w-full bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Image src="/overlap_logo.png" alt="Overlap Logo" width={40} height={40} className="rounded-lg" />
            <span className="ml-2 text-3xl font-bold text-red-500">OVERLAP</span>
          </div>
          <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
            Sign In
          </Button>
        </div>
      </header>
      
      <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-orange-50 via-red-50 to-orange-100">
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            Kyle, Welcome Back.
          </h1>
          <h2 className="text-xl md:text-2xl font-semibold mb-6 text-gray-700">
            Enter a YouTube Podcast URL
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="relative"> 
              <Input 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..." 
                className="w-full pl-12 pr-16 py-3 rounded-full border-2 border-orange-200 focus:border-orange-400 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Button 
                type="submit"
                className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-red-500 hover:bg-red-600 rounded-full px-4 py-2"
              >
                Go
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
