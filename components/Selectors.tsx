import { useTeams } from '@/lib/hooks/useTeams'
import { useProjects } from '@/lib/hooks/useProjects'
import { useState } from 'react'

interface SelectorsProps {
  selectedTeam: string | null
  selectedProject: string | null
  onTeamChange: (teamId: string | null) => void
  onProjectChange: (projectId: string | null) => void
  onDateRangeChange?: (startDate: Date | null, endDate: Date | null) => void
  showDateRange?: boolean
}

export function Selectors({
  selectedTeam,
  selectedProject,
  onTeamChange,
  onProjectChange,
  onDateRangeChange,
  showDateRange = true
}: SelectorsProps) {
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
    <div className="flex flex-wrap gap-4 items-center">
      <select
        className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
        value={selectedTeam || ''}
        onChange={handleTeamChange}
        disabled={teamsLoading}
      >
        <option value="">选择团队</option>
        {teams?.map((team) => (
          <option key={team.id} value={team.id}>{team.name}</option>
        ))}
      </select>

      <select
        className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
        value={selectedProject || ''}
        onChange={handleProjectChange}
        disabled={!selectedTeam || projectsLoading}
      >
        <option value="">选择项目</option>
        {projects?.map((project) => (
          <option key={project.id} value={project.id}>{project.name}</option>
        ))}
      </select>

      {showDateRange && (
        <>
          <input
            type="date"
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
            value={startDate}
            onChange={handleStartDateChange}
            max={endDate}
          />
          <input
            type="date"
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
            value={endDate}
            onChange={handleEndDateChange}
            min={startDate}
          />
        </>
      )}
    </div>
  )
}
