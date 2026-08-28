# Makes the two frames the same size and aspect ratio.
#
# The two artworks are genuinely different shapes (826x1534 = 0.538 and
# 703x1657 = 0.424), and the trimmed files already sit on the exact content
# bounds - there is no spare margin to crop. Cropping to a common ratio would
# cut into the design, and stretching would distort it.
#
# So each frame is scaled to fit one shared canvas and centred, with the
# leftover filled using the frame's own border colour. Slot coordinates are
# transformed the same way and printed, ready to paste into FRAMES.
#
# Usage: powershell -ExecutionPolicy Bypass -File tools\match-frames.ps1
#
# ASCII only: PowerShell 5.1 reads this file as ANSI.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root "assets\frames"

# Shared canvas. Ratio 0.48 sits between the two so neither needs much padding.
$OUT_W = 800
$OUT_H = 1666

$frames = @(
  @{ key = "jnu4"; src = "jnu-4cut-trim.png"; out = "jnu-4cut-fit.png"
     slots = @(@(90,328,313,443,9), @(423,328,313,443,9),
               @(90,789,313,479,9), @(423,789,313,479,9)) },
  @{ key = "jnu3"; src = "jnu-3cut-trim.png"; out = "jnu-3cut-fit.png"
     slots = @(@(72,276,558,353,8), @(72,647,558,356,8), @(72,1020,558,356,8)) }
)

Write-Output ""
Write-Output ("공통 캔버스 {0} x {1}   비율 {2}" -f $OUT_W, $OUT_H, [math]::Round($OUT_W/$OUT_H,4))
Write-Output ""

foreach ($f in $frames) {
  $src = New-Object System.Drawing.Bitmap (Join-Path $dir $f.src)

  # scale to fit, keep the artwork undistorted
  $scale = [math]::Min($OUT_W / $src.Width, $OUT_H / $src.Height)
  $dw = [int][math]::Round($src.Width * $scale)
  $dh = [int][math]::Round($src.Height * $scale)
  $ox = [int][math]::Round(($OUT_W - $dw) / 2)
  $oy = [int][math]::Round(($OUT_H - $dh) / 2)

  $out = New-Object System.Drawing.Bitmap $OUT_W, $OUT_H,
         ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  # 여백은 단색으로 채우면 테두리 색과 미묘하게 어긋난다.
  # 가장자리 1px 을 늘려 채우면 실제 테두리가 그대로 이어져 티가 안 난다.
  if ($ox -gt 0) {
    $left  = New-Object System.Drawing.Rectangle 0, 0, 1, $src.Height
    $right = New-Object System.Drawing.Rectangle ($src.Width - 1), 0, 1, $src.Height
    $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, $oy, $ox, $dh),
                 $left.X, $left.Y, $left.Width, $left.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $g.DrawImage($src, (New-Object System.Drawing.Rectangle ($ox + $dw), $oy, ($OUT_W - $ox - $dw), $dh),
                 $right.X, $right.Y, $right.Width, $right.Height, [System.Drawing.GraphicsUnit]::Pixel)
  }
  if ($oy -gt 0) {
    $top    = New-Object System.Drawing.Rectangle 0, 0, $src.Width, 1
    $bottom = New-Object System.Drawing.Rectangle 0, ($src.Height - 1), $src.Width, 1
    $g.DrawImage($src, (New-Object System.Drawing.Rectangle $ox, 0, $dw, $oy),
                 $top.X, $top.Y, $top.Width, $top.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $g.DrawImage($src, (New-Object System.Drawing.Rectangle $ox, ($oy + $dh), $dw, ($OUT_H - $oy - $dh)),
                 $bottom.X, $bottom.Y, $bottom.Width, $bottom.Height, [System.Drawing.GraphicsUnit]::Pixel)
  }

  $g.DrawImage($src, $ox, $oy, $dw, $dh)
  $g.Dispose()
  $edge = $src.GetPixel([int]($src.Width/2), 1)

  $outPath = Join-Path $dir $f.out
  $out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

  Write-Output ("{0}  {1}x{2} -> {3}x{4} (배율 {5})  여백 좌우 {6}px 상하 {7}px  채움 RGB({8},{9},{10})" -f `
    $f.key, $src.Width, $src.Height, $dw, $dh, [math]::Round($scale,4), $ox, $oy, $edge.R, $edge.G, $edge.B)

  Write-Output "  slots: ["
  foreach ($s in $f.slots) {
    $nx = [math]::Round($s[0] * $scale + $ox)
    $ny = [math]::Round($s[1] * $scale + $oy)
    $nw = [math]::Round($s[2] * $scale)
    $nh = [math]::Round($s[3] * $scale)
    $nr = [math]::Round($s[4] * $scale)
    Write-Output ("      {{ x: {0,-4} y: {1,-5} w: {2,-4} h: {3,-4} r: {4} }}," -f $nx, $ny, $nw, $nh, $nr)
  }
  Write-Output "  ]"
  Write-Output ""

  $out.Dispose(); $src.Dispose()
}

Write-Output "다음: tools\pack-frames.ps1 을 다시 실행해 frames-data.js 를 갱신하세요."
