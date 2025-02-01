// Copyright 2004-present Facebook. All Rights Reserved.

// Licensed under the Apache License, Version 2.0 (the "License"); you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

var Benchmark = (function() {
    var count = 0;
    var frame = 0;
    var backoff = 0;
    var num = 1;
    var w, h;
    var inc;
    var dec;
    var desc;
    var tid;
    var nodel;
    var targetfps;
    var timenear;
    var testover;
    var slowframes;
    var demo;
    var runtest = false;

    var Benchmark = {};

    function setup(criteria) {
      const urlSearch = new URLSearchParams(window.location.search);
      const numObjects = parseInt(urlSearch.get('numObjects'));

      inc = criteria.inc;
      dec = criteria.dec;
      num = criteria.num || num;
      demo = criteria.demo || null;
      tid = criteria.tid;
      w = criteria.w || Browser.winsize[0];
      h = criteria.h || Browser.winsize[1];
      nodel = criteria.nodel;
      console.log(window.location.href);
      count = 0;
      frame = 0;
      backoff = 0;
      slowframes = 0;
      targetfps = criteria.tfps ? criteria.tfps : 30;
      runtest = true;
      Benchmark.name = tid;
      for (count = 0; count < numObjects; count++) {
        inc(count, w, h);
      }
    }

    function tick() {
      if (uk7ePook === 0) {
        frameTimes.push(performance.now() - __last_time);
        if (frameTimes.length === maxFrames) {
          sendGl2gpuData("/api/upload.php", null);
        }
      } else {
        uk7ePook--;
      }
      __last_time = performance.now();

      // if (runtest && inc && dec && (frame++ > 2)) {
      //   frame = 0;
      //   var fps = Tick.fps();
      //   // for (var i = 0; i < num; i++) {
      //   //   inc(count++, w, h);
      //   // }
      // }
    }

    function getCurrentCount() {
      return count;
    }

    function reset() {
      Benchmark.name = null;
      runtest = false;
    }

    Benchmark.reset = reset;
    Benchmark.tick = tick;
    Benchmark.setup = setup;
    Benchmark.count = getCurrentCount;
    return Benchmark;
  })();
