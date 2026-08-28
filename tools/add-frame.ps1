#Requires -Version 5.1
# Fits a frame design to the shared canvas and finds the photo windows.
#
#   powershell -ExecutionPolicy Bypass -File tools\add-frame.ps1 -Source "간호대학 인생네컷 4컷.png" -Key ganho-4cut
#
# Source is relative to the project folder. Key is <collegeId>-3cut / -4cut.
# Writes assets\frames\<key>.jpg and prints slot coordinates for SLOT_OVERRIDE.
#
# How the windows are found
#   Colour alone does not work: several designs have a near-white background,
#   so the window interior (254,254,254) and the background (253,254,254) are
#   indistinguishable. But every window is enclosed by a drawn border, so this
#   flood-fills the light areas and keeps the regions that come out rectangular
#   and window-sized. The background fills as one huge irregular blob and is
#   rejected.
#
# This file is UTF-8 with BOM on purpose - PowerShell 5.1 reads a BOM-less
# UTF-8 script as ANSI and the Korean text then breaks parsing.

param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][string]$Key,
  [int]$Quality = 88,
  # 사진 칸 안쪽 색의 허용 범위. 기본값은 거의 무채색인 흰 칸을 뜻한다.
  # 예디대처럼 칸이 크림색(253,238,215)이면 -Tint 45 -Floor 200 처럼 넓혀서 쓴다.
  [int]$Tint = 14,
  [int]$Floor = 230
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$OUT_W = 1600; $OUT_H = 3332     # 저장 해상도 (최종 완성본과 동일)
$SLOT_W = 800; $SLOT_H = 1666    # 앱이 쓰는 좌표계

$root = Split-Path -Parent $PSScriptRoot
$srcPath = Join-Path $root $Source
if (-not (Test-Path $srcPath)) { throw "파일을 찾을 수 없습니다: $srcPath" }

$src = New-Object System.Drawing.Bitmap $srcPath
$w = $src.Width; $h = $src.Height

# ---- 픽셀을 한 번에 읽는다 (GetPixel 은 수백만 픽셀에서 너무 느리다) ----
$rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$data = $src.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
                      [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = $data.Stride
$buf = New-Object byte[] ($stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $buf.Length)
$src.UnlockBits($data)

# 밝은 곳 = 사진 칸 후보. 테두리선·글자·그림은 여기서 빠진다.
$light = New-Object 'bool[]' ($w * $h)
for ($y = 0; $y -lt $h; $y++) {
  $row = $y * $stride
  $base = $y * $w
  for ($x = 0; $x -lt $w; $x++) {
    $i = $row + $x * 4
    $b = $buf[$i]; $g = $buf[$i+1]; $r = $buf[$i+2]
    $mn = [math]::Min($r, [math]::Min($g, $b))
    $mx = [math]::Max($r, [math]::Max($g, $b))
    $light[$base + $x] = ($mn -ge $Floor -and ($mx - $mn) -le $Tint)
  }
}

# ---- 밝은 영역을 덩어리로 나눈다 ----
$label = New-Object 'int[]' ($w * $h)
$slots = @()
$minArea = [int]($w * $h * 0.02)      # 너무 작은 건 글자 사이 여백
$maxArea = [int]($w * $h * 0.30)      # 너무 큰 건 배경
$id = 0
$stack = New-Object 'int[]' ($w * $h)

for ($sy = 0; $sy -lt $h; $sy += 4) {
  for ($sx = 0; $sx -lt $w; $sx += 4) {
    $seed = $sy * $w + $sx
    if (-not $light[$seed] -or $label[$seed] -ne 0) { continue }

    $id++
    $sp = 0; $stack[$sp++] = $seed; $label[$seed] = $id
    $area = 0; $x0 = $w; $x1 = 0; $y0 = $h; $y1 = 0

    while ($sp -gt 0) {
      $cur = $stack[--$sp]
      $cy = [int][math]::Floor($cur / $w)
      $cx = $cur - $cy * $w
      $area++
      if ($cx -lt $x0) { $x0 = $cx }; if ($cx -gt $x1) { $x1 = $cx }
      if ($cy -lt $y0) { $y0 = $cy }; if ($cy -gt $y1) { $y1 = $cy }

      if ($cx -gt 0)      { $n = $cur - 1;  if ($light[$n] -and $label[$n] -eq 0) { $label[$n] = $id; $stack[$sp++] = $n } }
      if ($cx -lt $w - 1) { $n = $cur + 1;  if ($light[$n] -and $label[$n] -eq 0) { $label[$n] = $id; $stack[$sp++] = $n } }
      if ($cy -gt 0)      { $n = $cur - $w; if ($light[$n] -and $label[$n] -eq 0) { $label[$n] = $id; $stack[$sp++] = $n } }
      if ($cy -lt $h - 1) { $n = $cur + $w; if ($light[$n] -and $label[$n] -eq 0) { $label[$n] = $id; $stack[$sp++] = $n } }
    }

    if ($area -lt $minArea -or $area -gt $maxArea) { continue }
    $bw = $x1 - $x0 + 1; $bh = $y1 - $y0 + 1
    # 사진 칸은 직사각형이라 덩어리가 경계상자를 거의 꽉 채운다
    if (($area / ($bw * $bh)) -lt 0.85) { continue }
    $slots += ,@($x0, $y0, $bw, $bh)
  }
}

# 위 -> 아래, 왼 -> 오른쪽 순으로
$slots = @($slots | Sort-Object @{Expression={[math]::Floor($_[1] / 40)}}, @{Expression={$_[0]}})

# 모서리 둥글기: 첫 칸의 맨 윗줄 폭과 실제 폭 차이로 역산
$radius = 0
if ($slots.Count -gt 0) {
  $s = $slots[0]
  $yy = $s[1] + 1
  $run = 0
  for ($x = $s[0]; $x -lt ($s[0] + $s[2]); $x++) { if ($light[$yy * $w + $x]) { $run++ } }
  $inset = [math]::Max(0, ($s[2] - $run) / 2)
  for ($R = 1; $R -le 60; $R++) {
    if (($R - [math]::Sqrt([math]::Max(1, 2*$R - 1))) -ge $inset) { $radius = $R; break }
  }
}

# ---- 캔버스에 맞춰 저장 ----
$out = New-Object System.Drawing.Bitmap $OUT_W, $OUT_H, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g2 = [System.Drawing.Graphics]::FromImage($out)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g2.DrawImage($src, 0, 0, $OUT_W, $OUT_H)
$g2.Dispose()

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
$dstPath = Join-Path $root ("assets\frames\" + $Key + ".jpg")
$out.Save($dstPath, $codec, $ep)
$out.Dispose(); $src.Dispose()

$sx2 = $SLOT_W / $w; $sy2 = $SLOT_H / $h
$ratio = $w / $h
$want = $OUT_W / $OUT_H
$kb = [math]::Round((Get-Item $dstPath).Length / 1KB)
$rr = [math]::Round($radius * $sx2)

Write-Output ""
Write-Output ("{0}   원본 {1}x{2} (비율 {3})  ->  {4}x{5}   {6} KB" -f $Key, $w, $h, [math]::Round($ratio,4), $OUT_W, $OUT_H, $kb)

if ([math]::Abs($ratio - $want) -gt 0.01) {
  $squash = [math]::Round((1 - $want/$ratio) * 100, 1)
  Write-Output ""
  Write-Output ("  [경고] 비율이 규격과 다릅니다. 규격 " + [math]::Round($want,4) + ", 이 파일 " + [math]::Round($ratio,4))
  Write-Output ("         이대로 넣으면 가로로 " + $squash + "% 눌립니다. 1600x3332 로 다시 요청하세요.")
}

$expect = if ($Key -like "*4cut") { 4 } else { 3 }
if ($slots.Count -ne $expect) {
  Write-Output ""
  Write-Output ("  [경고] 사진 칸을 " + $slots.Count + "개 찾았습니다. " + $expect + "개여야 합니다.")
  Write-Output ("         아래 좌표는 쓰지 마세요.")
}

Write-Output ("  칸 " + $slots.Count + "개   모서리 " + $rr)
Write-Output "  slots: ["
foreach ($s in $slots) {
  $line = "      {{ x: {0,-4} y: {1,-5} w: {2,-4} h: {3,-4} r: {4} }},"
  Write-Output ($line -f [math]::Round($s[0]*$sx2), [math]::Round($s[1]*$sy2), [math]::Round($s[2]*$sx2), [math]::Round($s[3]*$sy2), $rr)
}
Write-Output "  ]"
