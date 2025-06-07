/**
 * This content script runs at the very beginning of page load (`document_start`).
 * Its primary job is to delete the AI Overview element as soon as it's detected.
 */

// This function contains the logic to hide the AI Overview.
function findAndHideAiOverview() {
    var AIheaders = document.querySelectorAll("h1");
    var AIparentElement = document.querySelector(".M8OgIe");
    var AIparentElementPreLoad = document.querySelector(".rEow3c");

    if (
        AIparentElementPreLoad &&
        AIparentElementPreLoad.firstChild.tagName === "H1" &&
        AIparentElementPreLoad.firstChild.textContent.trim() === "Search Results"
    ) {
        AIparentElementPreLoad.style.display = "none";
        return true; 
    } else if (
        AIparentElement &&
        AIparentElement.firstChild.tagName === "H1" &&
        AIparentElement.firstChild.textContent.trim() === "Search Results"
    ) {
        AIparentElement.style.display = "none";
        return true; 
    } else {
       
        let found = false;
        Array.from(AIheaders).forEach(function (header) {
            if (header.textContent.trim() === "AI Overview") {
                let parent = header.parentNode;
                for (let i = 0; i < 5; i++) {
                    if (parent && parent.style) {
                        parent.style.display = "none";
                        found = true;
                        break;
                    }
                    if (!parent) break;
                    parent = parent.parentNode;
                }
            }
        });
        return found;
    }
}


// Function to enable or disable the AI overview removal based on settings.
const applySettings = (settings) => {
    if (settings.enabled && (settings.searchMode === 'removeAI' || settings.searchMode === 'both')) {
        const observer = new MutationObserver((mutations, obs) => {
            if (findAndHideAiOverview()) {
                obs.disconnect();
            }
        });

        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true,
        });
        findAndHideAiOverview();
    }
};

// Immediately get the settings and apply them on page load.
chrome.storage.sync.get({ enabled: false, searchMode: 'removeAI' }, applySettings);

// Listen for changes in settings from storage and re-apply them by reloading.
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        chrome.storage.sync.get({ enabled: false, searchMode: 'removeAI' }, (settings) => {
            // Reload to apply the new state cleanly.
            window.location.reload();
        });
    }
});
