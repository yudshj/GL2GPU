// Initialize the frameTimes (FT) array
var frameTimes = [];
var __last_time = 0;
var uk7ePook = 30;  // measure FT after `uk7ePook` frames

// Get the parameters in the URL
var urlParams = new URLSearchParams(window.location.search);

// Get the value of replay_delay from the parameter and convert it to an integer
var _turbo = parseInt(urlParams.get('turbo'), 10) || -1;
var replayDelay = _turbo;

var maxFrames = parseInt(urlParams.get('maxFrames'), 10) || 100;
var uniqueId = urlParams.get('id') || '<null id>';

// Get the id parameter, or use the default value '<null id>' if it is not available

// Get the value of numObjects from the argument and convert it to an integer
var numObjects = parseInt(urlParams.get('numObjects'), 10);

// Sends a POST request to a specified API endpoint
async function sendGl2gpuData(url, additionalData) {
    // Check if the GL2GPU object is available in the window object
    const type = (window.GL2GPU) ? 'GL2GPU' : 'WebGL';
    // Preparing the data to be sent
    let data = {
        url: window.location.href,
        type: type,
        id: uniqueId,
        numObjects: numObjects,
        maxFrames: maxFrames,
        turbo: _turbo,
        additionalData: additionalData,
        frameTimes: frameTimes,
    };
    let Sum = 0;
    for (let i = 0; i < frameTimes.length; i++) {
        Sum += frameTimes[i];
    }
    let average = Sum / frameTimes.length;
    if (uniqueId === 'test' || uniqueId === '<null id>') {
        const info = "Average frame time: " + average + "ms";
        // document.title = info;
        alert(info);
        return;
    }
    console.log("Data to send:");
    console.log(data);
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (window.opener && window.opener !== window) {
                const dataToSend = { status: 'ok', avg_ft: average };
                window.opener.postMessage("<GL2GPU>" + JSON.stringify(dataToSend), '*');  // Ctrl-F: FPS returned
                return '<sent to opener>';
            } else {
                console.log('This page is not embedded in an iframe or frame.');
            }
            return response.json();
        })
        .then(resp => {
            if (resp === '<sent to opener>') {
                return;
            }
            console.log("Response:", resp);
            if (resp.status === "success") {
                alert(average + '  Success!\n' + resp.message);
            } else {
                alert('Failed: ' + resp.message);
            }
        })
        .catch((error) => {
            alert('Error: ' + error);
        });
}

function ahghSeededRandom(seed) {
    const a = 16807; // multiplier
    const m = 2147483647; // 2**31 - 1 (a prime number)

    seed = seed % m;
    if (seed < 0) seed += m;

    return function () {
        seed = (seed * a) % m;
        return seed / m;
    };
}

// Override Math.random
Math.random = ahghSeededRandom(42);
