# Installs the remove.bg cutouts as the villager sprites.
#
# These replace the ones this project used to cut itself: the automatic
# knockout could not separate Harbang's grey stone from the grey checkerboard
# and chewed holes in his face. remove.bg handles it cleanly, so the in-house
# cutout scripts are gone.
#
# Source names are Korean, so they are built from char codes - PowerShell 5.1
# reads this file as ANSI and would mangle literals.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = "C:\Users\jeong\Desktop\" + [char]0xD559 + [char]0xC0DD + [char]0xBCF5 + [char]0xC9C0 + [char]0xACFC + " " + [char]0xD504 + [char]0xB85C + [char]0xC81D + [char]0xD2B8
$dest = Join-Path $root "www\assets\npc"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$suffix = "-removebg-preview.png"
$map = @(
    @{ src = [char]0xC81C + [char]0xB85D + [char]0xC774 + $suffix; out = "jerok.png"    },
    @{ src = [char]0xB3D9 + [char]0xBC31 + [char]0xC774 + $suffix; out = "dongbaek.png" },
    @{ src = [char]0xAC10 + [char]0xADE4 + [char]0xC774 + $suffix; out = "gyul.png"     },
    @{ src = [char]0xD558 + [char]0xB974 + [char]0xBC29 + $suffix; out = "harbang.png"  }
)

foreach ($m in $map) {
    $p = Join-Path $root $m.src
    if (-not (Test-Path $p)) { throw ("missing source: " + $m.src) }
    $target = Join-Path $dest $m.out
    Copy-Item $p $target -Force

    $img = [System.Drawing.Image]::FromFile($target)
    $w = $img.Width; $h = $img.Height
    $img.Dispose()
    $kb = [math]::Round((Get-Item $target).Length / 1KB, 1)
    Write-Output ("  " + $m.out.PadRight(14) + $w + "x" + $h + "   " + $kb + " KB")
}

$tot = (Get-ChildItem $dest -Filter *.png | Measure-Object -Property Length -Sum).Sum
Write-Output ("total " + [math]::Round($tot / 1KB, 1) + " KB")
