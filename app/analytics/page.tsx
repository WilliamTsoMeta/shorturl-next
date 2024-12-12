'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Menu, Transition } from '@headlessui/react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, subDays, startOfYear } from 'date-fns';
import { createClient } from '@/lib/supabase';
import { useTeam } from '@/lib/contexts/TeamContext';

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

const timeRanges = [
  { label: 'Last 24 hours', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 3 months', days: 90 },
  { label: 'Year to Date', days: 0, special: 'yearToDate' },
  { label: 'Last 12 months', days: 365 },
  { label: 'All Time', days: 0, special: 'allTime' }
];

export default function Analytics() {
  const { theme } = useTheme();
  const { team } = useTeam();
  const [selectedRange, setSelectedRange] = useState(timeRanges[0]);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([new Date(), new Date()]);
  const [startDate, endDate] = dateRange;
  const [activeFilter, setActiveFilter] = useState<'domain' | 'link' | 'tag'>('domain');
  const [searchTerm, setSearchTerm] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState({
    links: 'Short Links',
    location: 'Countries',
    devices: 'Devices',
    referrers: 'Referrers'
  });

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

  useEffect(() => {
    if (activeFilter === 'link') {
      fetchResources();
    } else if (activeFilter === 'tag') {
      fetchTags();
    }
  }, [activeFilter, team?.id]);

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

  const handleOptionSelect = (option: FilterOption) => {
    console.log('Selected:', option);
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
              <Menu.Button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white inline-flex items-center">
                <span>Filter</span>
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
                <Menu.Items className="absolute left-0 mt-2 w-[280px] origin-top-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg focus:outline-none">
                  <div className="p-2">
                    {/* Filter Type Tabs */}
                    <div className="flex gap-1 mb-2 border-b border-gray-200 dark:border-gray-700">
                      {(['domain', 'link', 'tag'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setActiveFilter(type);
                            setSearchTerm('');
                          }}
                          className={`px-3 py-2 text-sm rounded-t-md ${
                            activeFilter === type
                              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative mb-2">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={`Search ${activeFilter}...`}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>

                    {/* Options List */}
                    <div className="max-h-[240px] overflow-y-auto">
                      {loading ? (
                        <div className="px-4 py-2 text-gray-500 dark:text-gray-400">
                          Loading...
                        </div>
                      ) : (
                        filterOptions[activeFilter].filter(option =>
                          option.value.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map((option) => (
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
                                <span className="w-4 h-4 mr-3 text-gray-400">⭕</span>
                                {option.value}
                              </button>
                            )}
                          </Menu.Item>
                        ))
                      )}
                      {!loading && filterOptions[activeFilter].filter(option =>
                        option.value.toLowerCase().includes(searchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="px-4 py-2 text-gray-500 dark:text-gray-400">
                          No results found
                        </div>
                      )}
                    </div>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>

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

          <div className="mb-8">
            <h2 className="text-4xl font-bold mb-1 dark:text-white">0</h2>
            <p className="text-gray-600 dark:text-gray-400">Clicks</p>
          </div>

          <div className="h-[300px] bg-gray-50 dark:bg-gray-800 rounded-lg mb-8 border border-gray-200 dark:border-gray-700">
            {/* Chart component would go here */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Panel
              title="Links"
              tabs={['Short Links', 'Destination URLs']}
              activeTab={activeTab.links}
              onTabChange={(tab: string) => setActiveTab({ ...activeTab, links: tab })}
            />

            <Panel
              title="Location"
              tabs={['Countries', 'Cities', 'Regions']}
              activeTab={activeTab.location}
              onTabChange={(tab: string) => setActiveTab({ ...activeTab, location: tab })}
            />

            <Panel
              title="Devices"
              tabs={['Devices', 'Browsers', 'OS']}
              activeTab={activeTab.devices}
              onTabChange={(tab: string) => setActiveTab({ ...activeTab, devices: tab })}
            />

            <Panel
              title="Referrers"
              tabs={['Referrers', 'Referrer URLs']}
              activeTab={activeTab.referrers}
              onTabChange={(tab: string) => setActiveTab({ ...activeTab, referrers: tab })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
