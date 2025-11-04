# Film CRM - Link Saver Chrome Extension

A Chrome extension that lets you quickly save links to your Film CRM workspace directly from your browser's side panel.

## Features

- 🎬 **Quick Save** - Save the current page to your Film CRM workspace with one click
- 🏷️ **Tag Autocomplete** - Auto-suggests tags from your existing links
- 📁 **Project Association** - Link URLs to multiple projects
- 🎭 **Genre Tagging** - Categorize links by genre
- 🔄 **Real-time Sync** - All links appear instantly on film-crm.vercel.app/links
- 🔐 **Secure** - Uses your existing Film CRM Supabase authentication

## Installation (Unpacked Extension for Development)

### Step 1: Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `/home/keith/chrome-extension` folder
5. The Film CRM icon should appear in your extensions toolbar

### Step 2: Pin the Extension (Optional but Recommended)

1. Click the puzzle piece icon 🧩 in Chrome's toolbar
2. Find "Film CRM - Link Saver"
3. Click the pin icon 📌 to keep it visible

### Step 3: Open the Side Panel

1. Click the Film CRM extension icon in your toolbar
2. Chrome will open the side panel on the right side of your browser
3. You'll see a login screen

### Step 4: Log In

1. Click the **"Log In"** button in the side panel
2. This opens a new tab to `https://film-crm.vercel.app/login`
3. Log in with your Film CRM credentials
4. After successful login, return to the side panel
5. The panel will automatically detect your session and load your workspace

## How to Use

### Quick Save a Link

1. Navigate to any webpage you want to save
2. Open the Film CRM side panel (click the extension icon)
3. The current page's URL and title will auto-populate
4. Fill in the form:
   - **Title** - Auto-fetched from the page (you can edit it)
   - **Tags** - Comma-separated tags (autocomplete will suggest existing tags)
   - **Projects** - Select one or more projects (hold Ctrl/Cmd for multiple)
   - **Genres** - Select one or more genres (hold Ctrl/Cmd for multiple)
5. Click **"Save Link"**
6. Success! The link is now saved to your workspace

### Tag Autocomplete

- As you type in the Tags field, the extension will suggest tags from your existing links
- Click a suggestion to auto-complete it
- Tags are automatically converted to lowercase to prevent duplicates

### View Your Links

- All saved links appear instantly on your main site: https://film-crm.vercel.app/links
- You can edit, delete, or organize them from the main site

## Troubleshooting

### Extension Not Loading

- Make sure you selected the correct folder (`/home/keith/chrome-extension`)
- Check that all files are present: `manifest.json`, `sidepanel.html`, `sidepanel.js`, `background.js`, `supabase.js`, and the `assets/` folder
- Refresh the extension by clicking the reload icon ↻ on `chrome://extensions/`

### Login Not Working

- Make sure you have a Film CRM account at https://film-crm.vercel.app
- Try logging in directly on the website first
- After logging in on the website, refresh the extension side panel
- Check the browser console for errors (F12 → Console tab)

### Links Not Saving

- Ensure you're logged in (check the "Logged in as" message at the top of the panel)
- Make sure you have at least one workspace on your Film CRM account
- Check that the URL field shows the current page's URL
- Try refreshing the extension

### Projects/Genres Not Loading

- Make sure you have projects created on https://film-crm.vercel.app/projects
- Genres are system-wide and should load automatically
- Try logging out and back in

## Technical Details

### Files Structure

```
chrome-extension/
├── manifest.json         # Extension configuration
├── sidepanel.html       # Side panel UI
├── sidepanel.js         # Main logic and Supabase integration
├── background.js        # Background service worker
├── supabase.js          # Supabase JS library
├── assets/
│   ├── icon16.png       # Extension icon (16x16)
│   ├── icon48.png       # Extension icon (48x48)
│   └── icon128.png      # Extension icon (128x128)
└── README.md
```

### Permissions Explained

- **`activeTab`** - Read current tab's URL and title when you click save
- **`storage`** - Store your login session locally
- **`sidePanel`** - Display the extension UI in Chrome's side panel
- **Host permissions** - Connect to your Supabase backend

### Data Storage

- All links are stored in your Supabase database (same as the main website)
- No data is stored on external servers
- Authentication tokens are stored securely in Chrome's local storage
- Tags, projects, and genres sync in real-time with your workspace

## Future Enhancements

Potential features for future versions:

- [ ] Browse/search saved links directly in the side panel
- [ ] Edit and delete links from the extension
- [ ] Keyboard shortcuts for quick-save
- [ ] Custom tag suggestions based on URL domain
- [ ] Export links to CSV from the extension
- [ ] Firefox/Edge support

## Support

If you encounter any issues:

1. Check the console for errors (F12 → Console)
2. Verify you're logged in at https://film-crm.vercel.app
3. Try reloading the extension from `chrome://extensions/`
4. Check that all database tables exist (links, project_links, link_genres)

## Version History

**v1.0.0** (Initial Release)
- Quick-add links from side panel
- Tag autocomplete
- Project and genre association
- Supabase authentication
- Auto-fetch page metadata
