'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Menu, Transition } from '@headlessui/react';
import DatePicker from 'react-datepicker';
import { createClient } from '@/lib/supabase';
import { subDays, startOfDay, startOfYear } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useTeams } from '@/lib/hooks/useTeams';
import { useProjects } from '@/lib/hooks/useProjects';
import Header from '@/components/Header';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: number;
  loading?: boolean;
}

const DashboardCard = ({ title, value, description, trend, loading }: DashboardCardProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
      <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      {loading ? (
        <div className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded mt-2"></div>
      ) : (
        <>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">{value}</p>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          )}
          {trend !== undefined && (
            <div className={`flex items-center mt-2 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              <span className="text-sm font-medium">{trend}%</span>
              <svg
                className={`w-4 h-4 ml-1 ${trend >= 0 ? 'rotate-0' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

const ChartCard = ({ title, children }: ChartCardProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  );
};

interface DashboardProps {
  teamId: string | null;
  projectId: string | null;
  data?: EventData | null;
  isLoading?: boolean;
  selectedRange: typeof timeRanges[0];
  customDateRange: [Date | null, Date | null];
}

interface Statistics {
  total_clicks: number;
  device: Record<string, { clicks: number }>;
  browser: Record<string, { clicks: number }>;
  os: Record<string, { clicks: number }>;
  referrer: Record<string, { clicks: number }>;
  hourly_clicks: Array<{ hour: string; clicks: number }>;
  daily_clicks: Array<{ date: string; clicks: number }>;
  monthly_clicks: Array<{ month: string; clicks: number }>;
}

interface EventData {
  events: Array<{
    resource: {
      attributes: {
        title: string;
        shortUrl: string;
        originalUrl: string;
        click_count: number;
      };
    };
    url: string;
    event: string;
    timestamp: string;
    properties: string;
  }>;
  statistics: Statistics;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const timeRanges = [
  { label: 'Today', value: 'today', days: 1 },
  { label: 'Last 7 days', value: 'last_7_days', days: 7 },
  { label: 'Last 30 days', value: 'last_30_days', days: 30 },
  { label: 'This year', value: 'this_year', days: 365 },
  { label: 'Custom', value: 'custom', days: 0 },
];

const getDateRange = (rangeValue: string) => {
  const now = new Date();
  let startDate = new Date();
  
  switch (rangeValue) {
    case 'today':
      startDate = startOfDay(now);
      break;
    case 'last_7_days':
      startDate = subDays(now, 7);
      break;
    case 'last_30_days':
      startDate = subDays(now, 30);
      break;
    case 'this_year':
      startDate = startOfYear(now);
      break;
    default:
      startDate = subDays(now, 7); // Default to last 7 days
  }
  
  return {
    startDate,
    endDate: now
  };
};

const formatDataForPieChart = (data: Record<string, { clicks: number }>) => {
  return Object.entries(data).map(([name, value]) => ({
    name: name === 'null' ? 'Direct' : name,
    value: value.clicks
  }));
};

export default function Dashboard({ 
  teamId, 
  projectId, 
  data, 
  isLoading,
  selectedRange,
  customDateRange 
}: DashboardProps) {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(isLoading ?? true)
  const [dashboardData, setDashboardData] = useState<EventData | null>(data ?? null)

  useEffect(() => {
    setLoading(isLoading ?? true)
  }, [isLoading])

  useEffect(() => {
    if (data) {
      setDashboardData(data)
    }
  }, [data])

  useEffect(() => {
    if (selectedRange.value === 'custom') {
      if (customDateRange[0] && customDateRange[1]) {
        fetchDashboardData()
      }
    } else {
      fetchDashboardData()
    }
  }, [selectedRange, customDateRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token found');
      }

      let endpoint = `${process.env.NEXT_PUBLIC_API_URL}/statistics/batch-events`;
      
      // Prepare request body
      const requestBody: any = {};
      if (teamId) {
        requestBody.teamId = teamId;
      }
      if (projectId) {
        requestBody.projectId = projectId;
      }

      // Add date range to request
      const dateRange = selectedRange.value === 'custom'
        ? { startDate: customDateRange[0], endDate: customDateRange[1] }
        : getDateRange(selectedRange.value);
      
      requestBody.startDate = dateRange.startDate?.toISOString();
      requestBody.endDate = dateRange.endDate?.toISOString();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      console.log('Dashboard API Response:', data);
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDashboardData();
  }, [teamId, projectId]);

  // Helper function to get total clicks for a link
  const getLinkClicks = (events: EventData['events'], shortUrl: string) => {
    return events.filter(event => event.url.startsWith(shortUrl)).length;
  };

  // Helper function to calculate average daily clicks
  const calculateAverageDailyClicks = (statistics: Statistics | undefined) => {
    if (!statistics?.daily_clicks?.length) {
      return 0;
    }
    const totalClicks = statistics.daily_clicks.reduce((sum, day) => sum + day.clicks, 0);
    return Math.round(totalClicks / statistics.daily_clicks.length);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="Total Clicks"
            value={dashboardData?.statistics?.total_clicks ?? 0}
            loading={loading}
          />
          <DashboardCard
            title="Unique Links"
            value={dashboardData?.events?.length ?? 0}
            loading={loading}
          />
          <DashboardCard
            title="Average Daily Clicks"
            value={calculateAverageDailyClicks(dashboardData?.statistics)}
            loading={loading}
          />
          <DashboardCard
            title="Click Growth"
            value={`${dashboardData?.statistics?.total_clicks ?? 0}%`}
            trend={dashboardData?.statistics?.total_clicks ?? 0}
            loading={loading}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Click Trends">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardData?.statistics?.hourly_clicks ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke={theme === 'dark' ? '#8884d8' : '#82ca9d'}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Traffic Sources">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData?.statistics ? formatDataForPieChart(dashboardData.statistics.referrer) : []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  >
                    {dashboardData?.statistics && formatDataForPieChart(dashboardData.statistics.referrer).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Recent Events */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Events</h3>
          <div className="space-y-4">
            {dashboardData?.events.map((event, index) => {
              const properties = JSON.parse(event.properties);
              return (
                <div
                  key={index}
                  className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    <img
                      src={event.resource.attributes.icon || '/default-icon.png'}
                      alt="Website Icon"
                      className="w-10 h-10 rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {event.resource.attributes.title}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded text-sm font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        {event.url}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100">
                        {properties.$browser}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100">
                        {properties.$os}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100">
                        {properties.$device || 'Unknown Device'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
