'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { useTeams } from '@/lib/hooks/useTeams'

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
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const router = useRouter()
  const { teams, loading: teamsLoading, error: teamsError } = useTeams()

  const handleLinkClick = (resource: Resource) => {
    // 将资源数据存储到 localStorage
    localStorage.setItem('linkDetail', JSON.stringify(resource));
    // 跳转到详情页
    router.push(`/link/${resource.id}`);
  };

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
    <div className="container mx-auto px-4">
      <Header />
      <div className="my-8">
        {loading || teamsLoading ? (
          <div>Loading...</div>
        ) : error || teamsError ? (
          <div className="text-red-500">
            {error || teamsError}
          </div>
        ) : (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <select
                value={selectedTeam || ''}
                onChange={(e) => setSelectedTeam(e.target.value || null)}
                className="block w-64 px-4 py-3 text-base rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
              >
                <option value="">All Teams</option>
                {teams?.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => router.push('/create_link')}
                className="inline-flex items-center px-6 py-3 text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create New Link
              </button>
            </div>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">Your Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((resource) => (
                <div 
                  key={resource.id} 
                  className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => handleLinkClick(resource)}
                >
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
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {resource.attributes.title}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/analytics?url=${encodeURIComponent(resource.attributes.shortUrl)}`);
                        }}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      >
                        统计分析
                      </button>
                    </div>
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
          </div>
        )}
      </div>
    </div>
  )
}
