/* ============================================================
   BUGFISH — forward.js
   Countdown on the forwarder pages (index.html, 404.html), then
   forward to bugfish.eu. Time only counts while the tab is
   visible; following any link stops the countdown.
   ============================================================ */
(function () {
  var TARGET = "https://bugfish.eu/";
  var DURATION = 5000;
  var CIRCUMFERENCE = 2 * Math.PI * 50;   // r of .dial-arc

  var num = document.getElementById("count");
  var arc = document.getElementById("arc");
  var left, last, timer;

  function paint() {
    var secs = String(Math.ceil(left / 1000));
    if (num.textContent !== secs) {
      num.textContent = secs;
      num.classList.remove("tick");
      void num.offsetWidth;                 // restart the tick animation
      num.classList.add("tick");
    }
    // The arc drains clockwise, like a clock hand sweeping it away.
    arc.style.strokeDashoffset = (-CIRCUMFERENCE * (1 - left / DURATION)).toFixed(2);
    arc.style.visibility = left > 0 ? "" : "hidden";
  }

  function step() {
    var now = performance.now();
    if (last !== undefined && !document.hidden) left -= now - last;
    last = now;
    if (left <= 0) {
      left = 0;
      stop();
      location.replace(TARGET);             // keeps the forwarder out of the history
    }
    paint();
  }

  function stop() { clearInterval(timer); }

  function start() {
    stop();
    left = DURATION;
    last = undefined;
    paint();
    timer = setInterval(step, 100);         // .dial-arc eases between the steps
  }

  // Do not count the time the tab spent hidden.
  document.addEventListener("visibilitychange", function () { last = undefined; });

  // A footer link (or the target link) beats the timer.
  document.addEventListener("click", function (e) {
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.target.closest("a")) stop();
  });

  // Back button: the page may come back from the back/forward cache, so start over.
  window.addEventListener("pageshow", function (e) { if (e.persisted) start(); });

  start();
})();
