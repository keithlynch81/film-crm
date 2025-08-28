# Film CRM - Project Context and Status

## Project Overview
A complete Next.js 14 + Supabase Film CRM application for managing film projects, contacts, submissions, and workspace collaboration. Built with TypeScript, App Router, and Row Level Security (RLS).

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, React
- **Backend**: Supabase (PostgreSQL with RLS)
- **Styling**: Inline CSS (blue pill design system)
- **Authentication**: Supabase Auth with email confirmation
- **Architecture**: Multi-workspace with role-based access (owner/admin/member)

## Current Status - MARKET INTELLIGENCE SYSTEM 95% COMPLETE ⚡

### Core Features Working:
- ✅ **Projects Management**: Create, edit, view, delete projects with mediums, genres, budget ranges
- ✅ **Contacts Management**: Full CRUD for contacts with company associations
- ✅ **Submissions Tracking**: Create and edit submissions linked to projects and contacts
- ✅ **Schedule Management**: Meeting and event scheduling with links and talking points
- ✅ **Multi-Workspace System**: Users can belong to multiple workspaces with different roles
- ✅ **Workspace Invitations**: Shareable invite links with email confirmation flow
- ✅ **Authentication**: Complete signup/login flow with email verification
- ✅ **CSV Import/Export**: Full CSV functionality for Projects and Contacts with proper formatting
- ✅ **Analytics Dashboard**: Comprehensive analytics with CSS-only charts and data visualization
- ✅ **Talking Points System**: Bidirectional talking points for meeting preparation
- ✅ **Advanced Filtering**: Tag-based filtering with pill buttons on Projects page
- ✅ **Market Intelligence**: RSS parsing, article matching, contact integration (95% complete)

### Recent Features Completed (Market Intelligence Session):
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
- `projects` - Film/TV projects with metadata
- `contacts` - Industry contacts with company associations
- `submissions` - Project submissions to contacts
- `meetings` - Scheduled meetings and events (includes meeting_link field)
- `contact_talking_points` - Talking points linking contacts to projects for meeting prep
- `notifications` - System notifications (existing, working for contact creation)

### Market Intelligence Tables:
- `news_articles` - Industry news from RSS feeds (RLS disabled for global access)
- `news_contact_matches` - Links articles to contacts with confidence scores
- `news_company_matches` - Links articles to companies with confidence scores
- `news_project_matches` - Links articles to projects with confidence scores

### Junction Tables:
- `project_mediums`, `project_genres`, `project_budget_ranges`
- `contact_mediums`, `contact_genres`, `contact_budget_ranges`

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
```
/home/keith/
├── app/                     # Next.js App Router pages
│   ├── projects/           # Project management pages with CSV import/export
│   ├── contacts/           # Contact management pages with CSV import/export + Market Intelligence
│   ├── submissions/        # Submission tracking pages
│   ├── schedule/           # Meeting scheduling with links and talking points
│   ├── analytics/          # Analytics dashboard with CSS charts
│   ├── admin/market-intelligence/  # Market Intelligence admin and debug tools
│   ├── workspace/manage/   # Workspace management page
│   ├── invites/[id]/      # Invite acceptance page
│   └── login/             # Authentication page
├── components/
│   ├── Layout.tsx         # Main navigation with Fiink logo and Analytics tab
│   └── workspace/         # Workspace-related components
├── lib/
│   └── supabase.ts       # Supabase client (includes supabaseAdmin for service role)
├── supabase/
│   └── migration.sql     # Complete database schema
├── market-intelligence-migration.sql  # Market Intelligence tables (APPLIED ✅)
├── fix-rls-policies.sql   # RLS fixes for news articles (APPLIED ✅)
├── talking-points-migration.sql  # Talking points table migration (APPLIED ✅)
├── add-meeting-link.sql   # Meeting link field migration (NEEDS TO BE APPLIED ❌)
├── adapt-market-intelligence-notifications.sql  # Notification function (NEEDS DEBUG 🔍)
└── public/
    └── fiink_logo.png    # Brand logo
```

## Environment Setup
- **Platform**: Ubuntu on Windows 10 PC
- **Development**: `npm run dev` on localhost:3001
- **Database**: Supabase hosted PostgreSQL

## Important SQL Files:
- `supabase/migration.sql` - Main database schema with RLS policies
- `talking-points-migration.sql` - Talking points table (APPLIED ✅)
- `add-meeting-link.sql` - Meeting link field (NEEDS TO BE APPLIED ❌)

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

## 🚨 URGENT: Next Session Tasks (Market Intelligence 95% Complete)

### Outstanding Issue: Notifications Not Firing 🔍
**Problem**: Market Intelligence matches are being created successfully (6 found for Margot Robbie), but notifications aren't being generated for new matches.

**Root Cause Identified**: Service role operations bypass database triggers. The `supabaseAdmin` client used for matching bypasses the notification trigger.

**Files Ready for Debug**:
- `adapt-market-intelligence-notifications.sql` - Function adapted for existing notification table structure
- `app/api/market-intelligence/match-articles/route.ts` - Updated to call notification function manually

**Next Steps to Complete**:
1. **Debug the notification function call** - Check server logs when running "Update Market Intelligence"
2. **Verify function is being called** - Add console logging to the matching API
3. **Test manual notification creation** - Direct SQL insert to test notification function works
4. **Fix any parameter mismatches** - Ensure JSONB format matches function expectations

### What's Working ✅:
- ✅ **RSS Parsing**: Variety (10 articles), Deadline (12 articles), Screen Daily (0 articles)
- ✅ **Article Storage**: 22+ articles saved successfully  
- ✅ **Smart Matching**: 6 contact matches found for Margot Robbie
- ✅ **Contact Integration**: Market Intelligence section appears on contact pages with matches
- ✅ **Admin Tools**: Full debug interface at `/admin/market-intelligence/debug`
- ✅ **UI Improvements**: Section hidden when no matches found
- ✅ **Service Role Setup**: `SUPABASE_SERVICE_ROLE_KEY` configured and working
- ✅ **Existing Notifications**: 4 notifications working for contact creation

### Technical Architecture Complete ✅:
- ✅ **Database Schema**: All tables created and RLS policies configured
- ✅ **API Endpoints**: RSS parsing, matching, debug tools all functional
- ✅ **Matching Algorithm**: Name-based matching with confidence scoring
- ✅ **Cross-Workspace Access**: Service role bypasses RLS for global article matching

## Important SQL Files Status:
- `market-intelligence-migration.sql` - Market Intelligence tables (APPLIED ✅)
- `fix-rls-policies.sql` - RLS fixes for news articles (APPLIED ✅)  
- `talking-points-migration.sql` - Talking points table migration (APPLIED ✅)
- `add-meeting-link.sql` - Meeting link field migration (NEEDS TO BE APPLIED ❌)
- `adapt-market-intelligence-notifications.sql` - Notification function (NEEDS DEBUG 🔍)

## Market Intelligence System Summary:
**What it does**: Automatically parses industry news from major trade publications (Variety, Deadline, Screen Daily), intelligently matches articles to your contacts using AI-powered text analysis, and integrates the results directly into contact detail pages.

**Current Status**: 95% complete - core functionality working, just notifications need final debugging.

---
*Last Updated: End of Market Intelligence session - Core system working, notifications need final debug*