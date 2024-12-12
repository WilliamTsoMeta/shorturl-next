'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Menu, Transition } from '@headlessui/react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, subDays, startOfYear, eachHourOfInterval, eachDayOfInterval, eachMonthOfInterval, parseISO, startOfHour, startOfDay, startOfMonth } from 'date-fns';
import { createClient } from '@/lib/supabase';
import { useTeam } from '@/lib/contexts/TeamContext';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

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

interface Tag {
  id: string;
  name: string;
  type: string;
  attributes: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  parent_tag_id: string | null;
  team_id: string;
  is_shared: boolean;
  schema_version: number;
  is_system: boolean;
}

type FilterOption = {
  id: string;
  type: 'domain' | 'link' | 'tag';
  value: string;
};

interface StatisticsResponse {
  total_clicks: number;
  device: {
    [key: string]: {
      clicks: number;
    };
  };
  browser: {
    [key: string]: {
      clicks: number;
    };
  };
  os: {
    [key: string]: {
      clicks: number;
    };
  };
  referrer: {
    [key: string]: {
      clicks: number;
    };
  };
  hourly_clicks: Array<{
    hour: string;
    clicks: number;
  }>;
  daily_clicks: Array<{
    date: string;
    clicks: number;
  }>;
  monthly_clicks: Array<{
    month: string;
    clicks: number;
  }>;
  user_actions: Array<{
    user_id: string;
    action: string;
    action_time: string;
  }>;
  subpaths: Array<{
    path: string;
    clicks: number;
  }>;
}

const timeRanges = [
  { label: 'Last 24 hours', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 3 months', days: 90 },
  { label: 'Year to Date', days: 0, special: 'yearToDate' },
  { label: 'Last 12 months', days: 365 },
  { label: 'All Time', days: 0, special: 'allTime' }
];

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

const ChartCard = ({ title, children }: ChartCardProps) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <div className="w-full h-64">
      {children}
    </div>
  </div>
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const formatXAxis = (value: string, type: 'hourly' | 'daily' | 'monthly') => {
  switch (type) {
    case 'hourly':
      return value; // Already formatted as HH:00
    case 'daily':
      return format(parseISO(value), 'MM/dd');
    case 'monthly':
      return format(parseISO(value), 'yyyy/MM');
    default:
      return value;
  }
};

const LineChart = ({ data, xKey, yKey, theme, type }: { 
  data: any[], 
  xKey: string, 
  yKey: string, 
  theme: string,
  type: 'hourly' | 'daily' | 'monthly'
}) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
        <XAxis 
          dataKey={xKey} 
          stroke={theme === 'dark' ? '#9CA3AF' : '#4B5563'}
          tick={{ fill: theme === 'dark' ? '#9CA3AF' : '#4B5563' }}
          tickFormatter={(value) => formatXAxis(value, type)}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis 
          stroke={theme === 'dark' ? '#9CA3AF' : '#4B5563'}
          tick={{ fill: theme === 'dark' ? '#9CA3AF' : '#4B5563' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
            color: theme === 'dark' ? '#F3F4F6' : '#1F2937'
          }}
          labelFormatter={(value) => formatXAxis(value, type)}
        />
        <Line 
          type="monotone" 
          dataKey={yKey} 
          stroke="#3B82F6" 
          strokeWidth={2}
          dot={{ fill: '#3B82F6', strokeWidth: 2 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

const PieChart = ({ data, theme }: { data: any[], theme: string }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ 
            backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
            color: theme === 'dark' ? '#F3F4F6' : '#1F2937'
          }}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

export default function Analytics() {
  const { theme } = useTheme();
  const { team } = useTeam();
  const [selectedRange, setSelectedRange] = useState(timeRanges[0]);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([new Date(), new Date()]);
  const [startDate, endDate] = dateRange;
  const [activeFilter, setActiveFilter] = useState<'domain' | 'link' | 'tag'>('link');
  const [resources, setResources] = useState<Resource[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<{
    domain?: FilterOption;
    link?: FilterOption;
    tag?: FilterOption;
  }>({});
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [activeTimeRange, setActiveTimeRange] = useState<'hourly' | 'daily' | 'monthly'>('daily');

  useEffect(() => {
    if (activeFilter === 'link') {
      fetchResources();
    } else if (activeFilter === 'tag') {
      fetchTags();
    }
  }, [activeFilter, team?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shortUrl = params.get('url');
    
    if (shortUrl && resources.length > 0) {
      // Find the resource with matching shortUrl
      const resource = resources.find(r => r.attributes.shortUrl === decodeURIComponent(shortUrl));
      if (resource) {
        // Set the filter to this link
        const filter = {
          id: resource.id,
          type: 'link' as const,
          value: resource.attributes.shortUrl
        };
        setSelectedFilters(prev => ({
          ...prev,
          link: filter
        }));
        // Immediately fetch statistics for this link
        fetchStatistics(filter);
      }
    }
  }, [resources]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/resource/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          resourceTypes: ["shorturl"],
          resourceSortBy: "created_at",
          resourceSortOrder: "DESC",
          pageSize: 100,
          pageNumber: 1,
          isFavorite: null,
          isCreatedByUser: null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch resources');
      }

      const data = await response.json();
      const allResources = data.data.reduce((acc, tag) => {
        return [...acc, ...(tag.resources || [])];
      }, []);
      setResources(allResources);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    if (!team?.id) return;
    
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tags?teamId=${team.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }

      const data = await response.json();
      setTags(data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async (selectedLink?: FilterOption) => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('No access token available');
        return;
      }

      const linkToUse = selectedLink || selectedFilters['link'];
      if (!linkToUse) return;

      // 转换开始时间为 UTC
      const utcStartDate = startDate 
        ? new Date(Date.UTC(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(),
            0, 0, 0, 0
          )).toISOString()
        : new Date(0).toISOString();

      // 转换结束时间为 UTC
      const utcEndDate = endDate
        ? new Date(Date.UTC(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate(),
            23, 59, 59, 999
          )).toISOString()
        : new Date(Date.UTC(
            new Date().getFullYear(),
            new Date().getMonth(),
            new Date().getDate(),
            23, 59, 59, 999
          )).toISOString();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/statistics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          shortUrlId: linkToUse.id,
          url: linkToUse.value,
          startDate: utcStartDate,
          endDate: utcEndDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFilters['link']) {
      fetchStatistics();
    }
  }, [selectedFilters['link'], startDate, endDate]);

  const filterOptions: Record<string, FilterOption[]> = {
    domain: [
      { id: '1', type: 'domain', value: 'upj.to' }
    ],
    link: resources.map(resource => ({
      id: resource.id,
      type: 'link',
      value: resource.attributes.shortUrl
    })),
    tag: tags.map(tag => ({
      id: tag.id,
      type: 'tag',
      value: tag.name
    }))
  };

  const handleOptionSelect = (option: FilterOption, filterType?: 'domain' | 'link' | 'tag') => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev };
      const type = filterType || activeFilter;
      
      // 如果已经选中，则取消选中
      if (prev[type] && prev[type]?.id === option.id) {
        delete newFilters[type];
      } else {
        // 否则更新选中项
        newFilters[type] = option;
      }
      
      return newFilters;
    });
  };

  const handleRangeSelect = (range: typeof timeRanges[0]) => {
    setIsCustomRange(false);
    const end = new Date();
    let start = new Date();

    if (range.special === 'yearToDate') {
      start = startOfYear(end);
    } else if (range.special === 'allTime') {
      start = new Date(2020, 0, 1); // 或者你的项目开始日期
    } else {
      start = subDays(end, range.days);
    }

    setDateRange([start, end]);
    setSelectedRange(range);
  };

  const prepareChartData = () => {
    if (!statistics) return {
      devices: [],
      browsers: [],
      os: [],
      referrers: [],
      hourlyClicks: [],
      dailyClicks: [],
      monthlyClicks: [],
      subpaths: []
    };

    // 准备设备、浏览器、操作系统和来源数据
    const basicData = {
      devices: Object.entries(statistics.device || {}).map(([name, data]) => ({
        name: name === 'null' ? 'Unknown' : name,
        value: data.clicks,
      })),
      browsers: Object.entries(statistics.browser || {}).map(([name, data]) => ({
        name: name === 'null' ? 'Unknown' : name,
        value: data.clicks,
      })),
      os: Object.entries(statistics.os || {}).map(([name, data]) => ({
        name: name === 'null' ? 'Unknown' : name,
        value: data.clicks,
      })),
      referrers: Object.entries(statistics.referrer || {}).map(([name, data]) => ({
        name: name === 'null' ? 'Direct' : name,
        value: data.clicks,
      })),
      subpaths: (statistics.subpaths || []).map(item => ({
        name: item.path === '(empty)' ? 'Root Path' : item.path,
        value: item.clicks,
      })),
    };

    // 处理时间序列数据
    const hourlyData = new Map(
      (statistics.hourly_clicks || []).map(item => [
        startOfHour(parseISO(item.hour)).getTime(),
        item.clicks
      ])
    );

    const dailyData = new Map(
      (statistics.daily_clicks || []).map(item => [
        startOfDay(parseISO(item.date)).getTime(),
        item.clicks
      ])
    );

    const monthlyData = new Map(
      (statistics.monthly_clicks || []).map(item => [
        startOfMonth(parseISO(item.month)).getTime(),
        item.clicks
      ])
    );

    // 获取时间范围
    const now = new Date();
    const hourlyRange = {
      start: subDays(now, 1), // 最近24小时
      end: now
    };

    const dailyRange = {
      start: subDays(now, 30), // 最近30天
      end: now
    };

    const monthlyRange = {
      start: startOfYear(now), // 今年开始
      end: now
    };

    // 生成完整的时间序列
    const hourlyClicks = eachHourOfInterval(hourlyRange).map(hour => ({
      time: format(hour, 'HH:00'),
      timestamp: hour.getTime(),
      clicks: hourlyData.get(hour.getTime()) || 0
    }));

    const dailyClicks = eachDayOfInterval(dailyRange).map(day => ({
      date: format(day, 'yyyy-MM-dd'),
      timestamp: day.getTime(),
      clicks: dailyData.get(day.getTime()) || 0
    }));

    const monthlyClicks = eachMonthOfInterval(monthlyRange).map(month => ({
      month: format(month, 'yyyy-MM'),
      timestamp: month.getTime(),
      clicks: monthlyData.get(month.getTime()) || 0
    }));

    return {
      ...basicData,
      hourlyClicks,
      dailyClicks,
      monthlyClicks,
    };
  };

  const TabButton = ({ isActive, onClick, children }: { isActive: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`px-2 py-1 ${isActive ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400'}`}
    >
      {children}
    </button>
  );

  const Panel = ({ title, tabs, activeTab, onTabChange, metric = 'CLICKS' }: any) => (
    <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-5">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
        <div className="flex gap-4">
          {tabs.map((tab: string) => (
            <TabButton
              key={tab}
              isActive={activeTab === tab}
              onClick={() => onTabChange(tab)}
            >
              {tab}
            </TabButton>
          ))}
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">{metric}</span>
      </div>
      <div className="text-center text-gray-600 dark:text-gray-400 py-10">No data available</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-5">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-5">
            <h1 className="text-2xl font-bold dark:text-white">Analytics</h1>
            <div className="space-x-2">
              <button className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-white">
                Share
              </button>
              <button className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-white">
                Switch to Events
              </button>
            </div>
          </div>

          <div className="flex gap-2 bg-gray-50 dark:bg-gray-700 p-3 rounded-md mb-6">
            <Menu as="div" className="relative">
              <Menu.Button className="inline-flex w-full justify-between gap-x-1.5 rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                {activeFilter === 'domain' ? 'Domain' : activeFilter === 'link' ? 'Link' : 'Tag'}
                <svg className="-mr-1 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </Menu.Button>

              <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <div className="flex flex-col">
                    <div className="px-4 py-2 flex gap-2">
                      <button
                        className={`flex-1 px-3 py-1 rounded-md ${activeFilter === 'domain' ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        onClick={() => setActiveFilter('domain')}
                      >
                        Domain
                      </button>
                      <button
                        className={`flex-1 px-3 py-1 rounded-md ${activeFilter === 'link' ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        onClick={() => setActiveFilter('link')}
                      >
                        Link
                      </button>
                      <button
                        className={`flex-1 px-3 py-1 rounded-md ${activeFilter === 'tag' ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        onClick={() => setActiveFilter('tag')}
                      >
                        Tag
                      </button>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="max-h-[240px] overflow-y-auto">
                    {loading ? (
                      <div className="px-4 py-2 text-gray-500 dark:text-gray-400">
                        Loading...
                      </div>
                    ) : (
                      filterOptions[activeFilter].map((option) => {
                        const isSelected = selectedFilters[activeFilter]?.id === option.id;
                        return (
                          <Menu.Item key={option.id}>
                            {({ active }) => (
                              <button
                                className={`${
                                  active
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                    : 'text-gray-700 dark:text-gray-200'
                                } group flex w-full items-center px-3 py-2 text-sm rounded-md`}
                                onClick={() => handleOptionSelect(option)}
                              >
                                <span className="w-4 h-4 mr-3 text-gray-400">
                                  {isSelected ? '✓' : '⭕'}
                                </span>
                                {option.value}
                              </button>
                            )}
                          </Menu.Item>
                        );
                      })
                    )}
                    {!loading && filterOptions[activeFilter].length === 0 && (
                      <div className="px-4 py-2 text-gray-500 dark:text-gray-400">
                        No results found
                      </div>
                    )}
                  </div>
                </div>
              </Menu.Items>
            </Menu>

            {/* Selected Filters */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(selectedFilters).map(([type, filter]) => (
                <div
                  key={filter.id}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-md text-sm"
                >
                  <span>{type}: {filter.value}</span>
                  <button
                    onClick={() => handleOptionSelect(filter, type as 'domain' | 'link' | 'tag')}
                    className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <Menu as="div" className="relative">
              <Menu.Button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white inline-flex items-center">
                <span>{isCustomRange ? 'Custom Range' : selectedRange.label}</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Menu.Button>

              <Transition
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <Menu.Items className="absolute left-0 mt-2 origin-top-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg focus:outline-none min-w-[800px]">
                  <div className="grid grid-cols-[300px_1fr] gap-4 p-4">
                    <div className="space-y-2 border-r border-gray-200 dark:border-gray-700 pr-4">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white px-4 mb-2">Select Range</h3>
                      {timeRanges.map((range) => (
                        <Menu.Item key={range.label}>
                          {({ active }) => (
                            <button
                              onClick={() => handleRangeSelect(range)}
                              className={`${
                                active
                                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                  : 'text-gray-700 dark:text-gray-200'
                              } group flex w-full items-center px-4 py-2.5 text-sm rounded-md ${
                                selectedRange.label === range.label && !isCustomRange
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                  : ''
                              }`}
                            >
                              {range.label}
                            </button>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                    <div className="flex justify-center">
                      <DatePicker
                        selectsRange={true}
                        startDate={startDate}
                        endDate={endDate}
                        onChange={(update) => {
                          setDateRange(update);
                          if (update[0] && update[1]) {
                            setIsCustomRange(true);
                          }
                        }}
                        monthsShown={2}
                        inline
                        calendarClassName="dark:bg-gray-800 dark:text-white"
                        dayClassName={(date) => 
                          "dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }
                      />
                    </div>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>

            <span className="flex items-center px-2 dark:text-gray-200">
              {startDate && endDate ? (
                <>
                  {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
                </>
              ) : (
                'Select date range'
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {selectedFilters['link'] ? (
              loading ? (
                <div className="col-span-2 flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
                </div>
              ) : statistics ? (
                <>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Total Clicks</h3>
                    <p className="text-4xl font-bold">{statistics.total_clicks}</p>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                      <div className="flex gap-4 mb-4">
                        <button
                          className={`px-3 py-1 rounded-md ${activeTimeRange === 'hourly' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          onClick={() => setActiveTimeRange('hourly')}
                        >
                          Hourly
                        </button>
                        <button
                          className={`px-3 py-1 rounded-md ${activeTimeRange === 'daily' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          onClick={() => setActiveTimeRange('daily')}
                        >
                          Daily
                        </button>
                        <button
                          className={`px-3 py-1 rounded-md ${activeTimeRange === 'monthly' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          onClick={() => setActiveTimeRange('monthly')}
                        >
                          Monthly
                        </button>
                      </div>
                      <div className="h-[300px]">
                        {activeTimeRange === 'hourly' && (
                          <LineChart
                            data={prepareChartData()?.hourlyClicks || []}
                            xKey="time"
                            yKey="clicks"
                            theme={theme}
                            type="hourly"
                          />
                        )}
                        {activeTimeRange === 'daily' && (
                          <LineChart
                            data={prepareChartData()?.dailyClicks || []}
                            xKey="date"
                            yKey="clicks"
                            theme={theme}
                            type="daily"
                          />
                        )}
                        {activeTimeRange === 'monthly' && (
                          <LineChart
                            data={prepareChartData()?.monthlyClicks || []}
                            xKey="month"
                            yKey="clicks"
                            theme={theme}
                            type="monthly"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <ChartCard title="Devices">
                    <PieChart
                      data={prepareChartData()?.devices || []}
                      theme={theme}
                    />
                  </ChartCard>

                  <ChartCard title="Browsers">
                    <PieChart
                      data={prepareChartData()?.browsers || []}
                      theme={theme}
                    />
                  </ChartCard>

                  <ChartCard title="Operating Systems">
                    <PieChart
                      data={prepareChartData()?.os || []}
                      theme={theme}
                    />
                  </ChartCard>

                  <ChartCard title="Referrers">
                    <PieChart
                      data={prepareChartData()?.referrers || []}
                      theme={theme}
                    />
                  </ChartCard>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Subpaths</h3>
                    {prepareChartData()?.subpaths.length === 0 ? (
                      <div className="text-gray-500 dark:text-gray-400">No data available</div>
                    ) : (
                      <div className="space-y-2">
                        {prepareChartData()?.subpaths.map((item, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                          >
                            <span className="text-gray-700 dark:text-gray-200 font-medium">
                              {item.name}
                            </span>
                            <span className="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                              {item.value} clicks
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="col-span-2 text-center text-gray-500 dark:text-gray-400">
                  No data available
                </div>
              )
            ) : (
              <div className="col-span-2 text-center text-gray-500 dark:text-gray-400">
                Please select a link to view analytics
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
