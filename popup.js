document.addEventListener('DOMContentLoaded', function() {
    const enableToggle = document.getElementById('enableToggle');
    const toggleStatus = document.getElementById('toggleStatus');

    // Load initial state
    chrome.runtime.sendMessage({ action: "getEnabledState" }, (response) => {
        enableToggle.checked = response.isEnabled;
        toggleStatus.textContent = response.isEnabled ? "Enabled" : "Disabled";
    });

    // Handle toggle change
    enableToggle.addEventListener('change', () => {
        chrome.runtime.sendMessage({ action: "toggleEnabled" }, (response) => {
            toggleStatus.textContent = response.isEnabled ? "Enabled" : "Disabled";
        });
    });
});
