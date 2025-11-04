// Film CRM Chrome Extension - Side Panel
// Uses Supabase for authentication and data storage

const SUPABASE_URL = 'https://hqefgtuczwjffuydjwmb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODQ0NjIsImV4cCI6MjA3MTI2MDQ2Mn0.BVyzkd-KWsOAHM3qzFx98-DschS6IOmwsmQwBrz8DaA';

let supabase;
let currentUser = null;
let currentWorkspaceId = null;
let currentTab = null;
let allTags = [];
let projects = [];
let genres = [];
let workspaces = [];

// Initialize Supabase client
function initSupabase() {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Initialize app
async function init() {
  initSupabase();

  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    await handleAuthenticated(session.user);
  } else {
    showLogin();
  }

  // Setup event listeners
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('logout-link').addEventListener('click', handleLogout);
  document.getElementById('workspace-select').addEventListener('change', handleWorkspaceChange);
  document.getElementById('quick-save-btn').addEventListener('click', handleQuickSave);
  document.getElementById('detailed-form').addEventListener('submit', handleDetailedSave);

  // Tag autocomplete
  const tagInput = document.getElementById('link-tags');
  tagInput.addEventListener('input', handleTagInput);
  tagInput.addEventListener('blur', () => {
    setTimeout(() => {
      document.getElementById('tag-suggestions').classList.add('hidden');
    }, 200);
  });

  // Listen for tab changes to refresh current URL
  chrome.tabs.onActivated.addListener(async () => {
    if (currentUser && currentWorkspaceId) {
      await loadCurrentTab();
    }
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.status === 'complete' && currentUser && currentWorkspaceId) {
      await loadCurrentTab();
    }
  });
}

// Show login view
function showLogin() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('login-view').classList.remove('hidden');
  document.getElementById('main-view').classList.add('hidden');
}

// Show main view
function showMain() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('main-view').classList.remove('hidden');
}

// Handle login
async function handleLogin() {
  // Create a unique auth state for this login attempt
  const authState = Math.random().toString(36).substring(7);
  chrome.storage.local.set({ authState });

  // Open the extension callback page directly (it has a login form)
  const authUrl = `https://film-crm.vercel.app/extension-callback?state=${authState}`;

  // Use window.open to open login popup
  const authWindow = window.open(authUrl, '_blank', 'width=450,height=600');

  if (!authWindow) {
    showError('Please allow popups for this extension');
    return;
  }

  // Listen for postMessage from the popup window
  const postMessageListener = async (event) => {
    // Verify the message is from our domain
    if (event.origin !== 'https://film-crm.vercel.app') return;

    if (event.data.type === 'EXTENSION_AUTH_SUCCESS' && event.data.state === authState) {
      const { access_token, refresh_token } = event.data;

      if (access_token) {
        try {
          // Set the session in Supabase
          const { data: sessionData, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });

          if (error) {
            console.error('Session error:', error);
            showError('Failed to establish session: ' + error.message);
            return;
          }

          if (sessionData?.user) {
            // Close the auth window
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }
            // Remove listener
            window.removeEventListener('message', postMessageListener);
            clearInterval(checkClosed);
            // Update UI
            await handleAuthenticated(sessionData.user);
          } else {
            showError('Authentication failed - no user data');
          }
        } catch (err) {
          console.error('Exception during session setup:', err);
          showError('Authentication error: ' + err.message);
        }
      }
    }
  };

  window.addEventListener('message', postMessageListener);

  // Check if window was closed before auth completed
  const checkClosed = setInterval(() => {
    if (authWindow.closed) {
      clearInterval(checkClosed);
      window.removeEventListener('message', postMessageListener);
    }
  }, 1000);

  // Clean up listeners after 5 minutes
  setTimeout(() => {
    clearInterval(checkClosed);
    window.removeEventListener('message', postMessageListener);
  }, 300000);
}

// Handle authenticated state
async function handleAuthenticated(user) {
  currentUser = user;
  document.getElementById('user-email').textContent = user.email;

  // Load user's workspaces
  await loadWorkspaces();

  // Load the current tab info
  await loadCurrentTab();

  showMain();
}

// Load workspaces
async function loadWorkspaces() {
  const { data: workspacesData } = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      workspaces (
        id,
        name
      )
    `)
    .eq('user_id', currentUser.id);

  if (workspacesData && workspacesData.length > 0) {
    workspaces = workspacesData.map(w => ({
      id: w.workspace_id,
      name: w.workspaces.name
    }));

    const workspaceSelect = document.getElementById('workspace-select');
    workspaceSelect.innerHTML = workspaces.map(w =>
      `<option value="${w.id}">${w.name}</option>`
    ).join('');

    // Set the first workspace as default
    currentWorkspaceId = workspaces[0].id;
    workspaceSelect.value = currentWorkspaceId;

    // Load reference data for the selected workspace
    await loadReferenceData();
  } else {
    showError('No workspace found. Please create a workspace on the main site.');
  }
}

// Handle workspace change
async function handleWorkspaceChange(e) {
  currentWorkspaceId = e.target.value;

  if (currentWorkspaceId) {
    await loadReferenceData();
  }
}

// Load reference data (projects, genres, tags)
async function loadReferenceData() {
  if (!currentWorkspaceId) return;

  // Load projects
  const { data: projectsData } = await supabase
    .from('projects')
    .select('id, title')
    .eq('workspace_id', currentWorkspaceId)
    .order('title');

  projects = projectsData || [];

  const projectSelect = document.getElementById('link-projects');
  projectSelect.innerHTML = projects.length > 0
    ? projects.map(p => `<option value="${p.id}">${p.title}</option>`).join('')
    : '<option value="">No projects yet</option>';

  // Load genres
  const { data: genresData } = await supabase
    .from('genres')
    .select('id, name')
    .order('name');

  genres = genresData || [];

  const genreSelect = document.getElementById('link-genres');
  genreSelect.innerHTML = genres.length > 0
    ? genres.map(g => `<option value="${g.id}">${g.name}</option>`).join('')
    : '<option value="">No genres</option>';

  // Load existing tags from links
  const { data: linksData } = await supabase
    .from('links')
    .select('tags')
    .eq('workspace_id', currentWorkspaceId);

  const tagSet = new Set();
  linksData?.forEach(link => {
    link.tags?.forEach(tag => tagSet.add(tag.toLowerCase()));
  });
  allTags = Array.from(tagSet).sort();
}

// Load current tab info
async function loadCurrentTab() {
  chrome.runtime.sendMessage({ action: 'getCurrentTab' }, async (response) => {
    if (response) {
      currentTab = response;
      document.getElementById('current-url').textContent = response.url;
    }
  });
}

// Fetch link metadata from your API
async function fetchLinkMetadata(url) {
  try {
    const response = await fetch(`https://film-crm.vercel.app/api/fetch-link-metadata?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return { title: '', favicon_url: '' };
  }
}

// Handle quick save (just saves the link without details)
async function handleQuickSave() {
  if (!currentTab || !currentWorkspaceId) {
    showError('Missing required data. Please refresh the extension.');
    return;
  }

  const quickSaveBtn = document.getElementById('quick-save-btn');
  quickSaveBtn.disabled = true;
  quickSaveBtn.textContent = 'Loading...';

  try {
    // Fetch metadata for the current URL
    const metadata = await fetchLinkMetadata(currentTab.url);

    // Set the title field with fetched metadata or fall back to tab title
    const titleField = document.getElementById('link-title');
    titleField.value = metadata.title || currentTab.title || '';

    // Hide quick save button and show detailed form
    quickSaveBtn.classList.add('hidden');
    document.getElementById('detailed-form').classList.remove('hidden');
  } catch (error) {
    console.error('Error fetching metadata:', error);
    // Still show the form even if metadata fetch fails
    document.getElementById('link-title').value = currentTab.title || '';
    quickSaveBtn.classList.add('hidden');
    document.getElementById('detailed-form').classList.remove('hidden');
  } finally {
    // Re-enable button after a moment
    setTimeout(() => {
      quickSaveBtn.disabled = false;
      quickSaveBtn.textContent = 'Save Link';
    }, 500);
  }
}

// Handle tag input for autocomplete
function handleTagInput(e) {
  const value = e.target.value;
  const tags = value.split(',');
  const currentTag = tags[tags.length - 1].trim().toLowerCase();

  if (currentTag.length < 2) {
    document.getElementById('tag-suggestions').classList.add('hidden');
    return;
  }

  const matches = allTags.filter(tag =>
    tag.startsWith(currentTag) && tag !== currentTag
  ).slice(0, 5);

  if (matches.length > 0) {
    const suggestionsDiv = document.getElementById('tag-suggestions');
    suggestionsDiv.innerHTML = matches.map(tag =>
      `<div class="tag-suggestion" data-tag="${tag}">${tag}</div>`
    ).join('');

    // Add click handlers
    suggestionsDiv.querySelectorAll('.tag-suggestion').forEach(el => {
      el.addEventListener('click', () => {
        const selectedTag = el.dataset.tag;
        const tags = value.split(',').map(t => t.trim()).filter(t => t);
        tags[tags.length - 1] = selectedTag;
        document.getElementById('link-tags').value = tags.join(', ') + ', ';
        suggestionsDiv.classList.add('hidden');
      });
    });

    suggestionsDiv.classList.remove('hidden');
  } else {
    document.getElementById('tag-suggestions').classList.add('hidden');
  }
}

// Handle detailed save
async function handleDetailedSave(e) {
  e.preventDefault();

  if (!currentTab || !currentWorkspaceId) {
    showError('Missing required data. Please refresh the extension.');
    return;
  }

  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const title = document.getElementById('link-title').value.trim();
    const tagsInput = document.getElementById('link-tags').value;
    const tags = tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    const selectedProjects = Array.from(document.getElementById('link-projects').selectedOptions)
      .map(opt => opt.value)
      .filter(id => id);

    const selectedGenres = Array.from(document.getElementById('link-genres').selectedOptions)
      .map(opt => opt.value)
      .filter(id => id);

    // Fetch metadata again to get favicon
    const metadata = await fetchLinkMetadata(currentTab.url);

    // Insert link
    const { data: link, error: linkError } = await supabase
      .from('links')
      .insert({
        workspace_id: currentWorkspaceId,
        url: currentTab.url,
        title: title || currentTab.title,
        tags: tags.length > 0 ? tags : null,
        favicon_url: metadata.favicon_url || currentTab.favIconUrl || null
      })
      .select()
      .single();

    if (linkError) throw linkError;

    // Add project associations
    if (selectedProjects.length > 0) {
      const projectLinks = selectedProjects.map(projectId => ({
        link_id: link.id,
        project_id: projectId
      }));

      const { error: projectError } = await supabase
        .from('project_links')
        .insert(projectLinks);

      if (projectError) console.error('Error adding project links:', projectError);
    }

    // Add genre associations
    if (selectedGenres.length > 0) {
      const genreLinks = selectedGenres.map(genreId => ({
        link_id: link.id,
        genre_id: genreId
      }));

      const { error: genreError } = await supabase
        .from('link_genres')
        .insert(genreLinks);

      if (genreError) console.error('Error adding genre links:', genreError);
    }

    showSuccess('Link saved successfully!');

    // Reset form and go back to simple view
    document.getElementById('link-tags').value = '';
    document.getElementById('link-projects').selectedIndex = -1;
    document.getElementById('link-genres').selectedIndex = -1;

    // Hide detailed form and show quick save button again
    document.getElementById('detailed-form').classList.add('hidden');
    document.getElementById('quick-save-btn').classList.remove('hidden');

    // Reload current tab
    await loadCurrentTab();

  } catch (error) {
    console.error('Error saving link:', error);
    showError('Failed to save link: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Link';
  }
}

// Handle logout
async function handleLogout() {
  await supabase.auth.signOut();
  currentUser = null;
  currentWorkspaceId = null;
  workspaces = [];
  showLogin();
}

// Show success message
function showSuccess(message) {
  const successDiv = document.getElementById('success-message');
  successDiv.textContent = message;
  successDiv.classList.remove('hidden');

  setTimeout(() => {
    successDiv.classList.add('hidden');
  }, 3000);
}

// Show error message
function showError(message) {
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');

  setTimeout(() => {
    errorDiv.classList.add('hidden');
  }, 5000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
