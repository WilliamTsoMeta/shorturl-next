import { Resource } from '@/types/resource'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface ResourceListProps {
  resources: Resource[]
  loading: boolean
  error: string | null
}

export function ResourceList({ resources, loading, error }: ResourceListProps) {
  const router = useRouter()

  const handleLinkClick = (resource: Resource) => {
    localStorage.setItem('linkDetail', JSON.stringify(resource))
    router.push(`/link/${resource.id}`)
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div className="text-red-500">{error}</div>
  if (resources.length === 0) return <div>暂无链接</div>

  return (
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
                  e.stopPropagation()
                  router.push(`/analytics?url=${encodeURIComponent(resource.attributes.shortUrl)}`)
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
  )
}
