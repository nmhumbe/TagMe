let isEnabled = true; // Default state: Enabled

// TODO: Replace with your actual Google Custom Search API Key and Custom Search Engine ID
const GOOGLE_CSE_API_KEY = "AIzaSyAvZWqVQ7rFwo5Dziq4zcBke2NDTcDe3yA";
const GOOGLE_CSE_ID = "601248ad5d2784965";

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ isEnabled });
});

// Function to search LinkedIn using Google Custom Search API
async function searchLinkedIn(name, company = '') {
    const query = `${name} ${company} LinkedIn`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=1`;
    console.log(`Background script: searchLinkedIn - Query: ${query}, URL: ${url}`);
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Background script: searchLinkedIn - HTTP error! Status: ${response.status}`);
            const errorText = await response.text();
            console.error(`Background script: searchLinkedIn - Error response: ${errorText}`);
            return null;
        }
        const data = await response.json();
        console.log(`Background script: searchLinkedIn - Raw API response for ${name}:`, data);
        
        if (data.items && data.items.length > 0) {
            const item = data.items[0];
            console.log(`Background script: searchLinkedIn - Found item: Link: ${item.link}, Title: ${item.title}, Snippet: ${item.snippet}`);
            const confidence = calculateConfidence(name, item.title, item.snippet, item.link);
            console.log(`Background script: LinkedIn confidence score for ${name}: ${confidence}`);
            // Basic confidence check: Look for "linkedin.com/in/" in the URL
            if (item.link.includes("linkedin.com/in/") && confidence >= 80) {
                console.log(`Background script: LinkedIn link accepted for ${name}: ${item.link}`);
                return item.link;
            } else {
                console.log(`Background script: LinkedIn link rejected for ${name} (confidence: ${confidence}, link: ${item.link})`);
            }
        } else {
            console.log(`Background script: searchLinkedIn - No items found for ${name}`);
        }
    } catch (error) {
        console.error("Background script: searchLinkedIn - Fetch error:", error);
    }
    return null;
}

// Function to search Twitter/X using Google Custom Search API
async function searchTwitter(name, company = '') {
    const query = `${name} ${company} Twitter`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=1`;
    console.log(`Background script: searchTwitter - Query: ${query}, URL: ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Background script: searchTwitter - HTTP error! Status: ${response.status}`);
            const errorText = await response.text();
            console.error(`Background script: searchTwitter - Error response: ${errorText}`);
            return null;
        }
        const data = await response.json();
        console.log(`Background script: searchTwitter - Raw API response for ${name}:`, data);

        if (data.items && data.items.length > 0) {
            const item = data.items[0];
            console.log(`Background script: searchTwitter - Found item: Link: ${item.link}, Title: ${item.title}, Snippet: ${item.snippet}`);
            const confidence = calculateConfidence(name, item.title, item.snippet, item.link);
            console.log(`Background script: Twitter confidence score for ${name}: ${confidence}`);
            // Basic confidence check: Look for "twitter.com/" or "x.com/" in the URL
            if ((item.link.includes("twitter.com/") || item.link.includes("x.com/")) && confidence >= 80) {
                console.log(`Background script: Twitter link accepted for ${name}: ${item.link}`);
                return item.link;
            } else {
                console.log(`Background script: Twitter link rejected for ${name} (confidence: ${confidence}, link: ${item.link})`);
            }
        } else {
            console.log(`Background script: searchTwitter - No items found for ${name}`);
        }
    } catch (error) {
        console.error("Background script: searchTwitter - Fetch error:", error);
    }
    return null;
}

// Function to calculate confidence score
function calculateConfidence(name, title, snippet, link) {
    let score = 0;
    const lowerName = name.toLowerCase();
    const lowerTitle = title ? title.toLowerCase() : '';
    const lowerSnippet = snippet ? snippet.toLowerCase() : '';
    const lowerLink = link ? link.toLowerCase() : '';

    // Name match in title or snippet
    if (lowerTitle.includes(lowerName)) {
        score += 40;
    }
    if (lowerSnippet.includes(lowerName)) {
        score += 30;
    }

    // High score for name in LinkedIn/Twitter URL directly
    // Remove spaces from name for URL matching
    const nameWithoutSpaces = lowerName.replace(/\s/g, '');
    if ((lowerLink.includes("linkedin.com/in/") || lowerLink.includes("twitter.com/") || lowerLink.includes("x.com/")) && lowerLink.includes(nameWithoutSpaces)) {
        score += 50; // Significant boost
    }

    // Check for common professional keywords to increase confidence (example)
    if (lowerTitle.includes("profile") || lowerSnippet.includes("profile")) {
        score += 10;
    }

    return score;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleEnabled") {
        isEnabled = !isEnabled;
        chrome.storage.sync.set({ isEnabled }, () => {
            sendResponse({ isEnabled });
        });
        // Inform all active tabs about the state change
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                if (tab.url && tab.url.includes("zoom.us")) {
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
    } else if (request.action === "getProfileData") {
        const participantName = request.name;
        console.log("Background script: Received request for profile data for:", participantName);

        (async () => {
            const linkedInUrl = await searchLinkedIn(participantName);
            console.log("Background script: LinkedIn URL found for", participantName, ":", linkedInUrl);
            const twitterUrl = await searchTwitter(participantName);
            console.log("Background script: Twitter URL found for", participantName, ":", twitterUrl);

            const profileData = {
                jobTitle: "", // These will eventually come from profile scraping/APIs
                company: "",   // For now, they remain empty until actual data fetching is integrated.
                linkedInUrl: linkedInUrl,
                twitterUrl: twitterUrl
            };
            console.log("Background script: Sending profile data response for:", participantName, profileData);
            sendResponse({ profileData });
        })();
        return true; // Indicates an asynchronous response
    }
});
