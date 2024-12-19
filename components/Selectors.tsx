import { useTeams } from '@/lib/hooks/useTeams'
import { useProjects } from '@/lib/hooks/useProjects'
import { useState } from 'react'
import { Menu, Transition } from '@headlessui/react'

const timeRanges = [
  { label: 'Today', value: 'today', days: 1 },
  { label: 'Last 7 days', value: '7days', days: 7 },
  { label: 'Last 30 days', value: '30days', days: 30 },
  { label: 'Last 90 days', value: '90days', days: 90 },
  { label: 'This year', value: 'year', days: 365 },
  { label: 'Custom', value: 'custom' },
]

interface SelectorsProps {
  selectedTeam: string | null
  selectedProject: string | null
  onTeamChange: (teamId: string | null) => void
  onProjectChange: (projectId: string | null) => void
  onDateRangeChange?: (startDate: Date | null, endDate: Date | null) => void
  onTimeRangeChange?: (range: typeof timeRanges[0]) => void
  selectedTimeRange?: typeof timeRanges[0]
  showDateRange?: boolean
}

const Selectors = ({
  selectedTeam,
  selectedProject,
  onTeamChange,
  onProjectChange,
  onDateRangeChange,
  onTimeRangeChange,
  selectedTimeRange = timeRanges[1],
  showDateRange = true
}: SelectorsProps) => {
  const { teams, loading: teamsLoading } = useTeams()
  const { projects, loading: projectsLoading } = useProjects(selectedTeam)
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date()
    return date.toISOString().split('T')[0]
  })

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const teamId = e.target.value || null
    onTeamChange(teamId)
    onProjectChange(null)
  }

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = e.target.value || null
    onProjectChange(projectId)
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value)
    if (onDateRangeChange) {
      onDateRangeChange(new Date(e.target.value), endDate ? new Date(endDate) : null)
    }
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value)
    if (onDateRangeChange) {
      onDateRangeChange(startDate ? new Date(startDate) : null, new Date(e.target.value))
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1">
        <label htmlFor="team" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Team
        </label>
        <select
          id="team"
          value={selectedTeam || ''}
          onChange={handleTeamChange}
          disabled={teamsLoading}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          <option value="">Select team</option>
          {teams?.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <label htmlFor="project" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Project
        </label>
        <select
          id="project"
          value={selectedProject || ''}
          onChange={handleProjectChange}
          disabled={projectsLoading || !selectedTeam}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          <option value="">Select project</option>
          {projects?.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {showDateRange && (
        <div className="flex-1">
          <div className="flex gap-8 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 whitespace-nowrap">
                Time Range
              </label>
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center justify-between min-w-[120px] w-32 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500">
                  <span className="truncate">{selectedTimeRange.label}</span>
                  <svg className="ml-2 -mr-1 h-5 w-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Menu.Button>
                <Transition
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute left-0 w-56 mt-2 origin-top-right bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      {timeRanges.map((range) => (
                        <Menu.Item key={range.value}>
                          {({ active }) => (
                            <button
                              onClick={() => onTimeRangeChange?.(range)}
                              className={`${
                                active ? 'bg-gray-100 dark:bg-gray-600' : ''
                              } w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200`}
                            >
                              {range.label}
                            </button>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>

            {selectedTimeRange.value === 'custom' && (
              <>
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={handleStartDateChange}
                    className="block w-40 px-3 py-2 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={handleEndDateChange}
                    className="block w-40 px-3 py-2 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Selectors;
