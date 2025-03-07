'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

import { createClient } from '@/lib/supabase';
import { subDays, startOfDay, startOfYear } from 'date-fns';

import { useTranslations } from 'next-intl';
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
  dateRange: [Date | null, Date | null];
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
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

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
  dateRange
}: DashboardProps) {
  const { theme } = useTheme();
  const t = useTranslations();
  const [loading, setLoading] = useState(isLoading ?? true)
  const [dashboardData, setDashboardData] = useState<EventData | null>(data ?? null)
  const [recentLinks, setRecentLinks] = useState<Resource[]>([]);

  useEffect(() => {
    setLoading(isLoading ?? true)
  }, [isLoading])

  useEffect(() => {
    if (data) {
      setDashboardData(data)
    }
  }, [data])

  useEffect(() => {
    fetchRecentLinks();
  }, []);


  const fetchRecentLinks = async () => {
    try {
      const supabase = createClient();
      const session = await supabase.auth.getSession();

      if (!session.data.session?.access_token) {
        throw new Error('No authentication token found');
      }

      const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/resource/list`;
      
      // Get date range for last 7 days
      const endDate = new Date();
      const startDate = subDays(endDate, 7);

      const requestBody: any = {
        resourceTypes: ["shorturl"],
        resourceSortBy: "created_at",
        resourceSortOrder: "DESC",
        groupByTag: false,
        pageSize: 10,
        pageNumber: 1,
        created_at_start: startDate.toISOString(),
        created_at_end: endDate.toISOString(),
      };

      if (teamId) {
        requestBody.teamId = teamId;
      }
      if (projectId) {
        requestBody.projectId = projectId;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recent links');
      }

      const data = await response.json();
      const resources = data.data[0].resources || [];
      setRecentLinks(resources);
    } catch (error) {
      console.error('Error fetching recent links:', error);
    }
  };

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
            title={t('analytics.totalClicks')}
            value={dashboardData?.statistics?.total_clicks ?? 0}
            loading={loading}
          />
          <DashboardCard
            title={t('analytics.uniqueLinks')}
            value={dashboardData?.events?.length ?? 0}
            loading={loading}
          />
          <DashboardCard
            title={t('analytics.averageDailyClicks')}
            value={calculateAverageDailyClicks(dashboardData?.statistics)}
            loading={loading}
          />
          <DashboardCard
            title={t('analytics.clickGrowth')}
            value={`${dashboardData?.statistics?.total_clicks ?? 0}%`}
            trend={dashboardData?.statistics?.total_clicks ?? 0}
            loading={loading}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title={t('analytics.clickTrends')}>
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

          <ChartCard title={t('analytics.trafficSources')}>
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

        {/* Recent Events and Links Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Events */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('analytics.recentEvents')}
            </h3>
            <div className="h-[500px] overflow-y-auto pr-2 space-y-4">
              {dashboardData?.events.map((event, index) => {
                const properties = JSON.parse(event.properties);
                const additionalData = properties.additional_data;
                
                return (
                  <div
                    key={index}
                    className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {event.resource.attributes.title}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="inline-flex items-center px-3 py-1 rounded text-sm font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                          {event.url}
                        </span>
                        {additionalData && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                            {t('analytics.channel')}: {additionalData}
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100">
                          {properties.$browser}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100">
                          {properties.$os}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100">
                          {properties.$device || t('analytics.unknownDevice')}
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

          {/* Recent Links */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('analytics.recentLinks', { days: 7 })}
            </h3>
            <div className="h-[500px] overflow-y-auto pr-2 space-y-4">
              {recentLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {link.attributes.title}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded text-sm font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        {link.attributes.shortUrl}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100">
                        {t('analytics.clickCount', { count: link.attributes.click_count })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('analytics.createdAt')}: {new Date(link.attributes.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
