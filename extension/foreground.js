//_______________________________EXTENSION POLYFILL_____________________________________
var uniqueId = new Date().getTime();
function sendMessage(message, cb) {
    message["uniqueId"] = uniqueId;
    chrome.runtime.sendMessage(message, function (response) {
        if (cb) {
            cb(response);
        }
    });
};

function listenForMessage(callback) {
    chrome.runtime.onMessage.addListener(callback);
};
//_____________________________________________________________________________________

const hydLoadKey = 'HYD_LOAD_KEY';

if (!sessionStorage.getItem(hydLoadKey)) {
    sessionStorage.setItem(hydLoadKey, 'off');
}

console.log("hydLoadKey is", sessionStorage.getItem(hydLoadKey));

// Check for existing canvas a bit after the end of the loading.
document.addEventListener("DOMContentLoaded", function () {
    if (sessionStorage.getItem(hydLoadKey) === 'on') {
        // Inform the extension that canvases are present (2 means injection has been done, 1 means ready to inject)
        sendMessage({ present: 2 });
    } else {
        sendMessage({ present: 0 });
    }
});

listenForMessage(function (message) {
    var action = message.action;
    // Only answer to actions.
    if (!action) {
        return;
    }

    // We need to reload to inject the scripts.
    if (action === "hydInjectClick") {
        const cur = sessionStorage.getItem(hydLoadKey);
        const nxt = cur === 'on' ? 'off' : 'on';
        sessionStorage.setItem(hydLoadKey, nxt);
        // Delay for all frames.
        setTimeout(function () { window.location.reload(); }, 50);
        return;
    }
});