# Minimal static web server for www/ - no Node, no Python needed.
#
# Kakao Roadview authenticates by domain, and a file:// page has no domain,
# so double-clicking the HTML will never load roadview. Serving over
# http://localhost:5173 gives it a real origin to check.
#
# Usage:   powershell -ExecutionPolicy Bypass -File tools\serve.ps1
# Stop:    Ctrl+C
#
# ASCII only: PowerShell 5.1 reads this file as ANSI.

param(
    [int]$Port = 5173
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$www  = Join-Path $root "www"

if (-not (Test-Path $www)) { throw "www folder not found at $www" }

$mime = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".webmanifest" = "application/manifest+json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff2" = "font/woff2"
    ".woff" = "font/woff"
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Output ""
    Write-Output "Could not bind $prefix"
    Write-Output "Try a different port:   powershell -ExecutionPolicy Bypass -File tools\serve.ps1 -Port 8080"
    Write-Output "Or run this window as Administrator."
    throw
}

Write-Output ""
Write-Output "  serving : $www"
Write-Output "  open    : $prefix"
Write-Output "  stop    : Ctrl+C"
Write-Output ""

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $res = $ctx.Response

        $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "index.html" }
        $rel = $rel -replace '/', '\'

        $path = Join-Path $www $rel

        # keep requests inside www/
        $full = [System.IO.Path]::GetFullPath($path)
        $base = [System.IO.Path]::GetFullPath($www)
        if (-not $full.StartsWith($base, [StringComparison]::OrdinalIgnoreCase)) {
            $res.StatusCode = 403
            $res.Close()
            continue
        }

        if (Test-Path $full -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($full).ToLower()
            $type = $mime[$ext]
            if (-not $type) { $type = "application/octet-stream" }

            $bytes = [System.IO.File]::ReadAllBytes($full)
            $res.ContentType = $type
            $res.Headers.Add("Cache-Control", "no-store")
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Output ("  200  /{0}" -f ($rel -replace '\\', '/'))
        } else {
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - not found: /$rel")
            $res.StatusCode = 404
            $res.ContentType = "text/plain; charset=utf-8"
            $res.ContentLength64 = $msg.Length
            $res.OutputStream.Write($msg, 0, $msg.Length)
            Write-Output ("  404  /{0}" -f ($rel -replace '\\', '/'))
        }
        $res.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
