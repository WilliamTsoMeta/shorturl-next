import { useTeams } from '@/lib/hooks/useTeams'
import { useProjects } from '@/lib/hooks/useProjects'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"

interface SelectorsProps {
  selectedTeam: string | null
  selectedProject: string | null
  onTeamChange: (teamId: string | null) => void
  onProjectChange: (projectId: string | null) => void
  dateRange?: [Date | null, Date | null]
  onDateRangeChange?: (dateRange: [Date | null, Date | null]) => void
}

const Selectors = ({
  selectedTeam,
  selectedProject,
  onTeamChange,
  onProjectChange,
  dateRange,
  onDateRangeChange
}: SelectorsProps) => {
  const { teams, loading: teamsLoading } = useTeams()
  const { projects, loading: projectsLoading } = useProjects(selectedTeam)
  const [startDate, endDate] = dateRange || [null, null];

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const teamId = e.target.value || null
    onTeamChange(teamId)
    onProjectChange(null)
  }

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = e.target.value || null
    onProjectChange(projectId)
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

      {dateRange && onDateRangeChange && (
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Date Range
          </label>
          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => onDateRangeChange(update)}
            className="block w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            maxDate={new Date()}
          />
        </div>
      )}
    </div>
  )
}

export default Selectors;
