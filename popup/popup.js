// Get the DOM elements
const toggleSwitch = document.getElementById('toggleSwitch');
const successOverlay = document.getElementById('install-success-overlay');
const closeOverlayButton = document.getElementById('close-overlay-btn');
const developerLink = document.getElementById('developer-link');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notification-text');
const searchModeSelect = document.getElementById('search-mode-select');
const descriptionElement = document.querySelector('.description p');
let notificationTimeout;

/**
 * Updates the description text based on the selected mode.
 * @param {string} mode The selected search mode.
 */
function updateDescription(mode) {
    const descriptions = {
        removeAI: 'Removes the AI Overview from search results.',
        webParameter: "Switches search to the 'Web' results tab.",
        both: 'Removes AI Overview & uses "Web" results.'
    };
    descriptionElement.textContent = descriptions[mode] || descriptions.removeAI;
}

/**
 * Shows a notification that appears and fades out.
 * @param {string} message The message to display.
 * @param {string} state 'on' or 'off' to style the notification.
 */
function showNotification(message, state) {
    clearTimeout(notificationTimeout);
    notificationText.textContent = message;
    notification.className = `notification-container notification-${state} show`;
    notificationTimeout = setTimeout(() => {
        notification.classList.remove('show');
    }, 2000); 
}

/**
 * Applies changes to the current tab based on the new settings.
 * @param {string} mode The newly selected search mode.
 */
async function applyImmediateChanges(mode) {
    try {
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (currentTab?.url?.includes("google.com/search")) {
            const url = new URL(currentTab.url);
            const shouldHaveUdm = (mode === 'webParameter' || mode === 'both');
            const hasUdm = url.searchParams.has('udm');

            // If the URL's "Web" parameter state doesn't match the new setting, update it.
            if (shouldHaveUdm && !hasUdm) {
                url.searchParams.set('udm', '14');
                await chrome.tabs.update(currentTab.id, { url: url.href });
            } else if (!shouldHaveUdm && hasUdm) {
                url.searchParams.delete('udm');
                await chrome.tabs.update(currentTab.id, { url: url.href });
            } else {
                // If the URL is already correct, just reload to apply content script changes.
                await chrome.tabs.reload(currentTab.id);
            }
        }
    } catch (error) {
        console.error("Could not apply new setting to tab:", error);
    }
}

// --- Event Listeners ---

// Initialize the popup when the DOM is loaded.
document.addEventListener('DOMContentLoaded', async () => {
    // Show install success message if it's the first time.
    const sessionData = await chrome.storage.session.get('justInstalled');
    if (sessionData.justInstalled) {
        successOverlay.classList.remove('hidden');
        chrome.storage.session.remove('justInstalled');
    }

    // Get the current settings and update the UI.
    const settings = await chrome.storage.sync.get({ enabled: false, searchMode: 'removeAI' });
    toggleSwitch.checked = settings.enabled;
    searchModeSelect.value = settings.searchMode;
    updateDescription(settings.searchMode);
    searchModeSelect.disabled = !settings.enabled;
});

// Handle the main on/off switch.
toggleSwitch.addEventListener('change', async () => {
    const isEnabled = toggleSwitch.checked;
    const currentSettings = await chrome.storage.sync.get({ searchMode: 'removeAI' });

    searchModeSelect.disabled = !isEnabled;
    await chrome.storage.sync.set({ enabled: isEnabled });

    // Update the background redirect listener state.
    const redirectActive = isEnabled && (currentSettings.searchMode === 'webParameter' || currentSettings.searchMode === 'both');
    chrome.runtime.sendMessage({ action: 'updateRedirectState', enabled: redirectActive });

    // Show visual feedback.
    const message = isEnabled ? 'Purified SEngine Enabled' : 'Purified SEngine Disabled';
    showNotification(message, isEnabled ? 'on' : 'off');
    
    // If turned off, revert the current page.
    if (!isEnabled) {
        try {
            const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (currentTab?.url?.includes("google.com/search")) {
                await chrome.tabs.reload(currentTab.id);
            }
        } catch (error) {
            console.error("Could not revert tab:", error);
        }
    }
});

// Handle changes to the settings dropdown.
searchModeSelect.addEventListener('change', async () => {
    const selectedMode = searchModeSelect.value;
    const isEnabled = toggleSwitch.checked;
    
    updateDescription(selectedMode);
    await chrome.storage.sync.set({ searchMode: selectedMode });
    
    // Update the background redirect listener state.
    const redirectActive = isEnabled && (selectedMode === 'webParameter' || selectedMode === 'both');
    chrome.runtime.sendMessage({ action: 'updateRedirectState', enabled: redirectActive });

    if (isEnabled) {
        applyImmediateChanges(selectedMode);
    }
});

// Close button for the installation success message.
closeOverlayButton.addEventListener('click', () => {
  successOverlay.classList.add('hidden');
});

// Link to my GitHub :D
developerLink.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://github.com/gitHiele'});
});
