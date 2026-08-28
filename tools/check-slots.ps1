# Draws the slot rectangles that photobooth.html has hard-coded on top of each
# trimmed frame, so you can eyeball whether they land on the white windows.
#
# Usage: powershell -ExecutionPolicy Bypass -File tools\check-slots.ps1
# Writes assets\frames\_check-3cut.png and _check-4cut.png (safe to delete).
#
# ASCII only: PowerShell 5.1 reads this file as ANSI.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot

# same numbers as the FRAMES table in photobooth.html
$frames = @(
  @{ name = "4cut"; file = "jnu-4cut-trim.png"; slots = @(
       @(90,328,313,443), @(423,328,313,443), @(90,789,313,479), @(423,789,313,479)) },
  @{ name = "3cut"; file = "jnu-3cut-trim.png"; slots = @(
       @(72,276,558,353), @(72,647,558,356), @(72,1020,558,356)) }
)

foreach ($f in $frames) {
  $in  = Join-Path $root ("assets\frames\" + $f.file)
  $out = Join-Path $root ("assets\frames\_check-" + $f.name + ".png")

  $bmp = New-Object System.Drawing.Bitmap $in
  $g   = [System.Drawing.Graphics]::FromImage($bmp)

  $i = 1
  foreach ($s in $f.slots) {
    $rect = New-Object System.Drawing.Rectangle $s[0], $s[1], $s[2], $s[3]

    # magenta fill so any white left showing at the edges is obvious
    $fill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 255, 0, 200))
    $g.FillRectangle($fill, $rect)

    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::Yellow), 3
    $g.DrawRectangle($pen, $rect)

    $font = New-Object System.Drawing.Font "Arial", 60, ([System.Drawing.FontStyle]::Bold)
    $g.DrawString([string]$i, $font, [System.Drawing.Brushes]::Black,
                  [single]($s[0] + 12), [single]($s[1] + 12))

    $fill.Dispose(); $pen.Dispose(); $font.Dispose()
    $i++
  }

  $g.Dispose()
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("wrote " + $out)
}
