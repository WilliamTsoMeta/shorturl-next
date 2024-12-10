'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ThemeToggle } from '@/components/ThemeToggle'

interface Resource {
  id: string;
  type: string;
  attributes: {
    title: string;
    shortUrl: string;
    originalUrl: string;
    description: string;
    icon: string;
    click_count: number;
    created_at: string;
  };
  qrcode: {
    attributes: {
      qr_code_url: string;
    };
  };
}

export default function LinkList() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [selectedTab, setSelectedTab] = useState('全部')

  const tabs = ['全部']
  const viewModes = ['grid', 'list']

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          throw new Error('No access token found')
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/resource/list`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            resourceTypes: ["shorturl"],
            resourceSortBy: "created_at",
            resourceSortOrder: "DESC",
            pageSize: 10,
            pageNumber: 1,
            isFavorite: null,
            isCreatedByUser: null
          })
        })

        if (!response.ok) {
          throw new Error('Failed to fetch resources')
        }

        const data = await response.json()
        // Flatten all resources from different tags
        const allResources = data.data.reduce((acc, tag) => {
          return [...acc, ...(tag.resources || [])]
        }, [])
        setResources(allResources)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching resources:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchResources()
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">我的链接</h1>
            <div className="flex items-center space-x-4">
              {loading && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-white"></div>
              )}
              <a
                href="/create_link"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                创建链接
              </a>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="p-4 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg">
            Error: {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4">
          {resources.map((resource) => (
            <div key={resource.id} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                {resource.attributes.icon ? (
                  <img src={resource.attributes.icon} alt="" className="w-6 h-6" />
                ) : (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {resource.attributes.click_count}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {resource.attributes.title}
                </h3>
                <div className="flex items-center space-x-2">
                  <a 
                    href={resource.attributes.shortUrl} 
                    className="text-blue-500 hover:underline" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {resource.attributes.shortUrl}
                  </a>
                  <span className="text-gray-400">→</span>
                  <a 
                    href={resource.attributes.originalUrl} 
                    className="text-gray-500 hover:underline truncate" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {resource.attributes.originalUrl}
                  </a>
                </div>
                {resource.attributes.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {resource.attributes.description}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  点击：{resource.attributes.click_count} · 
                  创建于：{new Date(resource.attributes.created_at).toLocaleDateString()}
                </p>
              </div>
              {resource.qrcode?.attributes?.qr_code_url && (
                <div className="w-16">
                  <img 
                    src={resource.qrcode.attributes.qr_code_url} 
                    alt="QR Code" 
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
