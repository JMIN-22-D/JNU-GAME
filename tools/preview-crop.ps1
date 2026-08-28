# Composites a 16:9 test photo into the JNU frames the same way photobooth.html
# does (centre cover-crop per slot), so you can see how much of a webcam frame
# survives in each layout.
#
# Usage: powershell -ExecutionPolicy Bypass -File tools\preview-crop.ps1
# Writes assets\frames\_preview-4cut.png and _preview-3cut.png (safe to delete).
#
# ASCII only: PowerShell 5.1 reads this file as ANSI.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot

# a 1280x720 stand-in for the webcam frame: full-width bar, centre subject,
# and a dashed box marking the app's safe-area guide
$photo = New-Object System.Drawing.Bitmap 1280, 720
$pg = [System.Drawing.Graphics]::FromImage($photo)
$pg.Clear([System.Drawing.Color]::FromArgb(40, 90, 120))

$edge = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 70, 90))
$pg.FillRectangle($edge, 0, 300, 1280, 120)          # spans the whole width
$pg.FillEllipse([System.Drawing.Brushes]::White, 545, 170, 190, 190)   # head
$pg.FillRectangle([System.Drawing.Brushes]::White, 500, 380, 280, 340) # body

# safe guide = narrowest slot ratio (313/479)
$gw = [int](720 * 313 / 479)
$gx = [int]((1280 - $gw) / 2)
$dash = New-Object System.Drawing.Pen ([System.Drawing.Color]::Yellow), 5
$dash.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$pg.DrawRectangle($dash, $gx, 0, $gw, 719)
$pg.Dispose()

$frames = @(
  @{ name = "4cut"; file = "jnu-4cut-trim.png"; slots = @(
       @(90,328,313,443), @(423,328,313,443), @(90,789,313,479), @(423,789,313,479)) },
  @{ name = "3cut"; file = "jnu-3cut-trim.png"; slots = @(
       @(72,276,558,353), @(72,647,558,356), @(72,1020,558,356)) }
)

foreach ($f in $frames) {
  $bmp = New-Object System.Drawing.Bitmap (Join-Path $root ("assets\frames\" + $f.file))
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  foreach ($s in $f.slots) {
    $sx, $sy, $sw, $sh = $s[0], $s[1], $s[2], $s[3]
    $ratio = $sw / $sh

    # same centre cover-crop as coverCrop() in the app
    if (($photo.Width / $photo.Height) -gt $ratio) {
      $ch = $photo.Height; $cw = $photo.Height * $ratio
    } else {
      $cw = $photo.Width;  $ch = $photo.Width / $ratio
    }
    $cx = ($photo.Width - $cw) / 2
    $cy = ($photo.Height - $ch) / 2

    $dst = New-Object System.Drawing.Rectangle $sx, $sy, $sw, $sh
    $src = New-Object System.Drawing.RectangleF $cx, $cy, $cw, $ch
    $g.DrawImage($photo, $dst, $src.X, $src.Y, $src.Width, $src.Height,
                 [System.Drawing.GraphicsUnit]::Pixel)
  }

  $g.Dispose()
  $out = Join-Path $root ("assets\frames\_preview-" + $f.name + ".png")
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("wrote " + $out)
}
$photo.Dispose()
