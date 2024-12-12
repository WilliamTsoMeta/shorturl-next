'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Menu, Transition } from '@headlessui/react';
import { format, subDays, startOfYear } from 'date-fns';

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
  const [selectedRange, setSelectedRange] = useState(timeRanges[0]);
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = subDays(end, 1);
    return { start, end };
  });

  const handleRangeSelect = (range: typeof timeRanges[0]) => {
    const end = new Date();
    let start = new Date();

    if (range.special === 'yearToDate') {
      start = startOfYear(end);
    } else if (range.special === 'allTime') {
      start = new Date(2020, 0, 1); // 或者你的项目开始日期
    } else {
      start = subDays(end, range.days);
    }

    setDateRange({ start, end });
    setSelectedRange(range);
  };

  const [activeTab, setActiveTab] = useState({
    links: 'Short Links',
    location: 'Countries',
    devices: 'Devices',
    referrers: 'Referrers'
  });

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
            <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white">
              Filter
            </button>
            
            <Menu as="div" className="relative">
              <Menu.Button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white inline-flex items-center">
                <span>{selectedRange.label}</span>
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
                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg focus:outline-none">
                  <div className="py-1">
                    {timeRanges.map((range) => (
                      <Menu.Item key={range.label}>
                        {({ active }) => (
                          <button
                            onClick={() => handleRangeSelect(range)}
                            className={`${
                              active
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                : 'text-gray-700 dark:text-gray-200'
                            } group flex w-full items-center px-4 py-2 text-sm`}
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

            <span className="flex items-center px-2 dark:text-gray-200">
              {format(dateRange.start, 'MMM dd, yyyy')} - {format(dateRange.end, 'MMM dd, yyyy')}
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
