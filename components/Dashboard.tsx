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

export default function Dashboard({ teamId, projectId }: DashboardProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(timeRanges[1]); // Default to last 7 days
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [dashboardData, setDashboardData] = useState<EventData | null>(null);

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

      // Add date range parameters
      if (selectedRange.value === 'custom' && customDateRange[0] && customDateRange[1]) {
        requestBody.startDate = customDateRange[0].toISOString();
        requestBody.endDate = customDateRange[1].toISOString();
      } else if (selectedRange.value !== 'custom') {
        const { startDate, endDate } = getDateRange(selectedRange.value);
        requestBody.startDate = startDate.toISOString();
        requestBody.endDate = endDate.toISOString();
      }

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

  useEffect(() => {
    if (selectedRange.value === 'custom') {
      if (customDateRange[0] && customDateRange[1]) {
        fetchDashboardData();
      }
    } else {
      fetchDashboardData();
    }
  }, [selectedRange, customDateRange]);

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
        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4">
          <Menu as="div" className="relative">
            <Menu.Button className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700">
              {selectedRange.label}
            </Menu.Button>
            <Transition
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute left-0 z-10 mt-2 w-56 origin-top-left rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  {timeRanges.map((range) => (
                    <Menu.Item key={range.value}>
                      {({ active }) => (
                        <button
                          onClick={() => setSelectedRange(range)}
                          className={`${
                            active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          } block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200`}
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

          {selectedRange.value === 'custom' && (
            <DatePicker
              selectsRange={true}
              startDate={customDateRange[0]}
              endDate={customDateRange[1]}
              onChange={(update: [Date | null, Date | null]) => {
                setCustomDateRange(update);
              }}
              className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          )}
        </div>

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

        {/* Top Links Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Top Links
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Link
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Clicks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Conversion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : dashboardData?.events ? (
                  // Group events by shortUrl and get unique links
                  Array.from(new Set(dashboardData.events.map(event => event.resource.attributes.shortUrl)))
                    .map(shortUrl => {
                      const event = dashboardData.events.find(e => e.resource.attributes.shortUrl === shortUrl);
                      if (!event) return null;
                      return {
                        title: event.resource.attributes.title,
                        shortUrl: shortUrl,
                        clicks: getLinkClicks(dashboardData.events, shortUrl),
                        conversionRate: 0 // You can calculate this if needed
                      };
                    })
                    .filter(Boolean)
                    .sort((a, b) => (b?.clicks || 0) - (a?.clicks || 0))
                    .slice(0, 5)
                    .map((link, index) => (
                      <tr key={link?.shortUrl}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {link?.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {link?.clicks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {link?.conversionRate}%
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center py-4">
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
