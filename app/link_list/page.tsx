'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { useTeams } from '@/lib/hooks/useTeams'
import { useProjects } from '@/lib/hooks/useProjects'
import Image from 'next/image'

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
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const router = useRouter()
  const { teams, loading: teamsLoading, error: teamsError } = useTeams()
  const { projects, loading: projectsLoading } = useProjects(selectedTeam)

  const handleLinkClick = (resource: Resource) => {
    // 将资源数据存储到 localStorage
    localStorage.setItem('linkDetail', JSON.stringify(resource));
    // 跳转到详情页
    router.push(`/link/${resource.id}`);
  };

  const fetchResources = useCallback(
    async () => {
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
            scopeType: selectedProject ? 'project' : selectedTeam ? 'team' : undefined,
            scopeId: selectedProject || selectedTeam,
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
    },[selectedTeam, selectedProject]
  )
  
  useEffect(() => {
    fetchResources()
  }, [selectedTeam, selectedProject])

  return (
    <div className="container mx-auto px-4">
      <Header />
      <div className="my-8">
        {loading || teamsLoading || projectsLoading ? (
          <div>Loading...</div>
        ) : error || teamsError ? (
          <div className="text-red-500">
            {error || teamsError}
          </div>
        ) : (
          <>
            <div className="mb-6 flex justify-between items-center">
              <div className="flex gap-4">
                <select
                  value={selectedTeam || ''}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    setSelectedTeam(value);
                    setSelectedProject(null);
                  }}
                  className="block w-64 px-4 pr-8 py-3 text-base rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">All Teams</option>
                  {teams?.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value || null)}
                  disabled={!selectedTeam}
                  className="block w-64 px-4 pr-8 py-3 text-base rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select Project</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

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
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
