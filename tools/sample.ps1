# Samples the baked checkerboard tones and Harbang's stone colour, so the
# knockout can tell them apart. ASCII only.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = "C:\Users\jeong\Desktop\" + [char]0xD559 + [char]0xC0DD + [char]0xBCF5 + [char]0xC9C0 + [char]0xACFC + " " + [char]0xD504 + [char]0xB85C + [char]0xC81D + [char]0xD2B8
$img = [System.Drawing.Image]::FromFile((Join-Path $root "Gemini_Generated_Image_2ki3ag2ki3ag2ki3.png"))
$bmp = New-Object System.Drawing.Bitmap($img)

Write-Output "=== checker tones (top-left grid) ==="
$tones = @{}
for ($y = 5; $y -lt 160; $y += 3) {
    for ($x = 5; $x -lt 160; $x += 3) {
        $c = $bmp.GetPixel($x, $y)
        $r = [int]([math]::Round($c.R / 8) * 8)
        $g = [int]([math]::Round($c.G / 8) * 8)
        $b = [int]([math]::Round($c.B / 8) * 8)
        $k = "$r/$g/$b"
        if ($tones.ContainsKey($k)) { $tones[$k] = $tones[$k] + 1 } else { $tones[$k] = 1 }
    }
}
$tones.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 6 | ForEach-Object {
    Write-Output ("  " + $_.Key + "   x" + $_.Value)
}

Write-Output ""
Write-Output "=== Harbang stone samples ==="
$pts = @(@(2380,700), @(2450,760), @(2300,500), @(2520,900), @(2420,420), @(2350,300))
foreach ($p in $pts) {
    $c = $bmp.GetPixel($p[0], $p[1])
    $mx = [math]::Max([math]::Max($c.R, $c.G), $c.B)
    $mn = [math]::Min([math]::Min($c.R, $c.G), $c.B)
    $sp = $mx - $mn
    Write-Output ("  (" + $p[0] + "," + $p[1] + ")  R=" + $c.R + " G=" + $c.G + " B=" + $c.B + "  spread=" + $sp)
}

Write-Output ""
Write-Output "=== column profile: where are the gaps between characters? ==="
# count non-background-ish pixels per column band
$H = $bmp.Height
for ($x = 0; $x -lt $bmp.Width; $x += 64) {
    $hits = 0
    for ($y = 150; $y -lt 1200; $y += 12) {
        $c = $bmp.GetPixel($x, $y)
        $mx = [math]::Max([math]::Max($c.R, $c.G), $c.B)
        $mn = [math]::Min([math]::Min($c.R, $c.G), $c.B)
        # background is neutral grey near 112 or near 185
        $neutral = (($mx - $mn) -le 10)
        $isChecker = $neutral -and ((([math]::Abs($c.R - 112)) -le 16) -or (([math]::Abs($c.R - 185)) -le 16))
        if (-not $isChecker) { $hits++ }
    }
    Write-Output ("  x=" + $x + "  content=" + $hits)
}

$bmp.Dispose(); $img.Dispose()
