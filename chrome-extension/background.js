// Background service worker for Chrome extension

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from sidepanel and callback pages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({
          url: tabs[0].url,
          title: tabs[0].title,
          favIconUrl: tabs[0].favIconUrl
        });
      }
    });
    return true; // Keep channel open for async response
  }

  // Relay authentication messages from callback page to extension
  if (request.type === 'EXTENSION_AUTH_SUCCESS') {
    console.log('Auth success message received in background script');
    // Message will be automatically relayed to all listeners
    sendResponse({ received: true });
    return true;
  }
});
