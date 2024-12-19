'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import Image from 'next/image'
import Dashboard from '@/components/Dashboard'
import Selectors from '@/components/Selectors'

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

const timeRanges = [
  { label: 'Last 24 hours', value: 'last_24_hours' },
  { label: 'Last 7 days', value: 'last_7_days' },
  { label: 'Last 30 days', value: 'last_30_days' },
  { label: 'Custom', value: 'custom' },
]

export default function LinkList() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [showDashboard, setShowDashboard] = useState(false)
  const [selectedRange, setSelectedRange] = useState(timeRanges[1]) // Default to last 7 days
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null])

  const router = useRouter()

  const handleLinkClick = (resource: Resource) => {
    localStorage.setItem('linkDetail', JSON.stringify(resource));
    router.push(`/link/${resource.id}`);
  };

  const fetchResources = useCallback(
    async () => {
      try {
        setLoading(true)
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
            scopeType: selectedProject ? 'project' : selectedTeam ? 'team' : undefined,
            scopeId: selectedProject || selectedTeam,
            resourceTypes: ["shorturl"],
            resourceSortBy: "created_at",
            resourceSortOrder: "DESC",
            groupByTag: false,
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
        const allResources = data.data.reduce((acc, tag) => {
          return [...acc, ...(tag.resources || [])]
        }, [])
        setResources(allResources)
      } catch (err) {
        console.error('Error fetching resources:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    },[selectedTeam, selectedProject]
  )
  
  useEffect(() => {
    fetchResources()
  }, [selectedTeam, selectedProject])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
         

          <div className="flex gap-4 items-center">
            <button
              onClick={() => router.push('/create_link')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              创建新链接
            </button>

            <button
              onClick={() => setShowDashboard(!showDashboard)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {showDashboard ? '隐藏统计' : '显示统计'}
            </button>
          </div>
        </div>
        <Selectors
          selectedTeam={selectedTeam}
          selectedProject={selectedProject}
          onTeamChange={setSelectedTeam}
          onProjectChange={setSelectedProject}
          onTimeRangeChange={setSelectedRange}
          selectedTimeRange={selectedRange}
          onDateRangeChange={(start, end) => setCustomDateRange([start, end])}
          showDateRange={showDashboard}
        />
        {/* Dashboard Section */}
        {showDashboard && (
          <div className="mb-8">
            <Dashboard 
              teamId={selectedTeam} 
              projectId={selectedProject} 
              selectedRange={selectedRange}
              customDateRange={customDateRange}
            />
          </div>
        )}

        {/* Links Section */}
        <div className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div>Loading...</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : resources.length === 0 ? (
              <div>暂无链接</div>
            ) : (
              resources.map((resource) => (
                <div
                  key={resource.id}
                  onClick={() => handleLinkClick(resource)}
                  className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <div className="flex-shrink-0 mb-2 sm:mb-0">
                    <Image
                      src={resource.attributes.icon || '/default-icon.png'}
                      alt="Website Icon"
                      width={40}
                      height={40}
                      className="rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {resource.attributes.title || resource.attributes.shortUrl}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/analytics?url=${encodeURIComponent(resource.attributes.shortUrl)}`);
                        }}
                        className="self-start sm:self-center px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors whitespace-nowrap"
                      >
                        统计分析
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 break-all">
                      {resource.attributes.originalUrl}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        创建于：{new Date(resource.attributes.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        点击：{resource.attributes.click_count}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
