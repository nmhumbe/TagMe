console.log("Zoom content script loaded!");
let isExtensionEnabled = true;
let nameTagPopups = new Map(); // To keep track of injected popups

// Debounce function
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Function to create a name tag popup
function createNameTag(participantName, targetElement) {
    const nameTag = document.createElement('div');
    nameTag.className = 'meeting-context-ai-name-tag';
    nameTag.innerHTML = `<strong>${participantName}</strong><br/>Context card coming soon...`;
    document.body.appendChild(nameTag);

    // Positioning (initial, will be updated on hover)
    nameTag.style.position = 'absolute';
    nameTag.style.opacity = '0';
    nameTag.style.transition = 'opacity 200ms ease-in-out';
    nameTag.style.zIndex = '10000'; // Ensure it's above other elements

    // Store popup reference
    nameTagPopups.set(participantName, nameTag);

    return nameTag;
}

// Function to update name tag position and visibility
function updateNameTagPosition(nameTag, targetElement) {
    const rect = targetElement.getBoundingClientRect();
    nameTag.style.left = `${rect.left + window.scrollX}px`;
    nameTag.style.top = `${rect.top + window.scrollY - nameTag.offsetHeight - 5}px`; // 5px above
    nameTag.style.opacity = '1';
}

// Function to hide name tag
function hideNameTag(nameTag) {
    nameTag.style.opacity = '0';
}

// Function to remove all name tag popups
function removeAllNameTagPopups() {
    nameTagPopups.forEach(popup => popup.remove());
    nameTagPopups.clear();
}

// Function to detect Zoom participants
function detectZoomParticipants() {
    console.log("detectZoomParticipants called. Extension enabled:", isExtensionEnabled);
    if (!isExtensionEnabled) {
        removeAllNameTagPopups();
        return;
    }

    const currentParticipants = new Set();
    const participantNameElements = document.querySelectorAll('.participants-item__display-name');
    console.log("Found participant name elements:", participantNameElements.length);

    participantNameElements.forEach(element => {
        const participantName = element.textContent.trim();
        if (participantName) {
            console.log("Detected participant:", participantName);
            currentParticipants.add(participantName);

            if (!nameTagPopups.has(participantName)) {
                console.log("Creating name tag for:", participantName);
                const nameTag = createNameTag(participantName, element);
                element.addEventListener('mouseenter', () => updateNameTagPosition(nameTag, element));
                element.addEventListener('mouseleave', () => hideNameTag(nameTag));
            }
        }
    });

    // Remove popups for participants who have left
    nameTagPopups.forEach((popup, name) => {
        if (!currentParticipants.has(name)) {
            console.log("Removing name tag for:", name);
            popup.remove();
            nameTagPopups.delete(name);
        }
    });
}

const debouncedDetectZoomParticipants = debounce(detectZoomParticipants, 3000);

// MutationObserver to watch for changes in the DOM
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length || mutation.removedNodes.length) {
            debouncedDetectZoomParticipants();
        }
    });
});

// Start observing the document body for changes
observer.observe(document.body, { childList: true, subtree: true });

// Initial detection
debouncedDetectZoomParticipants();

// Listen for messages from the background script to update extension state
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "stateChanged") {
        isExtensionEnabled = request.isEnabled;
        console.log("Extension state changed to: ", isExtensionEnabled);
        if (!isExtensionEnabled) {
            removeAllNameTagPopups();
        } else {
            debouncedDetectZoomParticipants(); // Re-detect if enabled
        }
    }
});

// Get initial state from background script
chrome.runtime.sendMessage({ action: "getEnabledState" }, (response) => {
    isExtensionEnabled = response.isEnabled;
    console.log("Initial extension state: ", isExtensionEnabled);
    if (isExtensionEnabled) {
        debouncedDetectZoomParticipants();
    }
});

// Inject CSS for the name tag popup
const style = document.createElement('style');
style.textContent = `
.meeting-context-ai-name-tag {
    background-color: #fff;
    border: 1px solid #ccc;
    padding: 8px 12px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    z-index: 10000; /* High z-index to ensure visibility */
    font-family: Arial, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    pointer-events: none; /* Allows clicks to pass through to elements below */
    white-space: nowrap;
    opacity: 0;
    transition: opacity 200ms ease-in-out;
}
.meeting-context-ai-name-tag strong {
    font-size: 16px;
    font-weight: bold;
    display: block;
    margin-bottom: 2px;
}
`;
document.head.appendChild(style);
