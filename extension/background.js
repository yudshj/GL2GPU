//_______________________________EXTENSION POLYFILL_____________________________________
function sendMessage(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) { 
        chrome.tabs.sendMessage(tabs[0].id, message); 
    });
};

function listenForMessage(callback) {
    chrome.runtime.onMessage.addListener(callback);
};
//_____________________________________________________________________________________

chrome.action.onClicked.addListener(function (tab) {
    sendMessage({ action: "hydInjectClick" });
});

listenForMessage(function(request, sender, sendResponse) {
    var frameId;
    if (sender.frameId) {
        frameId = sender.frameId;
    } 
    else if (request.uniqueId) {
        frameId = request.uniqueId;
    }
    else {
        frameId = sender.id;
    }

    if (request.present === 2) {
        chrome.action.setIcon({tabId: sender.tab.id, path: {
            "16": "logo/logo-16.png",
            "48": "logo/logo-48.png",
            "128": "logo/logo-128.png"
        }});
    }
    else if (request.present === 0) {
        chrome.action.setIcon({tabId: sender.tab.id, path: {
            "16": "logo/logo-16-grey.png",
            "48": "logo/logo-48-grey.png",
            "128": "logo/logo-128-grey.png"
        }});
    }

    frameId += "";
});