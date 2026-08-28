// 정상일 때는 아무것도 띄우지 않습니다. 시연 중에 끼어들면 안 되니까요.
window.addEventListener("load", function () {
  setTimeout(function () {
    var problems = [];
    if (typeof window.storage !== "object") problems.push("앱 스크립트가 실행되지 않았습니다");
    if (__NEEDDEMO__ && !document.getElementById("demo-fab")) problems.push("데모 버튼이 만들어지지 않았습니다");
    if (problems.length) window.__show("[자가진단] " + problems.join(" / "));
    else console.log("[자가진단] 정상");
  }, 1500);
});
