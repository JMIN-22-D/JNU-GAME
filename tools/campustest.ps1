$ErrorActionPreference = "Stop"

# Swaps a campus.js test harness into www/index.html, so the preview pane
# (which only renders that one path) can actually run it. Restore with
# the index.SAFE copy this script makes.
#
# ASCII only: PowerShell 5.1 reads this file as ANSI.

$root    = "C:\Users\jeong\Desktop\" + [char]0xD559 + [char]0xC0DD + [char]0xBCF5 + [char]0xC9C0 + [char]0xACFC + " " + [char]0xD504 + [char]0xB85C + [char]0xC81D + [char]0xD2B8
$www     = Join-Path $root "www"
$idx     = Join-Path $www "index.html"
$scratch = $PSScriptRoot
$enc     = New-Object System.Text.UTF8Encoding($false)

# Only back up the REAL index.html. Running this twice in a row used to
# overwrite the backup with the harness itself, destroying the original.
$safe = Join-Path $scratch "index.SAFE"
$cur  = [System.IO.File]::ReadAllText($idx, [System.Text.Encoding]::UTF8)
if ($cur.Contains("campus harness")) {
    if (-not (Test-Path $safe)) { throw "index.html is already a harness and no backup exists - restore it first." }
    Write-Output "index.html is already a harness; keeping the existing backup."
} else {
    Copy-Item $idx $safe -Force
    Write-Output "backed up real index.html"
}

$css    = [System.IO.File]::ReadAllText((Join-Path $www "css\style.css"), [System.Text.Encoding]::UTF8)
$campus = [System.IO.File]::ReadAllText((Join-Path $www "js\campus.js"), [System.Text.Encoding]::UTF8)

$head = @'
<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>campus harness</title>
<style>
__CSS__
</style>
</head>
<body style="margin:0">
<script>
window.__errs = [];
window.addEventListener("error", function (e) { window.__errs.push(e.message + " @line " + e.lineno); });
</script>
<script>
// ---- app.js stand-ins ----
var coins = 0;
window.__toasts = [];
window.__saved = 0;
function characterSVG(form, o) { return '<svg width="46" height="46"><circle cx="23" cy="23" r="20" fill="gold"/></svg>'; }
function currentCharForm() { return "chubby"; }
function updateResourceBar() {}
function saveGame() { window.__saved++; }
function showEventToast(m) { window.__toasts.push(m); }
</script>
<script>
__CAMPUS__
</script>
</body></html>
'@

# Expose one frame of movement so the harness can drive it: the preview pane
# keeps the page hidden, so requestAnimationFrame never fires there.
# Injected into the harness copy only - the real campus.js has no test hook.
$campus = $campus.Replace(
    "window.isCampusWalkOpen = function () { return open; };",
    "window.isCampusWalkOpen = function () { return open; };`r`n    window.__campusStep = step;")

$page = $head.Replace("__CSS__", $css).Replace("__CAMPUS__", $campus)
[System.IO.File]::WriteAllText($idx, $page, $enc)

Write-Output ("harness written ({0:N0} bytes)" -f (Get-Item $idx).Length)
