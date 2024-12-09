'use client'

import { useState } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function LinkList() {
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [selectedTab, setSelectedTab] = useState('全部')

  const tabs = ['全部', '我的最爱', '我建立的', '設計']
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          {/* Top Navigation */}
          <div className="flex items-center justify-between py-2 border-b dark:border-gray-800">
            <nav className="flex space-x-4">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedTab === tab
                      ? 'bg-gray-900 text-white dark:bg-gray-700'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
            <ThemeToggle />
          </div>

          {/* Bottom Toolbar */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">最常使用</span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">展示</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">20 / 20</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4z" />
                  </svg>
                </button>
                <button>
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-4">
          {/* Example Link Item */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">24</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Q3_YTBC</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">3 分鐘前</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
