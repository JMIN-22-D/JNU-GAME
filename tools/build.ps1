$ErrorActionPreference = "Stop"

# Builds two standalone single-file HTMLs out of www/ :
#   DEMO.html                          - demo panel, everything unlocked on load
#   jeju_life_support_portal (6).html  - plain play build, no demo panel
#
# Both inline CSS, JS and images, so they run from a double click with no
# server and no internet.
#
# NOTE: this file is read as ANSI by Windows PowerShell 5.1, so it must stay
# pure ASCII. Anything Korean lives in the inject-*.js files, which are read
# back as UTF-8 below.

$root    = "C:\Users\jeong\Desktop\" + [char]0xD559 + [char]0xC0DD + [char]0xBCF5 + [char]0xC9C0 + [char]0xACFC + " " + [char]0xD504 + [char]0xB85C + [char]0xC81D + [char]0xD2B8
$www     = Join-Path $root "www"
$scratch = $PSScriptRoot
$enc     = New-Object System.Text.UTF8Encoding($false)

function ReadText($path) {
    return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

$errJs    = ReadText (Join-Path $scratch "inject-errbar.js")
$testJs   = ReadText (Join-Path $scratch "inject-selftest.js")

function Build($isDemo, $outName) {
    $html = ReadText (Join-Path $www "index.html")

    # error reporter goes first, in its own block
    $html = $html.Replace("<body>", "<body>`r`n<script>`r`n" + $errJs + "`r`n</script>")

    # NOTE: autofill used to be switched on here so a demo started with
    # everything unlocked. Now that coins actually buy furniture, tools and
    # plot expansions, starting with 999999 coins removes the whole game, so
    # the demo boots at normal values. The panel can still fill things on
    # demand with its "fill everything" button.

    foreach ($img in @("assets/splash.jpg", "assets/logo.jpg")) {
        $bytes = [System.IO.File]::ReadAllBytes((Join-Path $www $img))
        $html  = $html.Replace($img, "data:image/jpeg;base64," + [Convert]::ToBase64String($bytes))
    }


    # only meaningful for the hosted version
    $html = [regex]::Replace($html, '\s*<link rel="manifest"[^>]*>', '')
    $html = [regex]::Replace($html, '\s*<link rel="icon"[^>]*>', '')
    $html = [regex]::Replace($html, '\s*<link rel="apple-touch-icon"[^>]*>', '')

    $css  = ReadText (Join-Path $www "css\style.css")
    $html = [regex]::Replace($html,
        '<link rel="stylesheet" href="css/style\.css\?v=[^"]*">',
        { param($m) "<style>`r`n" + $css + "`r`n</style>" })

    $files = @("native.js", "app.js", "campus.js", "vendor/three.min.js", "island3d.js", "chick3d.js", "scene3d.js")
    if ($isDemo) { $files += "demo.js" }
    foreach ($js in $files) {
        $code    = ReadText (Join-Path $www ("js\" + $js))
        $pattern = '<script src="js/' + [regex]::Escape($js) + '\?v=[^"]*"></script>'
        $html    = [regex]::Replace($html, $pattern, { param($m) "<script>`r`n" + $code + "`r`n</script>" })
    }

    # Villager sprites and ground textures. These MUST run after the JS is
    # inlined - the paths live inside island3d.js (NPC_SPRITE / TEX_URL tables),
    # not in the HTML.
    foreach ($npc in @("jerok", "dongbaek", "gyul", "harbang")) {
        $p = Join-Path $www ("assets\npc\" + $npc + ".png")
        if (Test-Path $p) {
            $bytes = [System.IO.File]::ReadAllBytes($p)
            $html = $html.Replace("assets/npc/" + $npc + ".png",
                                  "data:image/png;base64," + [Convert]::ToBase64String($bytes))
        }
    }
    foreach ($tx in @("grass", "sand", "dirt", "bark", "plank", "stone",
                      "roof", "thatch", "darkwood", "path", "plaster")) {
        $p = Join-Path $www ("assets\tex\" + $tx + ".jpg")
        if (Test-Path $p) {
            $bytes = [System.IO.File]::ReadAllBytes($p)
            $html = $html.Replace("assets/tex/" + $tx + ".jpg",
                                  "data:image/jpeg;base64," + [Convert]::ToBase64String($bytes))
        }
    }

    if (-not $isDemo) {
        # strip the demo tag and its comment
        $html = [regex]::Replace($html, '\s*<!--[^<]*demo\.js[^<]*-->', '')
        $html = [regex]::Replace($html, '\s*<script src="js/demo\.js\?v=[^"]*"></script>', '')
    }

    $flag = if ($isDemo) { "true" } else { "false" }
    $html = $html.Replace("</body>", "<script>`r`n" + $testJs.Replace("__NEEDDEMO__", $flag) + "`r`n</script>`r`n</body>")

    $out = Join-Path $root $outName
    [System.IO.File]::WriteAllText($out, $html, $enc)

    $leftovers = ([regex]::Matches($html, 'src="js/|href="css/|src="assets/')).Count
    # Look for demo.js's own stylesheet, not "demo-fab" - that string also shows
    # up in the (disabled) self-test line, which made the play build read "yes".
    $panel     = if ($html.Contains('#demo-wrap.open #demo-panel')) { "yes" } else { "no" }
    $kb        = [math]::Round((Get-Item $out).Length / 1KB, 1)
    Write-Output ("{0,-36} {1,8} KB   ext-refs {2}   demo-panel {3}" -f $outName, $kb, $leftovers, $panel)
}

Write-Output "=== build ==="
Build $true  "DEMO.html"
Build $false "jeju_life_support_portal (6).html"

Write-Output ""
Write-Output "=== contents check ==="
foreach ($n in @("DEMO.html", "jeju_life_support_portal (6).html")) {
    $t = ReadText (Join-Path $root $n)
    Write-Output ("{0,-36} keepall={1,-6} goal1={2,-6} notify={3,-6} emerg={4,-6} ver={5}" -f `
        $n,
        $t.Contains('word-break: keep-all'),
        $t.Contains('DAILY_MISSION_GOAL = 1'),
        $t.Contains('syncReminders'),
        [regex]::Match($t, "EMERGENCY_MODE\s*=\s*'(\w+)'").Groups[1].Value,
        [regex]::Match($t, 'APP_VERSION = "([\d.]+)"').Groups[1].Value)
}
