'use client'

import { useState } from 'react'
import { Layout } from '@/components/Layout'

const buttonStyle = {
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '500',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontFamily: 'inherit',
  lineHeight: '1',
}

const primaryButtonStyle = {
  ...buttonStyle,
  background: '#3b82f6',
  color: '#ffffff',
}

const disabledButtonStyle = {
  ...buttonStyle,
  background: '#9ca3af',
  color: '#ffffff',
  cursor: 'not-allowed',
}

const secondaryButtonStyle = {
  ...buttonStyle,
  background: '#ffffff',
  color: '#374151',
  border: '1px solid #d1d5db',
}

export default function MarketIntelligenceAdminPage() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const updateMarketIntelligence = async () => {
    setIsUpdating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/market-intelligence/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`)
      }
      
      setLastUpdate(result)
      console.log('Market Intelligence Update Result:', result)
      
    } catch (error: any) {
      console.error('Error updating market intelligence:', error)
      setError(error.message || 'An error occurred while updating market intelligence')
    } finally {
      setIsUpdating(false)
    }
  }

  const clearResults = () => {
    setLastUpdate(null)
    setError(null)
  }

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>
            Market Intelligence Admin
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Manually update industry news from RSS feeds and match to contacts.
          </p>
        </div>

        {/* Main Controls */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
            RSS Feed Update
          </h2>
          
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px 0', lineHeight: '1.5' }}>
            This will fetch the latest articles from Variety, Deadline, and Screen Daily, then automatically match them to your contacts, companies, and projects.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={updateMarketIntelligence}
              disabled={isUpdating}
              style={isUpdating ? disabledButtonStyle : primaryButtonStyle}
            >
              {isUpdating ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeDashoffset="32">
                      <animate attributeName="strokeDashoffset" dur="1s" repeatCount="indefinite" values="32;0" />
                    </circle>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Update Market Intelligence
                </>
              )}
            </button>
            
            {(lastUpdate || error) && (
              <button
                onClick={clearResults}
                style={secondaryButtonStyle}
              >
                Clear Results
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{ background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <svg width="20" height="20" fill="#dc2626" viewBox="0 0 24 24">
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', margin: '0 0 8px 0' }}>
                  Error Updating Market Intelligence
                </h3>
                <p style={{ fontSize: '14px', color: '#7f1d1d', margin: 0, lineHeight: '1.4' }}>
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {lastUpdate && (
          <div style={{ background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <svg width="24" height="24" fill="#0ea5e9" viewBox="0 0 24 24">
                <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0c4a6e', margin: 0 }}>
                Update Complete!
              </h3>
            </div>
            
            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0ea5e9' }}>
                  {lastUpdate.summary?.articles_found || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Articles Found
                </div>
              </div>
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                  {lastUpdate.summary?.articles_saved || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  New Articles
                </div>
              </div>
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                  {lastUpdate.summary?.contact_matches || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Contact Matches
                </div>
              </div>
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                  {lastUpdate.summary?.company_matches || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Company Matches
                </div>
              </div>
            </div>
            
            {/* Feed Breakdown */}
            {lastUpdate.results?.rss_parsing?.results && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0c4a6e', margin: '0 0 12px 0' }}>
                  RSS Feed Breakdown:
                </h4>
                <div style={{ background: '#ffffff', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1px', background: '#e5e7eb' }}>
                    {/* Header */}
                    <div style={{ padding: '8px 12px', background: '#f3f4f6', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>
                      Source
                    </div>
                    <div style={{ padding: '8px 12px', background: '#f3f4f6', fontSize: '12px', fontWeight: '500', color: '#6b7280', textAlign: 'center' }}>
                      Found
                    </div>
                    <div style={{ padding: '8px 12px', background: '#f3f4f6', fontSize: '12px', fontWeight: '500', color: '#6b7280', textAlign: 'center' }}>
                      New
                    </div>
                    <div style={{ padding: '8px 12px', background: '#f3f4f6', fontSize: '12px', fontWeight: '500', color: '#6b7280', textAlign: 'center' }}>
                      Skipped
                    </div>
                    
                    {/* Data Rows */}
                    {lastUpdate.results.rss_parsing.results.map((feed: any, index: number) => (
                      <>
                        <div key={`${index}-feed`} style={{ padding: '8px 12px', background: '#ffffff', fontSize: '14px', color: '#111827' }}>
                          {feed.feed}
                        </div>
                        <div key={`${index}-found`} style={{ padding: '8px 12px', background: '#ffffff', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
                          {feed.articlesFound}
                        </div>
                        <div key={`${index}-saved`} style={{ padding: '8px 12px', background: '#ffffff', fontSize: '14px', color: '#10b981', textAlign: 'center', fontWeight: feed.saved > 0 ? '600' : 'normal' }}>
                          {feed.saved}
                        </div>
                        <div key={`${index}-skipped`} style={{ padding: '8px 12px', background: '#ffffff', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
                          {feed.skipped}
                        </div>
                      </>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Timestamp */}
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
              Last updated: {new Date(lastUpdate.timestamp).toLocaleString('en-GB')}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div style={{ background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <svg width="20" height="20" fill="#f59e0b" viewBox="0 0 24 24">
              <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', margin: '0 0 8px 0' }}>
                How to View Results
              </h4>
              <ol style={{ fontSize: '14px', color: '#92400e', margin: 0, paddingLeft: '16px', lineHeight: '1.5' }}>
                <li>After running an update, go to any contact detail page</li>
                <li>Look for the "Market Intelligence" section</li>
                <li>You'll see industry news articles mentioning that contact</li>
                <li>Articles are matched by name, company, or project mentions</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
            Quick Links
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a href="/contacts" style={{ ...secondaryButtonStyle, textDecoration: 'none' }}>
              View Contacts
            </a>
            <a href="/projects" style={{ ...secondaryButtonStyle, textDecoration: 'none' }}>
              View Projects
            </a>
            <a href="/api/market-intelligence/update" target="_blank" style={{ ...secondaryButtonStyle, textDecoration: 'none' }}>
              API Docs
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  )
}