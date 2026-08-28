# Photo booth server. Read-only: it serves files and never receives data.
#
#   GET /photobooth.html , /assets/...  the booth app
#   GET /ip                             address the app puts in the QR code
#   GET /photos/<name>.jpg              a finished photo
#
# The booth app writes finished photos into photos\ itself, using the browser's
# folder access, so this script needs no upload route.
#
# IMPORTANT: adding an upload route here makes Windows Defender quarantine the
# file - an HTTP listener that receives data and writes files matches its web
# shell heuristic. Keep this read-only.
#
# Usage: powershell -ExecutionPolicy Bypass -File tools\lanserve.ps1
# Stop:  Ctrl+C
#
# ASCII only: PowerShell 5.1 reads this file as ANSI.

param([int]$Port = 5174)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$photos = Join-Path $root "photos"
if (-not (Test-Path $photos)) { New-Item -ItemType Directory -Force $photos | Out-Null }

$types = @{ ".html"="text/html; charset=utf-8"; ".js"="application/javascript; charset=utf-8";
            ".jpg"="image/jpeg"; ".png"="image/png"; ".json"="application/json" }

$ip = "127.0.0.1"
try {
  $c = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
       Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.IPAddressToString -ne '127.0.0.1' }
  foreach ($p in @('192.168.','10.','172.')) {
    $h = $c | Where-Object { $_.IPAddressToString.StartsWith($p) } | Select-Object -First 1
    if ($h) { $ip = $h.IPAddressToString; break }
  }
} catch {}

$l = New-Object System.Net.HttpListener
$onLan = $true
try { $l.Prefixes.Add("http://+:$Port/"); $l.Start() }
catch {
  $onLan = $false
  $l = New-Object System.Net.HttpListener
  $l.Prefixes.Add("http://localhost:$Port/")
  $l.Start()
}

Write-Output ""
Write-Output "  booth  : http://localhost:$Port/photobooth.html"
if ($onLan) { Write-Output "  phones : http://${ip}:$Port   (same Wi-Fi)   QR: ON" }
else        { Write-Output "  phones : unreachable - allow the admin prompt when starting" }
Write-Output "  photos : $photos"
Write-Output "  stop   : Ctrl+C"
Write-Output ""

while ($l.IsListening) {
  $ctx = $l.GetContext()
  $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
  if ($rel -eq '') { $rel = 'photobooth.html' }

  if ($rel -eq 'ip') {
    $ok = if ($onLan) { 'true' } else { 'false' }
    $j = [System.Text.Encoding]::UTF8.GetBytes('{"base":"http://' + $ip + ':' + $Port + '","lan":' + $ok + '}')
    $ctx.Response.ContentType = "application/json"
    $ctx.Response.ContentLength64 = $j.Length
    $ctx.Response.OutputStream.Write($j, 0, $j.Length)
    $ctx.Response.Close()
    continue
  }

  $f = [System.IO.Path]::GetFullPath((Join-Path $root ($rel -replace '/','\')))
  if ($f.StartsWith([System.IO.Path]::GetFullPath($root)) -and (Test-Path $f -PathType Leaf)) {
    $ext = [System.IO.Path]::GetExtension($f).ToLower()
    $t = $types[$ext]; if (-not $t) { $t = "application/octet-stream" }
    $b = [System.IO.File]::ReadAllBytes($f)
    $ctx.Response.ContentType = $t
    $ctx.Response.ContentLength64 = $b.Length
    $ctx.Response.OutputStream.Write($b, 0, $b.Length)
    Write-Output "  200 /$rel"
  } else { $ctx.Response.StatusCode = 404 }
  $ctx.Response.Close()
}
