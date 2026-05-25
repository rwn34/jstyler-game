# N3ON DashJ build script
# Default: auto-bumps patch version on every build (mutates HTML/SW + changelogs).
# Pass -Version "X.Y.Z" to set an explicit version.
# Concatenates JS modules into single-file HTML for zero-dependency deployment.

param(
    [string]$Version = ''
)

$ErrorActionPreference = 'Stop'
$root = 'C:\Users\rwn34\Code\rwn-game-jstyler'
$src = Join-Path $root 'src'
$deploy = Join-Path $root 'deploy'
if(!(Test-Path $deploy)){ New-Item -ItemType Directory -Path $deploy | Out-Null }

$shellPath = Join-Path $src 'n3ondashj\index.html'
$jsDir = Join-Path $src 'n3ondashj'
$swPath = Join-Path $src 'n3ondashj\sw.js'

$shellContent = [System.IO.File]::ReadAllText($shellPath, [System.Text.Encoding]::UTF8)

# Detect current version from boot-screen span
$currentVersion = '0.0.0'
if($shellContent -match '<span[^>]+>v([0-9]+\.[0-9]+\.[0-9]+[a-zA-Z0-9\-_]*)</span>'){
    $currentVersion = $matches[1]
}

# Determine new version
function Bump-Patch($v){
    if($v -match '^([0-9]+)\.([0-9]+)\.([0-9]+)([a-z]?)$'){
        $major = [int]$matches[1]
        $minor = [int]$matches[2]
        $patch = [int]$matches[3]
        $suffix = $matches[4]
        if($suffix -ne ''){
            $code = [int][char]$suffix[0]
            if($code -lt [int][char]'z'){
                return "$major.$minor.$patch$([char]($code+1))"
            } else {
                return "$major.$minor.$($patch+1)"
            }
        }
        return "$major.$minor.$($patch+1)"
    }
    return "$v.1"
}

if($Version -eq ''){
    $newVersion = Bump-Patch $currentVersion
} else {
    $newVersion = $Version -replace '^v',''
    if($newVersion -eq $currentVersion){
        Write-Error "New version equals current ($currentVersion). Specify a different -Version or bump manually."
        exit 1
    }
}

Write-Host "Current version: v$currentVersion"
Write-Host "New version:     v$newVersion"

# === DOC CHECKS & AUTO-INSERT PLACEHOLDERS ===
$changelogPath = Join-Path $root 'CHANGELOG.md'
$ingameChangelog = $shellContent -match "v$newVersion"
$rootChangelog = (Test-Path $changelogPath) -and ([System.IO.File]::ReadAllText($changelogPath, [System.Text.Encoding]::UTF8) -match "v$newVersion")
$featuresPath = Join-Path $root 'FEATURES.md'
$workflowPath = Join-Path $root 'WORKFLOW.md'

# Auto-insert placeholder into CHANGELOG.md if missing
if(!$rootChangelog){
    if(Test-Path $changelogPath){
        $changelogContent = [System.IO.File]::ReadAllText($changelogPath, [System.Text.Encoding]::UTF8)
        $dateStr = Get-Date -Format 'MMMM d, yyyy'
        $placeholder = "## v$newVersion — $dateStr`n`n### Changed`n- Build`n"
        $changelogContent = [regex]::Replace($changelogContent, '^# Changelog\s*\r?\n', "# Changelog`n`n$placeholder", 1)
        [System.IO.File]::WriteAllText($changelogPath, $changelogContent, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "  -> Added placeholder to CHANGELOG.md for v$newVersion" -ForegroundColor DarkGray
    }
}

# === AUTO-GENERATE IN-GAME CHANGELOG FROM CHANGELOG.md ===
$changelogContent = ''
if (Test-Path $changelogPath) {
    $changelogContent = [System.IO.File]::ReadAllText($changelogPath, [System.Text.Encoding]::UTF8)
}

# Parse CHANGELOG.md into version entries
$versionEntries = @()
$lines = $changelogContent -split "`r?`n"
$changelogVersion = $null
$currentItems = @()

foreach ($line in $lines) {
    if ($line -match '^## v([0-9]+\.[0-9]+\.[0-9]+[a-zA-Z0-9\-_]*)') {
        if ($changelogVersion -and $currentItems.Count -gt 0) {
            $versionEntries += @{ version = $changelogVersion; items = $currentItems }
        }
        $changelogVersion = $matches[1]
        $currentItems = @()
    }
    elseif ($changelogVersion -and $line -match '^(\s*)-\s+(.+)$') {
        $indent = $matches[1].Length
        $text = $matches[2]
        $currentItems += @{ text = $text; indent = $indent }
    }
}

if ($changelogVersion -and $currentItems.Count -gt 0) {
    $versionEntries += @{ version = $changelogVersion; items = $currentItems }
}

# Generate in-game changelog HTML (last 15 versions)
$maxVersions = 15
$selectedVersions = $versionEntries | Select-Object -First $maxVersions

$changelogHtmlParts = @()
foreach ($entry in $selectedVersions) {
    $changelogHtmlParts += "<div style=`"font-size:0.75rem;color:#0ff;font-weight:700;margin-bottom:6px;`">v$($entry.version)</div>"
    $changelogHtmlParts += "<ul style=`"font-size:0.65rem;color:#ccc;padding-left:16px;margin:0 0 12px 0;line-height:1.6;`">"
    foreach ($item in $entry.items) {
        $prefix = if ($item.indent -ge 2) { '→ ' } else { '' }
        # Escape bare ampersands only (preserve intentional HTML tags like <b>)
        $safeText = $item.text -replace '&(?!#[0-9]+;|#[xX][0-9a-fA-F]+;|[a-zA-Z][a-zA-Z0-9]*;)', '&amp;'
        $changelogHtmlParts += "<li>$prefix$safeText</li>"
    }
    $changelogHtmlParts += "</ul>"
}

$generatedChangelogHtml = ($changelogHtmlParts -join "`n") + "`n"

# Replace the content inside the changelog container
$containerPattern = '(?s)(<div style="width:100%;max-width:360px;max-height:60vh;overflow-y:auto;text-align:left;padding:10px;background:rgba\(255,255,255,0\.03\);border-radius:12px;border:1px solid rgba\(255,255,255,0\.1\);">)\r?\n.*?\r?\n(</div>\r?\n<button onclick="closeChangelog\(\))'
$shellContent = [regex]::Replace($shellContent, $containerPattern, "`$1`n$generatedChangelogHtml`$2", 1)
[System.IO.File]::WriteAllText($shellPath, $shellContent, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "  -> Regenerated in-game changelog from CHANGELOG.md ($($selectedVersions.Count) versions)" -ForegroundColor DarkGray
$shellContent = [System.IO.File]::ReadAllText($shellPath, [System.Text.Encoding]::UTF8)

if(!(Test-Path $featuresPath)){
    Write-Warning "FEATURES.md not found"
}
if(!(Test-Path $workflowPath)){
    Write-Warning "WORKFLOW.md not found"
}
if(Test-Path $changelogPath){
    $daysSince = ([DateTime]::Now - (Get-Item $changelogPath).LastWriteTime).Days
    if($daysSince -gt 14){
        Write-Warning "CHANGELOG.md last updated $daysSince days ago -- docs may be stale"
    }
}

# Update version in HTML shell and SW
if($newVersion -ne $currentVersion){
    $escCurrent = [regex]::Escape($currentVersion)
    $shellContent = $shellContent -replace ('<span([^>]+)>v' + $escCurrent + '</span>'), ("<span`$1>v$newVersion</span>")
    $shellContent = $shellContent -replace ("<span([^>]+)>v" + $escCurrent + "</span>"), ("<span`$1>v$newVersion</span>")
    [System.IO.File]::WriteAllText($shellPath, $shellContent, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Updated $shellPath"

    # Update SW cache name
    if(Test-Path $swPath){
        $swContent = [System.IO.File]::ReadAllText($swPath, [System.Text.Encoding]::UTF8)
        $swContent = $swContent -replace ("'n3ondashj-v" + $escCurrent + "'"), ("'n3ondashj-v$newVersion'")
        [System.IO.File]::WriteAllText($swPath, $swContent, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "Updated $swPath"
    }

    # Update APP_VERSION in 03-save.js
    $saveJsPath = Join-Path $jsDir '03-save.js'
    if(Test-Path $saveJsPath){
        $saveJsContent = [System.IO.File]::ReadAllText($saveJsPath, [System.Text.Encoding]::UTF8)
        $saveJsContent = $saveJsContent -replace ("var APP_VERSION = 'v" + $escCurrent + "';"), ("var APP_VERSION = 'v$newVersion';")
        [System.IO.File]::WriteAllText($saveJsPath, $saveJsContent, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "Updated $saveJsPath"
    }
}

# Re-check changelog flags after all mutations
$ingameChangelog = $shellContent -match "v$newVersion"
$rootChangelog = (Test-Path $changelogPath) -and ([System.IO.File]::ReadAllText($changelogPath, [System.Text.Encoding]::UTF8) -match "v$newVersion")

# Re-read shell after version bump
$shellContent = [System.IO.File]::ReadAllText($shellPath, [System.Text.Encoding]::UTF8)

# Concatenate JS modules alphabetically
$jsFiles = Get-ChildItem $jsDir -Filter '*.js' | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name
$jsContent = ''
foreach($jsFile in $jsFiles){
    $jsContent += [System.IO.File]::ReadAllText($jsFile.FullName, [System.Text.Encoding]::UTF8)
    $jsContent += "`n"
    Write-Host "  + $($jsFile.Name)"
}

# Inject concatenated JS before </body>
$finalGameHtml = $shellContent -replace '</body>', ("<script>`n" + $jsContent + "`n</script>`n</body>")

# Parse metadata from JS
$title = 'N3ON DashJ'
if($shellContent -match '<title>([^<]+)</title>'){ $title = $matches[1] -replace '\s*\|\s*jstylr$','' }
$desc = 'Neon Abyss'
if($jsContent -match 'name:"([^"]+)"'){ $desc = $matches[1] }
$diff = 'STARTER'
if($jsContent -match 'diff:"([^"]+)"'){ $diff = $matches[1] }

$skyT='#020208'; $skyM='#0a0a1a'; $skyB='#1a0a2a'; $grid='#0ff'; $acc='#f0f'; $part='#0ff'
if($jsContent -match 'skyT:"([^"]+)"'){ $skyT=$matches[1] }
if($jsContent -match 'skyM:"([^"]+)"'){ $skyM=$matches[1] }
if($jsContent -match 'skyB:"([^"]+)"'){ $skyB=$matches[1] }
if($jsContent -match 'grid:"([^"]+)"'){ $grid=$matches[1] }
if($jsContent -match 'acc:"([^"]+)"'){ $acc=$matches[1] }
if($jsContent -match 'part:"([^"]+)"'){ $part=$matches[1] }

$themeJson = "{`"skyT`":`"$skyT`",`"skyM`":`"$skyM`",`"skyB`":`"$skyB`",`"grid`":`"$grid`",`"acc`":`"$acc`",`"part`":`"$part`"}"
$gamesJson = "[{`"id`":`"n3ondashj`",`"title`":`"$title`",`"desc`":`"$desc`",`"diff`":`"$diff`",`"theme`":$themeJson}]"

$indexHtml = [System.IO.File]::ReadAllText((Join-Path $src 'index.html'), [System.Text.Encoding]::UTF8)
$indexHtml = $indexHtml -replace '<!-- ZIPGAME_GAMES -->', $gamesJson

$ts = Get-Date -Format 'yyyyMMddHHmmss'
$zipName = "${ts}_v$newVersion.zip"
$zipPath = Join-Path $deploy $zipName

if(Test-Path $zipPath){
    Write-Error "Zip already exists: $zipName. Wait 1 second and re-run."
    exit 1
}

$tempDir = Join-Path $env:TEMP ('zipgame_' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $tempDir | Out-Null

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $tempDir 'index.html'), $indexHtml, $utf8NoBom)

# Copy Cloudflare Pages _headers file for security headers
$headersPath = Join-Path $src '_headers'
if(Test-Path $headersPath){ Copy-Item $headersPath $tempDir }

$gameDir = Join-Path $tempDir 'n3ondashj'
New-Item -ItemType Directory -Path $gameDir | Out-Null
[System.IO.File]::WriteAllText((Join-Path $gameDir 'index.html'), $finalGameHtml, $utf8NoBom)

# Copy PWA assets only (not .js modules -- they're concatenated)
$assetsDir = Join-Path $src 'n3ondashj'
if(Test-Path $assetsDir){
    $assetNames = @('manifest.webmanifest','sw.js','icon.svg','icon-192.png','icon-512.png','icon-maskable.png')
    foreach($an in $assetNames){
        $af = Join-Path $assetsDir $an
        if(Test-Path $af){ Copy-Item $af (Join-Path $gameDir $an) }
    }
}

# === LOCAL TESTING OUTPUT (unzipped, latest only) ===
$latestDir = Join-Path $deploy 'latest'
$latestGameDir = Join-Path $latestDir 'n3ondashj'
if(Test-Path $latestDir){ Remove-Item $latestDir -Recurse -Force }
New-Item -ItemType Directory -Path $latestGameDir | Out-Null
[System.IO.File]::WriteAllText((Join-Path $latestDir 'index.html'), $indexHtml, $utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $latestGameDir 'index.html'), $finalGameHtml, $utf8NoBom)
if(Test-Path $assetsDir){
    foreach($an in $assetNames){
        $af = Join-Path $assetsDir $an
        if(Test-Path $af){ Copy-Item $af (Join-Path $latestGameDir $an) }
    }
}
$headersPath = Join-Path $src '_headers'
if(Test-Path $headersPath){ Copy-Item $headersPath $latestDir }
Write-Host "  -> deploy/latest/ (for local testing)"

Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipPath, [System.IO.Compression.CompressionLevel]::Fastest, $false)

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Update')
$entriesToFix = @($zip.Entries | Where-Object { $_.FullName -match '\\' })
foreach($e in $entriesToFix){
    $newName = $e.FullName -replace '\\','/'
    $stream = $e.Open()
    $ms = New-Object System.IO.MemoryStream
    $stream.CopyTo($ms)
    $stream.Close()
    $e.Delete()
    $ne = $zip.CreateEntry($newName, [System.IO.Compression.CompressionLevel]::Fastest)
    $ns = $ne.Open()
    $ms.Position = 0
    $ms.CopyTo($ns)
    $ns.Close()
    $ms.Dispose()
}
$zip.Dispose()

Remove-Item $tempDir -Recurse -Force
$size = [math]::Round((Get-Item $zipPath).Length/1024, 1)
Write-Host ""
Write-Host "Done: $zipName ($size KB)" -ForegroundColor Green
Write-Host ""
Write-Host ""
Write-Host "ACTION NEEDED:" -ForegroundColor Yellow
Write-Host "  - Review placeholder text in CHANGELOG.md and in-game changelog" -ForegroundColor Yellow
Write-Host "  - Update FEATURES.md / WORKFLOW.md if features/workflows changed" -ForegroundColor DarkYellow
Write-Host "  (see AGENTS.md section 9 for doc maintenance rules)" -ForegroundColor DarkGray
