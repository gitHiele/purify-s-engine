/**
 * This background script manages the URL redirection functionality for the
 * "Display Web Results" and "Both" settings.
 */

const navigationFilter = { url: [{ hostContains: 'google.com', pathPrefix: '/search' }] };

// --- Core Functionality ---

// This function handles the redirect to the "Web" results tab.
const handleRedirectNavigation = async (details) => {
    // Ignore navigations in sub-frames.
    if (details.frameId !== 0) return;

    const data = await chrome.storage.sync.get({ enabled: false, searchMode: 'removeAI' });

    // Only proceed if the extension is on and the mode requires a redirect.
    if (!data.enabled || (data.searchMode !== 'webParameter' && data.searchMode !== 'both')) {
        return;
    }

    const url = new URL(details.url);
    const sessionData = await chrome.storage.session.get(['lastQuery']);
    const lastQuery = sessionData.lastQuery;
    const currentQuery = url.searchParams.get('q');
    const currentUdm = url.searchParams.get('udm');

    // Ensure there's a query and it's a new search before redirecting.
    if (currentQuery && currentQuery !== lastQuery && currentUdm !== '14') {
        url.searchParams.set('udm', '14');
        await chrome.tabs.update(details.tabId, { url: url.href });
    }
};

// --- Listener Management ---

function enableRedirectListener() {
    if (!chrome.webNavigation.onBeforeNavigate.hasListener(handleRedirectNavigation)) {
        chrome.webNavigation.onBeforeNavigate.addListener(handleRedirectNavigation, navigationFilter);
        console.log("Purified SEngine: Redirect functionality enabled.");
    }
}

function disableRedirectListener() {
    if (chrome.webNavigation.onBeforeNavigate.hasListener(handleRedirectNavigation)) {
        chrome.webNavigation.onBeforeNavigate.removeListener(handleRedirectNavigation);
        console.log("Purified SEngine: Redirect functionality disabled.");
    }
}

// --- Event Listeners for Extension State ---

// Listen for messages from the popup to update the redirect listener state.
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'updateRedirectState') {
        if (request.enabled) {
            enableRedirectListener();
        } else {
            disableRedirectListener();
        }
    }
});

// A single function to initialize or update the extension's state.
const initializeState = async () => {
    const data = await chrome.storage.sync.get({ enabled: false, searchMode: 'removeAI' });
    const redirectActive = data.enabled && (data.searchMode === 'webParameter' || data.searchMode === 'both');

    if (redirectActive) {
        enableRedirectListener();
    } else {
        disableRedirectListener();
    }
};

// Initialize the state when the extension is installed or the browser starts.
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set default settings on first install.
        chrome.storage.sync.set({ enabled: false, searchMode: 'removeAI' });
        chrome.storage.session.set({ justInstalled: true });
        // Open the popup to welcome the user.
        chrome.action.openPopup();
    }
    initializeState();
});
chrome.runtime.onStartup.addListener(initializeState);

// This listener tracks the last search query to prevent re-redirecting on the same search.
chrome.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId === 0 && details.url.includes("google.com/search")) {
        const url = new URL(details.url);
        const currentQuery = url.searchParams.get('q');
        if (currentQuery) {
            chrome.storage.session.set({ lastQuery: currentQuery });
        }
    }
}, navigationFilter);
