'use client';

import { useState, useEffect } from 'react';
import { useTeam } from '@/lib/contexts/TeamContext';
import { useTeams } from '@/lib/hooks/useTeams';
import { useProjects } from '@/lib/hooks/useProjects';
import { Header } from '@/components/Header';
import Dashboard from '@/components/Dashboard';

export default function DashboardPage() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const { team, project } = useTeam();
  const { teams, loading: teamsLoading } = useTeams();
  const { projects, loading: projectsLoading } = useProjects(selectedTeam);

  useEffect(() => {
    if (team?.id) {
      setSelectedTeam(team.id);
    }
  }, [team]);

  useEffect(() => {
    if (project?.id) {
      setSelectedProject(project.id);
    }
  }, [project]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Team Selection */}
            <select
              className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
              value={selectedTeam || ''}
              onChange={(e) => {
                setSelectedTeam(e.target.value || null);
                setSelectedProject(null);
              }}
              disabled={teamsLoading}
            >
              <option value="">选择团队</option>
              {teams?.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>

            {/* Project Selection */}
            <select
              className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              disabled={!selectedTeam || projectsLoading}
            >
              <option value="">选择项目</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          {/* Dashboard Component */}
          {selectedTeam && (
            <Dashboard
              teamId={selectedTeam}
              projectId={selectedProject}
            />
          )}
        </div>
      </main>
    </div>
  );
}