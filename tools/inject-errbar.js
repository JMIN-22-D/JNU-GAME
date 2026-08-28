(function () {
  function show(msg) {
    var bar = document.getElementById("__errbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "__errbar";
      bar.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:2147483647;" +
        "background:#b3261e;color:#fff;font:12px/1.5 monospace;padding:8px 30px 8px 10px;" +
        "white-space:pre-wrap;word-break:break-all;max-height:45vh;overflow:auto;";
      var x = document.createElement("button");
      x.textContent = "X";
      x.style.cssText = "position:absolute;right:6px;top:6px;background:none;border:1px solid #fff;" +
        "color:#fff;border-radius:4px;cursor:pointer;font:11px monospace;padding:1px 6px;";
      x.onclick = function () { bar.remove(); };
      bar.appendChild(x);
      (document.body || document.documentElement).appendChild(bar);
    }
    var p = document.createElement("div");
    p.textContent = msg;
    bar.appendChild(p);
  }
  window.__show = show;
  window.addEventListener("error", function (e) {
    show("[오류] " + e.message + "  (" + e.lineno + "행)");
  });
  window.addEventListener("unhandledrejection", function (e) {
    show("[오류] " + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });
})();
