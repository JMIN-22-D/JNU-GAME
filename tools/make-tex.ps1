# Packs the downloaded CC0 textures into www/assets/tex at a size that is
# sane for a phone: 512px, JPEG q72. The 1K originals are ~800KB each which
# would add 5MB to the single-file build for no visible gain when tiled.
#
# Sources (both CC0 - free for any use, no attribution required, which matters
# because this ships under the university's name):
#   grass  ambientCG  Grass004
#   sand   PolyHaven  coast_sand_04
#   dirt   PolyHaven  raked_dirt
#   bark   PolyHaven  bark_willow
#   plank  PolyHaven  plank_flooring
#   stone  PolyHaven  coral_stone_wall   (basalt-ish, suits a Jeju stone wall)
#
# ASCII only.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = "C:\Users\jeong\Desktop\" + [char]0xD559 + [char]0xC0DD + [char]0xBCF5 + [char]0xC9C0 + [char]0xACFC + " " + [char]0xD504 + [char]0xB85C + [char]0xC81D + [char]0xD2B8
$srcDirs = @("C:\Users\jeong\AppData\Local\Temp\tex", "C:\Users\jeong\AppData\Local\Temp\tex2")
$out  = Join-Path $root "www\assets\tex"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$SIZE = 512
$Q = 72

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$Q)

$names = @("grass", "sand", "dirt", "bark", "plank", "stone",
           "roof", "thatch", "darkwood", "path", "plaster")

foreach ($name in $names) {
    $p = $null
    foreach ($d in $srcDirs) {
        $try = Join-Path $d ($name + ".jpg")
        if (Test-Path $try) { $p = $try; break }
    }
    if (-not $p) { Write-Output ("  " + $name + ": MISSING"); continue }

    $img = [System.Drawing.Image]::FromFile($p)
    $bmp = New-Object System.Drawing.Bitmap($SIZE, $SIZE)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $SIZE, $SIZE)))
    $g.Dispose()
    $img.Dispose()

    $dest = Join-Path $out ($name + ".jpg")
    $bmp.Save($dest, $codec, $ep)
    $bmp.Dispose()
    Write-Output ("  " + $name.PadRight(7) + $SIZE + "x" + $SIZE + "   " + [math]::Round((Get-Item $dest).Length / 1KB, 1) + " KB")
}

$tot = (Get-ChildItem $out -Filter *.jpg | Measure-Object -Property Length -Sum).Sum
Write-Output ("total " + [math]::Round($tot / 1KB, 1) + " KB")
