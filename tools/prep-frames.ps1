# Trims the white border off each photobooth frame PNG and reports the
# photo slots in the trimmed image's coordinates.
#
# Usage: powershell -ExecutionPolicy Bypass -File tools\prep-frames.ps1
#
# Writes assets\frames\<name>-trim.png and prints one JSON line per frame.
# The JSON is what photobooth.html's FRAMES table is built from.
#
# ASCII only: PowerShell 5.1 reads this file as ANSI.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$src = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text;

public class FramePrep {
  static bool[] White(byte[] buf, int stride, int W, int H) {
    bool[] w = new bool[W*H];
    for (int y = 0; y < H; y++) {
      int o = y * stride;
      for (int x = 0; x < W; x++) {
        int i = o + x*4;
        if (buf[i] > 235 && buf[i+1] > 235 && buf[i+2] > 235 && buf[i+3] > 200) w[y*W+x] = true;
      }
    }
    return w;
  }

  public static string Run(string inPath, string outPath) {
    int W, H, stride;
    byte[] buf;
    using (Bitmap bmp = new Bitmap(inPath)) {
      W = bmp.Width; H = bmp.Height;
      BitmapData bd = bmp.LockBits(new Rectangle(0,0,W,H),
                                   ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      stride = bd.Stride;
      buf = new byte[stride * H];
      Marshal.Copy(bd.Scan0, buf, 0, buf.Length);
      bmp.UnlockBits(bd);
    }
    bool[] white = White(buf, stride, W, H);

    // trim the fully-white border
    int top = 0, bottom = H-1, left = 0, right = W-1;
    while (top < H)      { int c=0; for (int x=0;x<W;x++) if (white[top*W+x]) c++;    if (c < W*0.995) break; top++; }
    while (bottom > top) { int c=0; for (int x=0;x<W;x++) if (white[bottom*W+x]) c++; if (c < W*0.995) break; bottom--; }
    while (left < W)     { int c=0; for (int y=top;y<=bottom;y++) if (white[y*W+left]) c++;  if (c < (bottom-top+1)*0.995) break; left++; }
    while (right > left) { int c=0; for (int y=top;y<=bottom;y++) if (white[y*W+right]) c++; if (c < (bottom-top+1)*0.995) break; right--; }

    int CW = right-left+1, CH = bottom-top+1;

    using (Bitmap srcBmp = new Bitmap(inPath))
    using (Bitmap dst = new Bitmap(CW, CH, PixelFormat.Format32bppArgb)) {
      using (Graphics g = Graphics.FromImage(dst)) {
        g.DrawImage(srcBmp, new Rectangle(0,0,CW,CH), new Rectangle(left,top,CW,CH), GraphicsUnit.Pixel);
      }
      dst.Save(outPath, ImageFormat.Png);
    }

    // detect slots inside the trimmed area
    StringBuilder sb = new StringBuilder();
    sb.Append("{\"W\":" + CW + ",\"H\":" + CH + ",\"slots\":[");
    bool first = true;
    int rowThr = (int)(CW * 0.35);
    int y0 = -1;
    for (int y = 0; y <= CH; y++) {
      int rc = 0;
      if (y < CH) for (int x = 0; x < CW; x++) if (white[(y+top)*W + (x+left)]) rc++;
      bool on = (y < CH) && rc > rowThr;
      if (on && y0 < 0) y0 = y;
      if (!on && y0 >= 0) {
        int y1 = y - 1;
        if (y1 - y0 > 40) {
          int bh = y1 - y0 + 1;
          int colThr = (int)(bh * 0.5);
          int x0 = -1;
          for (int x = 0; x <= CW; x++) {
            int cc = 0;
            if (x < CW) for (int yy = y0; yy <= y1; yy++) if (white[(yy+top)*W + (x+left)]) cc++;
            bool onc = (x < CW) && cc > colThr;
            if (onc && x0 < 0) x0 = x;
            if (!onc && x0 >= 0) {
              int x1 = x - 1;
              if (x1 - x0 > 40) {
                int r = 0;
                for (int yy = y0; yy <= y1 && yy < y0 + 250; yy++) {
                  if (white[(yy+top)*W + (x0+left)]) { r = yy - y0; break; }
                }
                if (!first) sb.Append(",");
                first = false;
                sb.Append("{\"x\":" + x0 + ",\"y\":" + y0 +
                          ",\"w\":" + (x1-x0+1) + ",\"h\":" + (y1-y0+1) +
                          ",\"r\":" + r + "}");
              }
              x0 = -1;
            }
          }
        }
        y0 = -1;
      }
    }
    sb.Append("],\"trim\":{\"left\":" + left + ",\"top\":" + top + "}}");
    return sb.ToString();
  }
}
"@

Add-Type -TypeDefinition $src -ReferencedAssemblies System.Drawing

$root = Split-Path -Parent $PSScriptRoot
foreach ($name in @("jnu-3cut", "jnu-4cut")) {
  $in  = Join-Path $root ("assets\frames\" + $name + ".png")
  $out = Join-Path $root ("assets\frames\" + $name + "-trim.png")
  Write-Output ($name + " " + [FramePrep]::Run($in, $out))
}
