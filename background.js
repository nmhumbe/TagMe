let isEnabled = true; // Default state: Enabled

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ isEnabled });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleEnabled") {
        isEnabled = !isEnabled;
        chrome.storage.sync.set({ isEnabled }, () => {
            sendResponse({ isEnabled });
        });
        // Inform all active tabs about the state change
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                if (tab.url && (tab.url.includes("zoom.us") || tab.url.includes("meet.google.com"))) {
                    chrome.tabs.sendMessage(tab.id, { action: "stateChanged", isEnabled });
                }
            });
        });
        return true; // Indicates an asynchronous response
    } else if (request.action === "getEnabledState") {
        chrome.storage.sync.get(["isEnabled"], (result) => {
            sendResponse({ isEnabled: result.isEnabled !== undefined ? result.isEnabled : true });
        });
        return true; // Indicates an asynchronous response
    }
});
