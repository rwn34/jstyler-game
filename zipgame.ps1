# N3ON DashJ build script
# Auto-bumps patch version by default, or accepts -Version override.
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
}

if($newVersion -eq $currentVersion){
    Write-Error "New version equals current ($currentVersion). Specify a different -Version or bump manually."
    exit 1
}

Write-Host "Current version: v$currentVersion"
Write-Host "New version:     v$newVersion"

# === DOC CHECKS (non-blocking warnings) ===
$changelogPath = Join-Path $root 'CHANGELOG.md'
$ingameChangelog = $shellContent -match "v$newVersion"
$rootChangelog = (Test-Path $changelogPath) -and ([System.IO.File]::ReadAllText($changelogPath, [System.Text.Encoding]::UTF8) -match "v$newVersion")
$featuresPath = Join-Path $root 'FEATURES.md'
$workflowPath = Join-Path $root 'WORKFLOW.md'

if(!$ingameChangelog){
    Write-Warning "In-game changelog missing entry for v$newVersion"
}
if(!$rootChangelog){
    Write-Warning "CHANGELOG.md missing entry for v$newVersion"
}
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

# Update version in HTML shell (boot span + changelog button span)
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
if(!$ingameChangelog -or !$rootChangelog){
    Write-Host ""
    Write-Host "ACTION NEEDED:" -ForegroundColor Yellow
    if(!$ingameChangelog){ Write-Host "  - Add v$newVersion entry to in-game changelog" -ForegroundColor Yellow }
    if(!$rootChangelog){ Write-Host "  - Add v$newVersion entry to CHANGELOG.md" -ForegroundColor Yellow }
    Write-Host "  - Update FEATURES.md / WORKFLOW.md if features/workflows changed" -ForegroundColor DarkYellow
    Write-Host "  (see AGENTS.md section 9 for doc maintenance rules)" -ForegroundColor DarkGray
}
