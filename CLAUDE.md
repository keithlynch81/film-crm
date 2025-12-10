# Film CRM - Project Context and Status

## Project Overview
A complete Next.js 14 + Supabase Film CRM application for managing film projects, contacts, submissions, and workspace collaboration. Built with TypeScript, App Router, and Row Level Security (RLS).

## Tech Stack
- **Frontend**: Next.js 15.5.7 (App Router), TypeScript, React
- **Backend**: Supabase (PostgreSQL with RLS)
- **Styling**: Inline CSS (blue pill design system)
- **Authentication**: Supabase Auth with email confirmation
- **Architecture**: Multi-workspace with role-based access (owner/admin/member)

## Current Status - CHROME EXTENSION COMPLETE ✨

### Core Features Working:
- ✅ **Projects Management**: Create, edit, view, delete projects with mediums, genres, budget ranges, pinning
- ✅ **Contacts Management**: Full CRUD for contacts with company associations
- ✅ **Submissions Tracking**: Create and edit submissions linked to projects and contacts
- ✅ **Schedule Management**: Meeting and event scheduling with links and talking points
- ✅ **Tasks Management**: Full CRUD with priority-based organization and interactive filtering
- ✅ **Links Management**: Save URLs with tags, associate with multiple projects, workspace-level organization
- ✅ **Chrome Extension**: Fiink browser extension for quick link saving with workspace selection and metadata fetching
- ✅ **Multi-Workspace System**: Users can belong to multiple workspaces with different roles
- ✅ **Workspace Invitations**: Shareable invite links with email confirmation flow
- ✅ **Authentication**: Complete signup/login flow with email verification
- ✅ **CSV Import/Export**: Full CSV functionality for Projects and Contacts with proper formatting
- ✅ **Analytics Dashboard**: Comprehensive analytics with CSS-only charts and data visualization
- ✅ **Talking Points System**: Bidirectional talking points for meeting preparation
- ✅ **Advanced Filtering**: Tag-based filtering with pill buttons on Projects page
- ✅ **Market Intelligence**: RSS parsing, article matching, contact integration (100% complete)
- ✅ **Responsive Design**: Mobile-optimized layouts with improved desktop/mobile UX
- ✅ **Project Attachments**: Production company, producer, cast, sales agent, financier, distributor tracking

### Recently Completed: Project Reorganization ✅
1. **Dedicated Subfolder** - Moved entire Film CRM app from `/home/keith/` to `/home/keith/film-crm/`
2. **Git History Preserved** - Moved `.git` directory first, maintaining complete commit history
3. **Clean Separation** - Linux home directory files remain in `/home/keith/` (bash configs, credentials, etc.)
4. **Independent Projects** - `desk-flow/` project remains separate at `/home/keith/desk-flow/`
5. **Updated .gitignore** - Removed `desk-flow/` reference (no longer in repo scope)
6. **GitHub Structure Unchanged** - Repository `keithlynch81/film-crm` still has files at root level
7. **No Vercel Changes Needed** - Root Directory setting remains blank (files still at repo root)
8. **Cleaner Development** - Film CRM now in dedicated directory separate from Linux system files

### Previous Session: Critical Security Update - Next.js 15 Upgrade ✅
1. **CVE-2025-55182 Patched** - Upgraded Next.js 14.0.4 → 15.5.7 to fix critical RCE vulnerability
2. **Vercel Security Alert** - Responded to Vercel blocking vulnerable deployments with public exploits
3. **Suspense Boundaries** - Wrapped useSearchParams() in <Suspense> for login and extension-callback pages
4. **TypeScript Configuration** - Excluded desk-flow/** subdirectory from compilation to prevent conflicts
5. **Webpack Configuration** - Updated next.config.js to ignore desk-flow in watch options
6. **Build Verification** - All 38 routes compiled successfully with zero vulnerabilities
7. **Production Deployment** - Committed (b6ecd72) and pushed to GitHub, triggering Vercel auto-deployment
8. **Zero Vulnerabilities** - npm audit shows 0 vulnerabilities after security patches applied

### Previous Session: Industry Page - Mandate Markdown Formatting ✅
1. **ReactMarkdown Integration** - Installed and integrated react-markdown for rich text rendering
2. **Bold & Italic Support** - `**bold text**` and `*italic text*` markdown syntax now renders properly
3. **Bullet Points** - Markdown lists with `-` or `*` render as proper bullet points
4. **Reduced Line Spacing** - Custom CSS with lineHeight: '1.4' and tight margins for compact display
5. **Helper Text in Form** - Added guidance: "Use markdown: **bold**, *italic*, bullet points with - or *"
6. **Monospace Textarea** - Form input uses monospace font for better markdown visibility while typing
7. **Custom Styling** - CSS overrides for `<p>`, `<ul>`, `<li>`, `<strong>`, `<em>` elements
8. **Preserved Formatting** - Key Traits section now displays exactly as formatted in source document

### Previous Session: Industry Page - Mandate Visibility Fix ✅
1. **Global Mandate Visibility** - All users can now see mandates tab and all posted mandates (was admin-only)
2. **Admin-Only Actions** - Only keith@arecibomedia.com sees "+ Add Mandate" button
3. **Admin-Only Edit/Delete** - Edit and Delete IconButtons wrapped in `{isAdmin && ...}` conditional
4. **Removed Tab Conditional** - Changed `{isAdmin && <Tab>}` to `<Tab>` for universal tab access
5. **Removed TabPanel Conditional** - Changed `{isAdmin && <TabPanel>}` to `<TabPanel>` for content visibility
6. **Cross-Workspace Access** - Mandates visible to all users in all workspaces (no RLS filtering)
7. **Permission Check** - `isAdmin = user.email === 'keith@arecibomedia.com'` controls button visibility
8. **Clean UI** - Non-admin users see read-only mandate cards without action buttons

### Previous Session: Industry Page - Expandable Article Lists ✅
1. **Clickable Expand Button** - "+X more articles" now clickable (was static black text)
2. **Per-Term Expansion** - Each tracked term (Netflix, David Zaslav, etc.) expands independently
3. **Set-Based State** - `expandedTerms: Set<string>` tracks which terms are expanded
4. **Show 5 by Default** - First 5 articles visible, rest hidden until expanded
5. **Chakra Button Component** - Replaced Text with Button (ghost variant, blue.600, hover effect)
6. **Toggle Logic** - Click expands to show all articles, click again collapses back to 5
7. **Dynamic Text** - Button shows "+X more articles" when collapsed, "Show less" when expanded
8. **Proper Scope** - Fixed on Industry page's Track tab (app/industry/page.tsx:812, 836-860)

### Previous Session: Links Page Collapsible Form ✅
1. **Collapsible Add Form** - "Add New Link" section now collapses/expands with click (collapsed by default)
2. **Visual Indicator** - Up/down arrow shows current state (▼ when collapsed, ▲ when expanded)
3. **Consistent Pattern** - Matches existing "Search & Filters" collapsible behavior on same page
4. **State Management** - `showAddForm` state with `useState(false)` for default collapsed state
5. **Click Handler** - `onClick={() => setShowAddForm(!showAddForm)}` toggles visibility
6. **Conditional Rendering** - Form fields wrapped in `{showAddForm && (...)}` for show/hide
7. **Clean Default View** - Page loads with form hidden, reducing visual clutter
8. **Easy Access** - Single click expands full form with all fields (tags, projects, genres)

### Previous Session: Links Page Quick Add Form Restructure ✅
1. **Enhanced Tag Selection** - Added pill buttons for selecting existing workspace tags (purple colorScheme)
2. **Multi-Project Association** - Changed from single dropdown to multi-select checkboxes (matches edit modal UX)
3. **Improved Layout** - Vertical stack layout with clear sections: URL → Tags → New Tags → Projects → Genres
4. **Combined Tag System** - Users can both select existing tags AND type new ones, automatically combined without duplicates
5. **Selection Indicators** - Count displays show "Tags (2 selected)", "Projects (3 selected)", "Genres (1 selected)"
6. **Scrollable Project List** - maxH="200px" with overflowY="auto" for workspaces with many projects
7. **State Management** - New `quickSelectedTags` and `quickProjectIds` (array) state variables
8. **Toggle Functions** - Added `toggleQuickTag()` and `toggleQuickProject()` for pill/checkbox interactions
9. **Conditional Rendering** - Tag selection only appears if user has previously created tags
10. **Consistent UX** - Quick Add form now matches Edit modal's multi-select patterns

### Previous Session: Chrome Extension (Fiink) ✅
1. **Authentication Flow** - Fixed Supabase URL and API key mismatches between old and new projects
2. **PostMessage Integration** - Secure cross-window communication for auth tokens from web app to extension
3. **Workspace Selection** - Dropdown to select workspace before saving links
4. **Simplified UI Flow** - Two-step process: workspace selection → click "Save Link" → detailed form appears
5. **Metadata Fetching** - Proper Open Graph title extraction for YouTube and other modern sites
6. **Tab Tracking** - Automatic URL updates when user switches browser tabs (Chrome tabs API)
7. **Extension Branding** - Renamed from "Film CRM - Link Saver" to "Fiink"
8. **Complete CRUD** - Full link creation with tags, projects, genres, and metadata
9. **Auto-suggest Tags** - Tag autocomplete based on existing workspace tags
10. **Error Handling** - Graceful fallbacks for metadata fetch failures

### Previous Session: Industry Page Cross-Workspace Fixes ✅
1. **Market Intelligence Tab Fixed** - Articles now display correctly across all workspaces
2. **Mandates Global Access** - Mandates now visible in all workspaces (no workspace filtering)
3. **Column Name Fix** - Changed `article_id` to `news_article_id` in Market Intelligence queries
4. **RLS Policy Updates** - Fixed mandates policies to allow global read access for all authenticated users
5. **Database Query Optimization** - Proper foreign key hints for news article joins
6. **Deployment Success** - All fixes deployed to Vercel production environment
7. **Cross-Workspace Testing** - Verified functionality in both "The Lynch Brothers" and "Extra Workspace"
8. **HTML Entity Cleanup** - All 201 existing articles cleaned of HTML entities (&#8216;, &#039;, etc.)

### Previous Session: Links Management System - Initial Build ✅
1. **Database Schema** - Full `links` and `project_links` tables with RLS policies and GIN indexes
2. **Main Links Page** - Table view with URL, title, tags, associated projects, and date added
3. **Quick-Add Form** - Fast URL entry with optional tags and project association (now enhanced with multi-select)
4. **Edit Modal** - Full link details with multi-project checkbox selection
5. **Independent Tag System** - User-created tags separate from project tags with filter buttons
6. **Project Integration** - Collapsible Links section on project detail pages
7. **Many-to-Many Relationships** - Links can be associated with multiple projects via junction table
8. **Workspace Isolation** - Proper RLS policies for workspace-level link organization
9. **Mobile Navigation** - Links tab visible on mobile hamburger menu
10. **Card Display** - Clean card view on project pages with tags and metadata

### Previous Session: Tasks System with Interactive Reminders ✅
1. **Complete Tasks CRUD** - Full task management with heading, description, target date, priority (1-5), status (Outstanding/In Process/Completed)
2. **Tasks Integration** - Tasks sections on project and contact detail pages (only show when tasks linked)
3. **Interactive Summary Banner** - Clickable boxes showing overdue/today/this week task counts with visual filtering
4. **Smart Highlighting** - Click summary boxes to filter and highlight matching tasks in the same color
5. **Consistent Styling** - Fixed status dropdown styling across all pages to match main Tasks page
6. **Priority Spacing** - Added proper spacing between PRIORITY and TASK column headings
7. **Project Pinning** - Star icon to pin projects to top of Projects page with proper sorting
8. **Logline Truncation** - Fixed Projects page to properly truncate long loglines with ellipsis

### Previous Session (Responsive UX):
1. **Projects Page Improvements** - Fixed tags and genres visibility on desktop table layout
2. **Notebook Page Enhancements** - Added collapsible filters with search functionality
3. **Project Detail Page Polish** - Blue pill "Edit" button with proper mobile positioning
4. **Layout Consistency** - Improved responsive behavior across all pages

### Previous Features Completed (Market Intelligence Session):
1. **RSS Feed Parsing** - Automatic parsing from Variety.com, Deadline.com, Screen Daily with XML processing
2. **Smart Article Matching** - Algorithm matches industry news articles to contacts/companies/projects
3. **Contact Page Integration** - Market Intelligence section appears on contact pages when matches found
4. **Admin Tools** - Complete debug interface at `/admin/market-intelligence` with RSS testing
5. **Database Architecture** - Full schema with news_articles, matching tables, and RLS policies
6. **Service Role Authentication** - Proper admin access for cross-workspace article matching
7. **UI Improvements** - Hide Market Intelligence section when no matches (better UX)

## Database Schema
### Core Tables:
- `workspaces` - Multi-tenant workspaces
- `workspace_members` - User-workspace relationships with roles
- `workspace_invites` - Invitation system with shareable links
- `projects` - Film/TV projects with metadata (includes `pinned` boolean column)
- `contacts` - Industry contacts with company associations
- `submissions` - Project submissions to contacts
- `meetings` - Scheduled meetings and events (includes meeting_link field)
- `tasks` - Task management with priority, status, target dates, links to projects/contacts
- `links` - URL bookmarks with tags, title, description, and metadata (workspace-level)
- `contact_talking_points` - Talking points linking contacts to projects for meeting prep
- `notifications` - System notifications (working for contact creation)

### Market Intelligence Tables:
- `news_articles` - Industry news from RSS feeds (RLS disabled for global access)
- `news_contact_matches` - Links articles to contacts with confidence scores
- `news_company_matches` - Links articles to companies with confidence scores
- `news_project_matches` - Links articles to projects with confidence scores

### Junction Tables:
- `project_mediums`, `project_genres`, `project_budget_ranges`
- `contact_mediums`, `contact_genres`, `contact_budget_ranges`
- `project_links` - Many-to-many relationship between projects and links

### Reference Data:
- `mediums` (Film, TV, Streaming, etc.)
- `genres` (Drama, Comedy, Horror, etc.)
- `budget_ranges` (Medium-specific ranges for Film vs TV)

## Key Technical Decisions

### Styling Architecture:
- **Primary UI Library**: Chakra UI - Use Chakra components whenever possible for consistency and accessibility
- **Migration Strategy**: Gradually migrating from inline CSS to Chakra UI components
- **Blue pill design system** - Consistent rounded buttons and form elements (now using Chakra Button components)
- **Responsive design** - Mobile-first approach using Chakra's responsive features
- **Fallback**: Inline CSS only when Chakra doesn't provide suitable component

### Authentication Flow:
- Supabase Auth with email confirmation
- Custom redirect handling for workspace invitations
- Automatic "Personal" workspace creation on signup

### Workspace System:
- RLS policies for data isolation between workspaces
- Role-based permissions (owner/admin/member)
- Shareable invitation links (manual distribution)

## File Structure
**Local Development Path:** `/home/keith/film-crm/` (organized in dedicated subfolder)
**Git Repository:** `keithlynch81/film-crm` (files at root level in repo)

```
/home/keith/film-crm/
├── app/                     # Next.js App Router pages
│   ├── projects/           # Project management pages with CSV import/export, pinning
│   ├── contacts/           # Contact management pages with CSV import/export + Market Intelligence
│   ├── submissions/        # Submission tracking pages
│   ├── schedule/           # Meeting scheduling with links and talking points
│   ├── tasks/              # Task management with interactive summary banner
│   ├── links/              # URL bookmark management with tags and project associations
│   ├── analytics/          # Analytics dashboard with CSS charts
│   ├── admin/market-intelligence/  # Market Intelligence admin and debug tools
│   ├── workspace/manage/   # Workspace management page
│   ├── invites/[id]/      # Invite acceptance page
│   ├── extension-callback/ # Chrome extension auth callback page
│   └── login/             # Authentication page
├── components/
│   ├── Layout.tsx         # Main navigation with Fiink logo, Links, Analytics, and Tasks tabs
│   └── workspace/         # Workspace-related components
├── lib/
│   └── supabase.ts       # Supabase client (includes supabaseAdmin for service role)
├── chrome-extension/       # Fiink Chrome Extension (Manifest V3)
│   ├── manifest.json      # Extension manifest with permissions and host permissions
│   ├── sidepanel.html     # Side panel UI with workspace selector and link form
│   ├── sidepanel.js       # Main extension logic (auth, metadata fetch, link saving)
│   ├── background.js      # Service worker for tab tracking
│   └── assets/            # Extension icons (16x16, 48x48, 128x128)
├── supabase/
│   └── migration.sql     # Complete database schema
├── market-intelligence-migration.sql  # Market Intelligence tables (APPLIED ✅)
├── fix-rls-policies.sql   # RLS fixes for news articles (APPLIED ✅)
├── talking-points-migration.sql  # Talking points table migration (APPLIED ✅)
├── add-meeting-link.sql   # Meeting link field migration (APPLIED ✅)
├── fix-notification-functions.sql  # Notification badge functions (APPLIED ✅)
├── add-project-pinning.sql  # Project pinning column and index (APPLIED ✅)
├── create-tasks-table.sql  # Tasks table schema (APPLIED ✅)
├── links-migration.sql     # Links and project_links tables with RLS (APPLIED ✅)
├── project-attachments-migration.sql  # Project attachments system (NEEDS TO BE APPLIED ❌)
├── project-attachments-update.sql  # Cast/crew role fields (NEEDS TO BE APPLIED ❌)
└── public/
    └── fiink_logo.png    # Brand logo
```

**Note:** The project was reorganized from `/home/keith/` into `/home/keith/film-crm/` for cleaner separation from Linux system files. The git repository structure remains unchanged (files at root level).

## Environment Setup
- **Platform**: Ubuntu on Windows 10 PC
- **Local Path**: `/home/keith/film-crm/` (project root directory)
- **Development**: `npm run dev` on localhost:3001 (run from `/home/keith/film-crm/`)
- **Database**: Supabase hosted PostgreSQL
- **Git Remote**: `keithlynch81/film-crm` on GitHub

## Important SQL Files Status:
- `supabase/migration.sql` - **CONSOLIDATED** main database schema with ALL migrations included ✅
  - Includes: Core schema, RLS policies, talking points, meeting links, notifications, project pinning, tasks, task_contacts, links, and all functions
  - **This is now the single source of truth** - all separate migration files have been consolidated into this file
  - Running `npx supabase db reset` will apply all migrations from this file
- `project-attachments-migration.sql` - Project attachments (OPTIONAL - not included in main migration.sql)
- `project-attachments-update.sql` - Cast/crew roles (OPTIONAL - not included in main migration.sql)

**Note**: Separate migration files (talking-points-migration.sql, add-meeting-link.sql, fix-notification-functions.sql, add-project-pinning.sql, create-tasks-table.sql, links-migration.sql, task-contacts-migration.sql) are now consolidated into the main migration.sql file. They are kept for reference only.

## Design System
### Chakra UI Integration:
- **Primary Library**: Use Chakra UI components for all new development
- **Component Mapping**:
  - Buttons → `<Button>` with `colorScheme="blue"` for primary actions
  - Forms → `<FormControl>`, `<Input>`, `<Select>`, `<Textarea>`
  - Layout → `<Box>`, `<Flex>`, `<Grid>`, `<Container>`, `<Stack>`
  - Navigation → `<Breadcrumb>`, responsive `<Box>` with `<Hide>`/`<Show>`
  - Tables → `<Table>`, `<Tbody>`, `<Tr>`, `<Td>` with responsive features
  - Cards → `<Card>` or `<Box>` with `shadow` and `borderRadius`
  - Modals → `<Modal>`, `<AlertDialog>` for confirmations

### Responsive Design Guidelines:
- **Mobile-first**: Use Chakra's array syntax `[base, md, lg]` for responsive props
- **Breakpoints**: Follow Chakra's default breakpoints (sm: 30em, md: 48em, lg: 62em, xl: 80em)
- **Navigation**: Use `<Hide>`/`<Show>` for mobile hamburger menus
- **Typography**: Use `<Heading>` and `<Text>` with responsive fontSize

### Colors (Chakra Theme):
- Primary Blue: #3b82f6 (blue.500 in Chakra)
- Background: #f9fafb (gray.50)
- Text: #111827 (gray.900), #374151 (gray.700), #6b7280 (gray.500)
- Success: #16a34a (green.600), Error: #dc2626 (red.600)

### Legacy Components (being migrated):
- **Pill Buttons**: Migrating to `<Button borderRadius="full">`
- **Form Inputs**: Migrating to `<FormControl>` patterns
- **Cards**: Migrating to `<Card>` or `<Box>` with consistent shadows
- **Status Pills**: Migrating to `<Badge>` components

## 🚀 DEPLOYMENT: Production Ready - All Core Features Complete

### Tasks System Features (Latest Session):
- ✅ **Interactive Summary Banner**: Clickable overdue/today/week boxes with visual filtering
- ✅ **Smart Task Highlighting**: Click boxes to highlight matching tasks in the same color
- ✅ **Full CRUD Operations**: Create, read, update, delete tasks with all fields
- ✅ **Priority-Based Sorting**: Tasks ordered by priority (1-5) then target date
- ✅ **Status Management**: Outstanding, In Process, Completed with inline dropdowns
- ✅ **Project/Contact Integration**: Tasks sections appear on detail pages when linked
- ✅ **Responsive Design**: Mobile cards, desktop table with proper spacing
- ✅ **Filter Integration**: Works with search, status, priority, project, contact filters

### Projects Page Enhancements (Latest Session):
- ✅ **Project Pinning**: Star icon to pin important projects to top of list
- ✅ **Logline Truncation**: Fixed long loglines with proper ellipsis display
- ✅ **Eye Icon**: Quick view icon added to project rows
- ✅ **Date Added Column**: Shows when projects were created

### System Status:
- ✅ **All Core Features**: Complete and deployed to production
- ✅ **Chrome Extension**: Fiink extension fully functional with workspace selection and metadata fetching
- ✅ **Database Migrations**: All applied except project attachments (optional enhancement)
- ✅ **Responsive Design**: Mobile and desktop fully optimized
- ✅ **Multi-Workspace**: Working with proper RLS isolation
- ✅ **Authentication**: Email verification flow complete (web + extension)
- ✅ **Notifications**: Badge counts and dropdown working

### Optional Future Enhancements:
- 📧 **Email Reminders**: Resend integration for daily task email digests (architecture documented)
- 📊 **Enhanced Analytics**: More detailed metrics and success rate tracking
- 📎 **Project Attachments**: Cast/crew database tables ready but not yet integrated
- 🔍 **Bulk Operations**: Multi-select for batch updates on projects/contacts/tasks

## Market Intelligence System Summary:
**What it does**: Automatically parses industry news from major trade publications (Variety, Deadline, Screen Daily), intelligently matches articles to your contacts using AI-powered text analysis, and integrates the results directly into contact detail pages.

**Current Status**: 100% complete - all functionality working including notification badge counts.

### Recently Completed: Enhanced Project Attachments System ✅
- ✅ **Database Schema**: Created `project_attachments`, `project_producers`, `project_cast`, `project_crew` tables
- ✅ **Collapsible UI**: "Attachments" section with up/down arrow toggle (positioned after Talking Points)
- ✅ **Production Company**: Auto-suggest showing only company names (e.g., "Pulse Films") with contact context
- ✅ **Multiple Producers**: Fixed auto-suggest from contacts with + button to add multiple
- ✅ **Enhanced Cast Management**: Two fields per entry (Actor Name + Character Role) with professional display
- ✅ **New Crew Section**: Two fields per entry (Crew Name + Role like Director/DP/Editor) with + button
- ✅ **Simple Fields**: Sales Agent, Financier, Distributor text inputs with auto-save
- ✅ **Stage Enhancement**: Added "Short Story" option between Deck and Draft in project forms
- ✅ **Full Integration**: Complete CRUD operations with database persistence and role support
- ✅ **User Experience**: Refined interface matching existing design patterns with better auto-suggest

### Previously Completed: Notification System Fix ✅
- ✅ **Root Cause**: Missing database functions for notification badge counts
- ✅ **Solution**: Created `fix-notification-functions.sql` with required functions
- ✅ **Database Functions**: `get_unread_notification_count`, `mark_notification_read`, `mark_all_notifications_read`
- ✅ **Red Badge**: Now displays correct unread notification counts
- ✅ **User Experience**: Full notification system working - badge count, dropdown, mark as read functionality

### Key Technical Achievements This Session:
- **Enhanced Form UX**: Restructured Quick Add form from horizontal Flex to vertical VStack for better organization
- **Multi-Select Pattern**: Implemented consistent checkbox pattern for projects (matching edit modal)
- **Tag Pill Buttons**: Added clickable purple pill buttons for selecting existing workspace tags
- **State Array Management**: Changed `quickProjectId` (string) to `quickProjectIds` (string[]) for multi-select
- **Tag Combination Logic**: `Array.from(new Set([...quickSelectedTags, ...typedTags]))` removes duplicates
- **Conditional Rendering**: Tag selection section only shows when `uniqueTags.length > 0`
- **Scrollable Containers**: maxH="200px" with overflowY="auto" for long project lists
- **Selection Counters**: Dynamic count displays in FormLabel (e.g., "Tags (2 selected)")
- **Database Batch Inserts**: `quickProjectIds.map()` creates multiple project_links records in one operation
- **Form Reset Arrays**: `setQuickSelectedTags([])` and `setQuickProjectIds([])` on successful submission

### Previous Session Achievements:
- **Tasks Table Schema**: Complete RLS policies with workspace isolation
- **Interactive Filtering**: State management for summary banner click handlers
- **Visual Feedback System**: Dynamic background colors based on filter selection
- **Toggle Logic**: Click once to filter, click again to clear
- **Integration**: Summary filter works alongside existing search/filter system
- **Project Pinning**: Database column with index for optimal sorting performance
- **Consistent Styling**: Unified status dropdown appearance across all task views

### Next Session Ideas:
- 📦 **Chrome Web Store**: Publish Fiink extension to Chrome Web Store for public distribution
- 🦊 **Firefox Extension**: Port Fiink to Firefox using WebExtensions API
- 📧 **Email Reminders Setup**: Implement Resend API for daily task digests
- 📊 **Submission Analytics**: Track response times and success rates by contact
- 🎯 **Smart Suggestions**: AI-powered contact recommendations based on project attributes
- 📦 **Bulk Operations**: Multi-select checkboxes for batch actions
- 🎬 **Box Office Data**: External API integration for project performance tracking

---
*Last Updated: December 10, 2025 - Project Reorganization (Moved to /home/keith/film-crm/ subfolder)*

## Session Summary (December 8, 2025 - Critical Security Update):

### User Request:
Received critical security alert from Vercel regarding CVE-2025-55182, a critical RCE (Remote Code Execution) vulnerability affecting React Server Components in Next.js. Vercel blocked all new deployments of vulnerable Next.js versions and required immediate upgrade to patched versions (15.0.5, 15.1.9, 15.2.6, 15.3.6, 15.4.8, 15.5.7, or 16.0.7).

### Problem Identified:
- **Current Version**: Next.js 14.0.4 (vulnerable to CVE-2025-55182)
- **Security Risk**: Critical RCE vulnerability with public exploits available
- **Deployment Impact**: Vercel blocking all new deployments until patched
- **desk-flow Project**: Already on Next.js 15.1.9 (secure)

### Solution Implemented:

#### 1. Next.js Version Upgrade ✅
**Files Modified**: `package.json`, `package-lock.json`
- Upgraded `next`: 14.0.4 → **15.5.7** (patched stable version)
- Upgraded `eslint-config-next`: 14.0.4 → **15.5.7** (matching version)
- Installation: `npm install` (added 15 packages, removed 9, changed 19)
- **Result**: 0 vulnerabilities after npm audit fix

#### 2. Next.js 15 Breaking Change Fixes ✅

**Breaking Change**: Next.js 15 requires `useSearchParams()` to be wrapped in Suspense boundaries

**File 1: `/app/extension-callback/page.tsx`**
- Added `Suspense` import from React
- Renamed `ExtensionCallback` → `ExtensionCallbackContent`
- Created new default export `ExtensionCallback` wrapping content in `<Suspense>`
- Added loading fallback with spinning animation
- Pattern: Split component into content + wrapper with Suspense boundary

**File 2: `/app/login/page.tsx`**
- Added `Suspense` import from React
- Renamed `LoginPage` → `LoginPageContent`
- Created new default export `LoginPage` wrapping content in `<Suspense>`
- Added simple loading fallback
- Same pattern as extension-callback page

#### 3. TypeScript Configuration Fix ✅

**File: `tsconfig.json`**
- **Problem**: TypeScript compiler checking desk-flow subdirectory files during build
- **Error**: `Cannot find module '@/lib/supabase/client'` in desk-flow files
- **Solution**: Added `"desk-flow/**"` to exclude array
- **Result**: TypeScript no longer type-checks desk-flow project

#### 4. Webpack Configuration Fix ✅

**File: `next.config.js`**
- Added webpack configuration to ignore desk-flow directory
- Set `watchOptions.ignored` to `['**/desk-flow/**', '**/node_modules/**']`
- Prevents webpack from watching/bundling desk-flow files
- Clean separation between Film CRM and desk-flow projects

### Build & Deployment Results:

**Production Build:**
```bash
npm run build
```

**Results:**
- ✅ **Compiled successfully** in 6.4s with Next.js 15.5.7
- ✅ **All 38 routes** generated successfully
- ✅ **Static pages**: 38/38 built without errors
- ✅ **Zero vulnerabilities** after npm audit fix
- ⚠️ Node.js 18 deprecation warnings (non-blocking, Vercel uses Node 20+)

**Routes Built:**
- 1 landing page, 37 dynamic/static app routes
- All API endpoints compiled successfully
- All page components with proper SSR/SSG configurations

**Git Operations:**
```bash
git add -A
git commit -m "CRITICAL SECURITY: Upgrade Next.js to 15.5.7..."
git push origin main
```

**Commit Details:**
- **Commit Hash**: b6ecd72
- **Files Changed**: 10 files (1,361 insertions, 277 deletions)
- **Changed Files**:
  - `package.json`, `package-lock.json` (version upgrades)
  - `app/extension-callback/page.tsx` (Suspense wrapper)
  - `app/login/page.tsx` (Suspense wrapper)
  - `tsconfig.json` (exclude desk-flow)
  - `next.config.js` (webpack ignore)
  - `next-env.d.ts` (auto-generated)
  - `.gitignore`, `CLAUDE.md` (documentation)
  - `supabase/migration.sql` (consolidated schema)

**Vercel Deployment:**
- ✅ Pushed to GitHub successfully
- ✅ Automatic Vercel deployment triggered
- ✅ Production build will use patched Next.js 15.5.7
- ✅ Deployment unblocked (no longer using vulnerable version)

### Technical Implementation Details:

**Suspense Boundary Pattern:**
```typescript
// Before (Next.js 14):
export default function LoginPage() {
  const searchParams = useSearchParams() // Direct usage
  // ... component code
}

// After (Next.js 15):
function LoginPageContent() {
  const searchParams = useSearchParams() // Used in content component
  // ... component code
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
```

**TypeScript Exclusion:**
```json
{
  "exclude": [
    "node_modules",
    "filmcontact/**",
    "supabase/functions/**",
    "desk-flow/**"  // Added to prevent conflicts
  ]
}
```

**Webpack Configuration:**
```javascript
const nextConfig = {
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/desk-flow/**', '**/node_modules/**'],
    }
    return config
  },
}
```

### Security Impact:

**Before:**
- Vulnerable to CVE-2025-55182 RCE exploit
- Public exploits available targeting vulnerability
- Vercel blocking new deployments
- Threat activity significantly increased

**After:**
- Protected by Next.js 15.5.7 security patches
- CVE-2025-55182 vulnerability fully patched
- 0 npm vulnerabilities (all resolved)
- Vercel deployments unblocked
- Production site secure and updated

### Key Learnings:

1. **Next.js 15 Breaking Changes**:
   - `useSearchParams()` requires Suspense boundaries for streaming support
   - Pattern: Split component into content + wrapper for clean separation
   - Suspense enables better loading states and progressive rendering

2. **Major Version Upgrades**:
   - Next.js 14 → 15 is a major version jump but relatively smooth
   - Build process auto-upgraded to 15.5.7 (latest stable in 15.x line)
   - Most breaking changes caught during build with clear error messages

3. **Multi-Project Monorepo Issues**:
   - TypeScript compiler checks all .tsx files in directory tree by default
   - Need explicit exclusions for subdirectories with different dependencies
   - Webpack also needs configuration to ignore unrelated projects

4. **Security Response Process**:
   - Critical CVE alerts require immediate action
   - Vercel's deployment blocking enforces security compliance
   - Upgrading to latest patched version (not just minimum) recommended

### Production Status:

- **URL**: https://film-crm.vercel.app
- **Next.js Version**: 15.5.7 (security patched)
- **Vulnerabilities**: 0 (all fixed)
- **Build Status**: ✅ Passing (38/38 routes)
- **Deployment**: ✅ Auto-deploying to Vercel production
- **Estimated Deploy Time**: 2-3 minutes

### Recommendations:

1. **Dependency Management**:
   - Set up Dependabot or Renovate for automated dependency updates
   - Subscribe to Next.js security advisories
   - Keep Next.js updated to receive future security patches

2. **Monitoring**:
   - Monitor Vercel deployment dashboard for successful build
   - Verify production site loads correctly after deployment
   - Check for any runtime errors in production logs

3. **Future Upgrades**:
   - Consider upgrading to React 19 (recommended for Next.js 15)
   - Keep Node.js version updated (Vercel uses 20+ automatically)
   - Review other dependencies for security vulnerabilities regularly

---

## Previous Session Summary (Industry Page - Mandate Markdown Formatting):

### User Request:
"On the Mandates tab on Industry page, the formatting of the Key Traits They Want section is bad. I'd like it to be spaced out in a more readable way like the original text that I copied and pasted in. Is there any sort of formatting that could be brought in so that the text field keeps the same formatting as that is pasted in?"

### Problem Identified:
The Key Traits They Want field was displaying as plain text without any formatting:
- No line breaks preserved (all text ran together)
- No bold or italic formatting from source
- No bullet points
- Large gaps between lines

### Solution Implemented:
**File Modified**: `/home/keith/app/industry/page.tsx`

1. **Installed react-markdown**:
   ```bash
   npm install react-markdown --save
   ```

2. **Imported ReactMarkdown** (line 42):
   ```tsx
   import ReactMarkdown from 'react-markdown'
   ```

3. **Updated Display Section** (lines 578-597):
   - Replaced simple Text component with ReactMarkdown wrapper
   - Added custom CSS styling via `sx` prop for proper rendering
   - Set tight line heights (1.4) and small margins (0.25rem for list items)

4. **Enhanced Form Input** (lines 954-967):
   - Added helper text explaining markdown syntax
   - Increased textarea rows from 3 to 8 for more space
   - Applied monospace font for better markdown visibility
   - Updated placeholder with markdown examples

### Technical Implementation:
```tsx
<Box
  fontSize="sm"
  color="gray.600"
  sx={{
    '& p': { marginBottom: '0.5rem', lineHeight: '1.4' },
    '& ul': { marginLeft: '1.25rem', marginBottom: '0.5rem', lineHeight: '1.4' },
    '& li': { marginBottom: '0.25rem' },
    '& strong': { fontWeight: 'bold' },
    '& em': { fontStyle: 'italic' }
  }}
>
  <ReactMarkdown>{mandate.key_traits}</ReactMarkdown>
</Box>
```

### Markdown Syntax Guide:
Users can now format content using:
- `**bold text**` → **bold text**
- `*italic text*` → *italic text*
- `- bullet point` or `* bullet point` → • bullet point
- Line breaks preserved automatically

### Result:
- ✅ **Rich text rendering** with bold, italic, and bullet points
- ✅ **Reduced line spacing** with 1.4 line height (was default 1.6+)
- ✅ **Proper bullet points** with left margin and tight spacing
- ✅ **Helper text** guides users on markdown syntax in form
- ✅ **Monospace input** makes markdown easier to write and edit

### Commit & Deployment:
- ✅ Committed with message: "Add markdown rendering for mandate key traits: support bold, italic, bullet points with reduced line spacing"
- ✅ Pushed to GitHub (commit hash: 23479b9)
- ✅ Automatic Vercel deployment triggered
- ✅ 79 packages added (react-markdown and dependencies)

### Usage Instructions:
To use markdown formatting in existing mandates:
1. Click Edit on a mandate
2. In the Key Traits They Want field, use markdown syntax:
   ```markdown
   **What they want:**
   - High-octane, global action shows (*Reacher*, *Jack Ryan*)
   - Female-led thrillers (*Better Sister*, *Ride or Die*)
   - Genre IP with built-in audiences (sci-fi, fantasy, adventure)
   ```
3. Save - the content will render with proper formatting

---

## Previous Session Summary (Industry Page - Mandate Visibility Fix):

### User Request:
"The posted mandate (for FX) is only visible for my login (keith@arecibomedia.com), when it's meant to be visible for all logins on all workspaces. It's just that it should only be my login who can Add Mandates via the button (this button shouldn't appear for any other user)."

### Problem Identified:
The entire "Mandates" tab was hidden from non-admin users:
- Line 506: `{isAdmin && <Tab fontWeight="medium">Mandates</Tab>}` - Tab only visible to admin
- Line 513: `{isAdmin && <TabPanel px={0}>` - TabPanel content only rendered for admin
- Result: Non-admin users couldn't see the Mandates tab at all

### Solution Implemented:
**File Modified**: `/home/keith/app/industry/page.tsx`

1. **Made Mandates Tab Universal** (line 506):
   - Removed: `{isAdmin && <Tab>...}`
   - Changed to: `<Tab fontWeight="medium">Mandates</Tab>`
   - Now visible to all authenticated users

2. **Made Mandates Content Universal** (line 513):
   - Removed: `{isAdmin && <TabPanel px={0}>}`
   - Changed to: `<TabPanel px={0}>`
   - Content now loads for all users

3. **Restricted Add Button to Admin** (lines 519-527):
   ```tsx
   {isAdmin && (
     <Button
       onClick={() => openMandateModal()}
       colorScheme="blue"
       size="sm"
     >
       + Add Mandate
     </Button>
   )}
   ```

4. **Restricted Edit/Delete Buttons to Admin** (lines 594-623):
   ```tsx
   {isAdmin && (
     <HStack spacing={2}>
       <IconButton ... aria-label="Edit mandate" ... />
       <IconButton ... aria-label="Delete mandate" ... />
     </HStack>
   )}
   ```

### Technical Details:
- **Admin Check**: `setIsAdmin(user.email === 'keith@arecibomedia.com')` (line 121)
- **Database Query**: `loadMandates()` loads ALL mandates without workspace filtering (line 148-150)
- **RLS Policy**: Mandates table has global read access for all authenticated users
- **Write Permissions**: Only admin can create, update, or delete mandates (UI controls)

### Result:
- ✅ **All users see Mandates tab** in Industry page navigation
- ✅ **All users see all mandates** (FX mandate, etc.) regardless of workspace
- ✅ **Only keith@arecibomedia.com sees** "+ Add Mandate" button
- ✅ **Only keith@arecibomedia.com sees** Edit/Delete IconButtons on mandate cards
- ✅ **Non-admin users** get read-only view of mandates

### Commit & Deployment:
- ✅ Committed with message: "Fix mandates visibility: Show Mandates tab to all users, restrict Add/Edit/Delete buttons to admin only"
- ✅ Pushed to GitHub (commit hash: fae5162)
- ✅ Automatic Vercel deployment triggered
- ✅ Changes live in production

---

## Previous Session Summary (Industry Page - Expandable Article Lists):

### User Request:
The Industry page's Track tab showed tracked terms (like "Netflix") with article counts (e.g., "7 matches") but only displayed 5 articles. Below the articles was static black text "+2 more articles" that was not clickable, preventing users from seeing all articles. User requested:
1. Show maximum 5 articles by default
2. Make the "+X more articles" text clickable
3. Clicking should expand to show all articles
4. Provide a way to collapse back to 5

### Initial Investigation - Wrong File:
- **Mistake**: Initially modified `/home/keith/app/contacts/[id]/page.tsx` (contact detail page)
- **Why Wrong**: Assumed the issue was on contact pages based on RSS tracking context
- **User Feedback**: "I'm not seeing those changes on either the Vercel site (which has successfully built) or the local site. The +2 more articles is still black unclickable text."
- **Recovery**: Used grep to search for "more article" text across all files

### Finding the Correct Location:
- **Grep Search**: Found text in 5 files, identified correct location at `/home/keith/app/industry/page.tsx:835-837`
- **Actual Location**: Industry page's "Track" tab, showing tracked terms with their matched articles
- **Context**: Track tab displays terms like "Netflix", "David Zaslav", etc., with their article matches

### Implementation:
- **File Modified**: `/home/keith/app/industry/page.tsx`
- **Lines Changed**:
  - Line 113: Added `expandedTerms` state
  - Line 812: Modified article map to conditionally slice
  - Lines 836-860: Replaced static Text with interactive Button

### Technical Changes:
1. **State Variable** (line 113):
   ```typescript
   const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set())
   ```

2. **Conditional Article Display** (line 812):
   ```typescript
   {(expandedTerms.has(term.id) ? term.tracked_term_matches : term.tracked_term_matches.slice(0, 5)).map(match => (
     // Article display JSX
   ))}
   ```

3. **Clickable Button** (lines 836-860):
   ```typescript
   {term.tracked_term_matches.length > 5 && (
     <Button
       onClick={() => {
         setExpandedTerms(prev => {
           const newSet = new Set(prev)
           if (newSet.has(term.id)) {
             newSet.delete(term.id)
           } else {
             newSet.add(term.id)
           }
           return newSet
         })
       }}
       variant="ghost"
       size="xs"
       color="blue.600"
       pl={3}
       fontWeight="medium"
       _hover={{ bg: "blue.50" }}
     >
       {expandedTerms.has(term.id)
         ? 'Show less'
         : `+${term.tracked_term_matches.length - 5} more article${term.tracked_term_matches.length - 5 !== 1 ? 's' : ''}`
       }
     </Button>
   )}
   ```

### Key Features:
- **Set Data Structure**: Efficient tracking of which terms are expanded (O(1) lookups)
- **Toggle Logic**: Click once adds to Set (expand), click again removes from Set (collapse)
- **Independent Expansion**: Each tracked term expands/collapses independently
- **Dynamic Text**: Button text changes based on state ("Show less" vs "+X more articles")
- **Proper Pluralization**: Handles singular "article" vs plural "articles"
- **Chakra UI Button**: Ghost variant with blue color and hover background
- **Conditional Rendering**: Button only appears when articles > 5

### Critical Learning:
**Verify exact location before implementing fixes.** Initial assumption led to modifying wrong file. Direct search for UI text (grep "more article") revealed actual location. This highlights importance of:
1. Confirming which page/component has the issue
2. Using search tools to find exact text location
3. Verifying changes are visible before committing

### Commit & Deployment:
- ✅ Fixed wrong file modifications (reset commit, removed .local, recommitted)
- ✅ Applied correct fix to Industry page
- ✅ Committed with message: "Make tracked term article list expandable on Industry page: clickable '+X more articles' button shows all matches"
- ✅ Pushed to GitHub successfully
- ✅ User confirmed: "that's working"

---

## Previous Session Summary (Links Page Collapsible Form):

### User Request:
Make the "Add New Link" section collapsible on the Links page (similar to the "Search & Filters" section), with the form collapsed by default.

### Implementation:
- **File Modified**: `/home/keith/app/links/page.tsx`
- **Lines Changed**: Line 99 (state variable) + lines 536-702 (collapsible UI structure)

### Technical Changes:
1. **State Variable** (line 99):
   - Added `const [showAddForm, setShowAddForm] = useState(false)` - false makes it collapsed by default

2. **Collapsible Header** (lines 536-549):
   ```tsx
   <Flex
     justify="space-between"
     align="center"
     cursor="pointer"
     onClick={() => setShowAddForm(!showAddForm)}
     mb={showAddForm ? 4 : 0}
   >
     <Heading size="md" color="gray.800">Add New Link</Heading>
     <Text fontSize="lg" color="gray.600" transition="transform 0.2s">
       {showAddForm ? '▲' : '▼'}
     </Text>
   </Flex>
   ```

3. **Conditional Form Rendering** (lines 551-702):
   - Wrapped entire VStack form in `{showAddForm && (...)}`
   - All form fields (URL, Tags, Projects, Genres) only render when showAddForm is true

### Key Features:
- **Default Collapsed**: Form hidden on page load for cleaner initial view
- **Toggle on Click**: Click anywhere on the "Add New Link" header to expand/collapse
- **Arrow Indicator**: Down arrow (▼) when collapsed, up arrow (▲) when expanded
- **Smooth Transition**: transition="transform 0.2s" on arrow for subtle animation
- **Consistent Pattern**: Exact same UI/UX as "Search & Filters" collapsible section

### Technical Issue Encountered:
- Initial syntax error during compilation was a Next.js development server caching issue
- **Solution**: Killed old dev server instances and started fresh with `npm run dev`
- Code was syntactically correct - restarting server cleared the error

### Commit & Deployment:
- ✅ Committed with message: "Make Add New Link section collapsed by default on Links page"
- ✅ Pushed to GitHub (commit hash: 26da6be)
- ✅ Automatic Vercel deployment triggered
- ✅ Clean compilation, no errors

---

## Previous Session Summary (Links Page Quick Add Form Restructure):

### User Request:
Restructure the Quick Add form on the Links page to:
1. Add tag selection section with pill buttons (similar to genres) for previously created user tags
2. Move the new tag input field from inline position to below tag selection buttons
3. Change Project field from single-select dropdown to multi-select checkboxes (matching edit modal functionality)

### Implementation:
- **File Modified**: `/home/keith/app/links/page.tsx`
- **Lines Changed**: ~150 lines restructured (state variables, toggle functions, handleQuickAdd, form JSX)

### Technical Changes:
1. **State Variables** (lines 85-86):
   - Added `quickSelectedTags: string[]` for tracking tag pill selections
   - Changed `quickProjectId: string` → `quickProjectIds: string[]` for multi-project support

2. **Toggle Functions** (lines 400-420):
   - Created `toggleQuickTag(tag: string)` - adds/removes tags from selection
   - Created `toggleQuickProject(projectId: string)` - adds/removes projects from selection

3. **handleQuickAdd() Updates** (lines 177-270):
   - Parse typed tags: `quickTags.split(',').map().filter()`
   - Combine with selected tags: `Array.from(new Set([...quickSelectedTags, ...typedTags]))`
   - Handle multiple projects: `quickProjectIds.map(projectId => ({ project_id, link_id }))`
   - Reset new state: `setQuickSelectedTags([])`, `setQuickProjectIds([])`

4. **Form Restructure** (lines 538-687):
   ```
   Old Layout (Horizontal Flex):
   [URL] [Tags Input] [Project Dropdown] [Add Button]
   [Genres Pills]

   New Layout (Vertical Stack):
   [URL]
   [Tag Pills - existing tags] (conditional)
   [Add New Tags Input]
   [Projects Checkboxes] (scrollable)
   [Genres Pills]
   [Add Button]
   ```

### Key Features:
- **Purple Tag Pills**: colorScheme="purple" for tag selections (distinct from green genres)
- **Scrollable Project List**: VStack with maxH="200px", overflowY="auto", border, padding
- **Selection Counters**: "Tags (2 selected)", "Projects (3 selected)", "Genres (1 selected)"
- **Conditional Rendering**: Tag pills only show if `uniqueTags.length > 0`
- **Duplicate Prevention**: Set removes duplicates when combining tag sources
- **Consistent Patterns**: Checkbox UI matches edit modal exactly

### Commit & Deployment:
- ✅ Committed with detailed message explaining all changes
- ✅ Pushed to GitHub (triggers automatic Vercel deployment)
- ✅ No TypeScript errors, clean compilation

---

## Previous Session Summary (Chrome Extension - Fiink):

### Issues Identified and Fixed:
1. **Extension Not Logging In** - Root cause: Using old Supabase URL (zflxnfhqgzmfkpcilzqm) instead of new project URL (hqefgtuczwjffuydjwmb)
2. **Invalid API Key Error** - Root cause: Anon key had wrong signature for new Supabase project
3. **YouTube Title Showing "- Youtube"** - Root cause: Metadata fetch happening too early (before form visible), falling back to Chrome tab title
4. **Tab Changes Not Updating URL** - Root cause: No listeners for Chrome tab events

### Changes Made:
- **chrome-extension/manifest.json**: Updated name to "Fiink", changed host_permissions to new Supabase URL
- **chrome-extension/sidepanel.js** (lines 4-5): Updated SUPABASE_URL and SUPABASE_ANON_KEY to new project credentials
- **chrome-extension/sidepanel.js** (lines 51-61): Added Chrome tabs event listeners (onActivated, onUpdated) for tab tracking
- **chrome-extension/sidepanel.js** (lines 258-265): Removed premature metadata fetching from loadCurrentTab()
- **chrome-extension/sidepanel.js** (lines 280-314): Modified handleQuickSave() to fetch metadata when user clicks "Save Link"
- **chrome-extension/sidepanel.html**: Added workspace selector dropdown, restructured UI for two-step flow

### Technical Implementation:
- **Authentication Flow**: Extension opens film-crm.vercel.app/extension-callback in popup → user logs in → callback page posts tokens via window.opener.postMessage → extension catches message and sets Supabase session
- **Metadata Fetching**: Calls /api/fetch-link-metadata which extracts Open Graph titles (og:title) for proper YouTube video titles
- **Workspace Integration**: Queries workspace_members table with join to load user's workspaces, allows selection before saving
- **Tab Tracking**: Chrome tabs API listeners automatically update current URL when user switches tabs or navigates

### Key Learnings:
- Chrome Extension Manifest V3 requires explicit host_permissions for Supabase and web app domains
- Fetch metadata at point of user interaction (button click), not on page load for better UX
- window.opener.postMessage is more reliable than chrome.runtime.sendMessage for cross-window communication
- JWT signatures must match the Supabase project exactly - copy from dashboard Settings → API
- Chrome tabs listeners need null checks for currentUser and currentWorkspaceId to avoid errors

### Verified Working:
✅ Extension logs in successfully via popup window with postMessage auth flow
✅ Workspace selector loads all user workspaces from database
✅ "Save Link" button fetches metadata and shows detailed form
✅ YouTube titles display correctly (e.g., "5 Trends Reshaping Filmmaking")
✅ Tab switching automatically updates current URL in extension
✅ Links save to database with tags, projects, genres, and metadata
✅ Extension branded as "Fiink" throughout UI and manifest