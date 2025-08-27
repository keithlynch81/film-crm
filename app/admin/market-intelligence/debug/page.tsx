'use client'

import { useState } from 'react'
import { Layout } from '@/components/Layout'

const buttonStyle = {
  padding: '8px 16px',
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
  background: '#3b82f6',
  color: '#ffffff',
}

export default function MarketIntelligenceDebugPage() {
  const [debugData, setDebugData] = useState<any>(null)
  const [rssTestData, setRssTestData] = useState<any>(null)
  const [dbTestData, setDbTestData] = useState<any>(null)
  const [tableCheckData, setTableCheckData] = useState<any>(null)
  const [saveTestData, setSaveTestData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [testingRss, setTestingRss] = useState(false)
  const [testingDb, setTestingDb] = useState(false)
  const [checkingTables, setCheckingTables] = useState(false)
  const [testingSave, setTestingSave] = useState(false)

  const runDebug = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/market-intelligence/debug')
      const data = await response.json()
      setDebugData(data)
    } catch (error) {
      console.error('Debug failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const testRssFeeds = async () => {
    setTestingRss(true)
    try {
      const response = await fetch('/api/market-intelligence/test-rss')
      const data = await response.json()
      setRssTestData(data)
    } catch (error) {
      console.error('RSS test failed:', error)
    } finally {
      setTestingRss(false)
    }
  }

  const testDatabase = async () => {
    setTestingDb(true)
    try {
      const response = await fetch('/api/market-intelligence/test-db')
      const data = await response.json()
      setDbTestData(data)
    } catch (error) {
      console.error('Database test failed:', error)
    } finally {
      setTestingDb(false)
    }
  }

  const checkTables = async () => {
    setCheckingTables(true)
    try {
      const response = await fetch('/api/market-intelligence/check-tables')
      const data = await response.json()
      setTableCheckData(data)
    } catch (error) {
      console.error('Table check failed:', error)
    } finally {
      setCheckingTables(false)
    }
  }

  const testSaving = async () => {
    setTestingSave(true)
    try {
      const response = await fetch('/api/market-intelligence/debug-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      setSaveTestData(data)
    } catch (error) {
      console.error('Save test failed:', error)
    } finally {
      setTestingSave(false)
    }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>
            Market Intelligence Debug
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Troubleshoot why contacts aren't being matched to news articles.
          </p>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              onClick={runDebug} 
              disabled={loading}
              style={buttonStyle}
            >
              {loading ? 'Analyzing...' : 'Run Debug Analysis'}
            </button>
            <button 
              onClick={testRssFeeds} 
              disabled={testingRss}
              style={{...buttonStyle, background: '#10b981'}}
            >
              {testingRss ? 'Testing RSS...' : 'Test RSS Feeds'}
            </button>
            <button 
              onClick={testDatabase} 
              disabled={testingDb}
              style={{...buttonStyle, background: '#f59e0b'}}
            >
              {testingDb ? 'Testing DB...' : 'Test Database'}
            </button>
            <button 
              onClick={checkTables} 
              disabled={checkingTables}
              style={{...buttonStyle, background: '#8b5cf6'}}
            >
              {checkingTables ? 'Checking...' : 'Check Tables'}
            </button>
            <button 
              onClick={testSaving} 
              disabled={testingSave}
              style={{...buttonStyle, background: '#dc2626'}}
            >
              {testingSave ? 'Testing...' : 'Test Saving'}
            </button>
          </div>
        </div>

        {/* Save Test Results */}
        {saveTestData && (
          <div style={{ 
            background: saveTestData.success ? '#f0fdf4' : '#fef2f2', 
            borderRadius: '8px', 
            border: saveTestData.success ? '1px solid #bbf7d0' : '1px solid #fecaca', 
            padding: '24px' 
          }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: saveTestData.success ? '#166534' : '#dc2626', 
              margin: '0 0 16px 0' 
            }}>
              RSS Save Test Results
            </h2>
            
            {saveTestData.success ? (
              <div>
                <p style={{ fontSize: '14px', color: '#166534', marginBottom: '12px' }}>
                  ✅ {saveTestData.message}
                </p>
                
                {saveTestData.steps_completed && (
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>
                      Steps Completed:
                    </h4>
                    <ul style={{ fontSize: '13px', color: '#166534', margin: 0, paddingLeft: '16px' }}>
                      {saveTestData.steps_completed.map((step: string, index: number) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div style={{ background: '#dbeafe', padding: '12px', borderRadius: '6px', border: '1px solid #93c5fd' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1d4ed8', margin: '0 0 8px 0' }}>
                    Conclusion:
                  </h4>
                  <p style={{ fontSize: '13px', color: '#1d4ed8', margin: '0 0 8px 0' }}>
                    {saveTestData.conclusion}
                  </p>
                  <p style={{ fontSize: '13px', color: '#1d4ed8', margin: 0 }}>
                    <strong>Recommendation:</strong> {saveTestData.recommendation}
                  </p>
                </div>
                
                {saveTestData.test_article_title && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                    <strong>Test Article:</strong> {saveTestData.test_article_title}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '12px' }}>
                  ❌ Failed at step: {saveTestData.step}
                </p>
                
                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '13px', color: '#7f1d1d', margin: 0 }}>
                    <strong>Error:</strong> {saveTestData.error}
                  </p>
                </div>
                
                {saveTestData.parsed_data && (
                  <details style={{ fontSize: '11px', color: '#6b7280' }}>
                    <summary>Debug Data</summary>
                    <pre style={{ background: '#f9fafb', padding: '8px', borderRadius: '4px', overflow: 'auto', marginTop: '4px' }}>
                      {JSON.stringify(saveTestData, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* Table Check Results */}
        {tableCheckData && (
          <div style={{ 
            background: tableCheckData.diagnosis?.news_tables_working ? '#f0fdf4' : '#fef2f2', 
            borderRadius: '8px', 
            border: tableCheckData.diagnosis?.news_tables_working ? '1px solid #bbf7d0' : '1px solid #fecaca', 
            padding: '24px' 
          }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: tableCheckData.diagnosis?.news_tables_working ? '#166534' : '#dc2626', 
              margin: '0 0 16px 0' 
            }}>
              Table Check Results
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              {tableCheckData.detailed_results?.tests && Object.entries(tableCheckData.detailed_results.tests).map(([table, result]: [string, any]) => (
                <div key={table} style={{
                  padding: '12px',
                  background: '#ffffff',
                  borderRadius: '6px',
                  border: `1px solid ${result.status === 'success' ? '#d1fae5' : '#fecaca'}`
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    {table.replace(/_/g, ' ')}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: result.status === 'success' ? '#166534' : '#dc2626'
                  }}>
                    {result.status === 'success' ? '✅ Found' : '❌ Missing'}
                    {result.rows_found !== undefined && ` (${result.rows_found} rows)`}
                  </div>
                  {result.error && (
                    <div style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '4px' }}>
                      {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {tableCheckData.diagnosis?.possible_issues && tableCheckData.diagnosis.possible_issues.length > 0 && (
              <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '6px', border: '1px solid #fde68a', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', margin: '0 0 8px 0' }}>
                  Possible Issues:
                </h4>
                <ul style={{ fontSize: '13px', color: '#92400e', margin: 0, paddingLeft: '16px' }}>
                  {tableCheckData.diagnosis.possible_issues.map((issue: string, index: number) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {tableCheckData.next_steps && (
              <div style={{ background: '#dbeafe', padding: '12px', borderRadius: '6px', border: '1px solid #93c5fd' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1d4ed8', margin: '0 0 8px 0' }}>
                  Next Steps:
                </h4>
                <ol style={{ fontSize: '13px', color: '#1d4ed8', margin: 0, paddingLeft: '16px' }}>
                  {tableCheckData.next_steps.map((step: string, index: number) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Database Test Results */}
        {dbTestData && (
          <div style={{ 
            background: dbTestData.success ? '#f0fdf4' : '#fef2f2', 
            borderRadius: '8px', 
            border: dbTestData.success ? '1px solid #bbf7d0' : '1px solid #fecaca', 
            padding: '24px' 
          }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: dbTestData.success ? '#166534' : '#dc2626', 
              margin: '0 0 16px 0' 
            }}>
              Database Test Results
            </h2>
            
            {dbTestData.success ? (
              <div>
                <p style={{ fontSize: '14px', color: '#166534', marginBottom: '12px' }}>
                  ✅ {dbTestData.message}
                </p>
                
                {dbTestData.tests && (
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
                    {Object.entries(dbTestData.tests).map(([key, value]) => (
                      <div key={key} style={{ fontSize: '13px', marginBottom: '4px' }}>
                        <strong>{key.replace(/_/g, ' ')}:</strong> {value as string}
                      </div>
                    ))}
                  </div>
                )}
                
                <p style={{ fontSize: '14px', color: '#166534' }}>
                  <strong>Next Step:</strong> {dbTestData.next_step}
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '12px' }}>
                  ❌ {dbTestData.error}
                </p>
                
                {dbTestData.details && (
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
                    <p style={{ fontSize: '13px', color: '#7f1d1d', margin: 0 }}>
                      <strong>Error Details:</strong> {dbTestData.details}
                    </p>
                  </div>
                )}
                
                {dbTestData.fix && (
                  <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                    <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
                      <strong>How to Fix:</strong> {dbTestData.fix}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* RSS Test Results */}
        {rssTestData && (
          <div style={{ background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0c4a6e', margin: '0 0 16px 0' }}>
              RSS Feed Test Results
            </h2>
            
            {rssTestData.results?.map((result: any, index: number) => (
              <div key={index} style={{ 
                marginBottom: '20px',
                padding: '16px',
                background: '#ffffff',
                borderRadius: '6px',
                border: result.success ? '1px solid #d1fae5' : '1px solid #fecaca'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                    {result.feed}
                  </h3>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: result.success ? '#dcfce7' : '#fef2f2',
                    color: result.success ? '#166534' : '#dc2626'
                  }}>
                    {result.success ? '✓ Working' : '✗ Failed'}
                  </span>
                </div>
                
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                  URL: {result.url}
                </p>
                
                {result.success ? (
                  <div>
                    <p style={{ fontSize: '14px', color: '#166534', marginBottom: '12px' }}>
                      Found {result.total_items_found} articles
                    </p>
                    
                    {result.sample_articles && result.sample_articles.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>
                          Sample Articles:
                        </h4>
                        {result.sample_articles.map((article: any, articleIndex: number) => (
                          <div key={articleIndex} style={{ 
                            padding: '8px',
                            background: '#f9fafb',
                            borderRadius: '4px',
                            marginBottom: '6px',
                            border: '1px solid #e5e7eb'
                          }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
                              {article.title}
                            </div>
                            {article.description && (
                              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>
                                {article.description.substring(0, 150)}...
                              </div>
                            )}
                            <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                              {article.pubDate}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '8px' }}>
                      Error: {result.error}
                    </p>
                    {result.content_preview && (
                      <details style={{ fontSize: '11px', color: '#6b7280' }}>
                        <summary>Raw Response Preview</summary>
                        <pre style={{ background: '#f9fafb', padding: '8px', borderRadius: '4px', overflow: 'auto', marginTop: '4px' }}>
                          {result.content_preview}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {debugData && (
          <>
            {/* Summary */}
            <div style={{ background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0c4a6e', margin: '0 0 16px 0' }}>
                Debug Summary
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0ea5e9' }}>
                    {debugData.debug_info?.articles_count || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Articles in DB</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                    {debugData.debug_info?.contacts_count || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Your Contacts</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                    {debugData.debug_info?.companies_count || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Your Companies</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                    {debugData.debug_info?.existing_matches_count || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Existing Matches</div>
                </div>
              </div>
            </div>

            {/* Recent Articles */}
            {debugData.recent_articles && (
              <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
                  Recent Articles in Database
                </h3>
                {debugData.recent_articles.map((article: any, index: number) => (
                  <div key={article.id} style={{ 
                    padding: '12px', 
                    background: '#f9fafb', 
                    borderRadius: '6px', 
                    marginBottom: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '14px', color: '#111827' }}>{article.title}</strong>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ 
                          padding: '2px 6px', 
                          background: '#dbeafe', 
                          color: '#2563eb',
                          borderRadius: '4px',
                          fontSize: '11px',
                          textTransform: 'uppercase'
                        }}>
                          {article.source}
                        </span>
                        <span style={{ 
                          padding: '2px 6px', 
                          background: article.is_processed ? '#dcfce7' : '#fef3c7', 
                          color: article.is_processed ? '#166534' : '#d97706',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          {article.is_processed ? 'Processed' : 'Unprocessed'}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      {article.text_preview}
                    </p>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                      {new Date(article.published_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Your Contacts */}
            {debugData.your_contacts && (
              <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
                  Your Contacts (What We're Searching For)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                  {debugData.your_contacts.map((contact: any, index: number) => (
                    <div key={contact.id} style={{ 
                      padding: '12px', 
                      background: '#f9fafb', 
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                        {contact.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {contact.company}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Matching */}
            {debugData.test_matching && (
              <div style={{ background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#92400e', margin: '0 0 16px 0' }}>
                  Live Matching Test
                </h3>
                <p style={{ fontSize: '14px', color: '#92400e', marginBottom: '12px' }}>
                  Testing most recent article: <strong>{debugData.test_matching.articleTitle}</strong>
                </p>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px', padding: '8px', background: '#ffffff', borderRadius: '4px' }}>
                  Article text: {debugData.test_matching.articleText}
                </div>
                
                {debugData.test_matching.results.map((result: any, index: number) => (
                  <div key={index} style={{ 
                    padding: '12px', 
                    background: '#ffffff', 
                    borderRadius: '6px',
                    marginBottom: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                      {result.contact} ({result.company})
                    </div>
                    
                    <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                      <strong>Search terms:</strong>
                    </div>
                    <ul style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 8px 0', paddingLeft: '16px' }}>
                      <li>Full name: "{result.searchTerms.fullName}"</li>
                      <li>First name: "{result.searchTerms.firstName}"</li>
                      {result.searchTerms.lastName && <li>Last name: "{result.searchTerms.lastName}"</li>}
                      {result.searchTerms.company && <li>Company: "{result.searchTerms.company}"</li>}
                    </ul>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                      <div style={{ 
                        padding: '4px 8px',
                        background: result.tests.fullNameMatch ? '#dcfce7' : '#fef2f2',
                        color: result.tests.fullNameMatch ? '#166534' : '#dc2626',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textAlign: 'center'
                      }}>
                        Full Name: {result.tests.fullNameMatch ? '✓' : '✗'}
                      </div>
                      <div style={{ 
                        padding: '4px 8px',
                        background: result.tests.firstNameMatch ? '#dcfce7' : '#fef2f2',
                        color: result.tests.firstNameMatch ? '#166534' : '#dc2626',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textAlign: 'center'
                      }}>
                        First Name: {result.tests.firstNameMatch ? '✓' : '✗'}
                      </div>
                      <div style={{ 
                        padding: '4px 8px',
                        background: result.tests.lastNameMatch ? '#dcfce7' : '#fef2f2',
                        color: result.tests.lastNameMatch ? '#166534' : '#dc2626',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textAlign: 'center'
                      }}>
                        Last Name: {result.tests.lastNameMatch ? '✓' : '✗'}
                      </div>
                      <div style={{ 
                        padding: '4px 8px',
                        background: result.tests.companyMatch ? '#dcfce7' : '#fef2f2',
                        color: result.tests.companyMatch ? '#166534' : '#dc2626',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textAlign: 'center'
                      }}>
                        Company: {result.tests.companyMatch ? '✓' : '✗'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Existing Matches */}
            {debugData.existing_matches && debugData.existing_matches.length > 0 && (
              <div style={{ background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#166534', margin: '0 0 16px 0' }}>
                  Existing Matches Found
                </h3>
                {debugData.existing_matches.map((match: any, index: number) => (
                  <div key={index} style={{ 
                    padding: '12px', 
                    background: '#ffffff', 
                    borderRadius: '6px',
                    marginBottom: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                      {match.contact}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                      Matched in: {match.article}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                      Matched text: "{match.matched_text}" ({Math.round(match.confidence * 100)}% confidence)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}