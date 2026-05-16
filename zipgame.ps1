# N3ON DashJ build script — zipgame.ps1
# Auto-bumps patch version (1.1.10 -> 1.1.11) by default, or accepts -Version override.
# Updates: HTML boot span, changelog button span, sw.js CACHE_NAME.
# Filename pattern: <yyyyMMddHHmmss>_<version>.zip — never replaces existing zip.

param(
    [string]$Version = ''
)

$ErrorActionPreference = 'Stop'
$root = 'C:\Users\rwn34\Code\rwn-game-jstyler'
$src = Join-Path $root 'src'
$deploy = Join-Path $root 'deploy'
if(!(Test-Path $deploy)){New-Item -ItemType Directory -Path $deploy | Out-Null}

$gameHtmlPath = Join-Path $src 'n3ondashj.html'
$swPath = Join-Path $src 'n3ondashj\sw.js'

$gameHtml = [System.IO.File]::ReadAllText($gameHtmlPath, [System.Text.Encoding]::UTF8)

# Detect current version from boot-screen span
$currentVersion = '0.0.0'
if($gameHtml -match '<span[^>]+>v([0-9]+\.[0-9]+\.[0-9]+[a-z]?)</span>'){
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
            # Bump letter suffix: a -> b, b -> c, ..., z -> next patch
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

# Update HTML boot span
$gameHtml = $gameHtml -replace ('<span([^>]+)>v' + [regex]::Escape($currentVersion) + '</span>'), ("<span`$1>v$newVersion</span>")
[System.IO.File]::WriteAllText($gameHtmlPath, $gameHtml, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Updated $gameHtmlPath"

# Update SW cache name
if(Test-Path $swPath){
    $swContent = [System.IO.File]::ReadAllText($swPath, [System.Text.Encoding]::UTF8)
    $swContent = $swContent -replace ("'n3ondashj-v" + [regex]::Escape($currentVersion) + "'"), ("'n3ondashj-v$newVersion'")
    [System.IO.File]::WriteAllText($swPath, $swContent, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Updated $swPath"
}

# Re-read after version bump for packaging
$gameHtml = [System.IO.File]::ReadAllText($gameHtmlPath, [System.Text.Encoding]::UTF8)

$title = 'N3ON DashJ'
if($gameHtml -match '<title>([^<]+)</title>'){$title = $matches[1] -replace '\s*\|\s*jstylr$',''}
$desc = 'Neon Abyss'
if($gameHtml -match 'name:"([^"]+)"'){$desc = $matches[1]}
$diff = 'STARTER'
if($gameHtml -match 'diff:"([^"]+)"'){$diff = $matches[1]}

$skyT='#020208';$skyM='#0a0a1a';$skyB='#1a0a2a';$grid='#0ff';$acc='#f0f';$part='#0ff'
if($gameHtml -match 'skyT:"([^"]+)"'){$skyT=$matches[1]}
if($gameHtml -match 'skyM:"([^"]+)"'){$skyM=$matches[1]}
if($gameHtml -match 'skyB:"([^"]+)"'){$skyB=$matches[1]}
if($gameHtml -match 'grid:"([^"]+)"'){$grid=$matches[1]}
if($gameHtml -match 'acc:"([^"]+)"'){$acc=$matches[1]}
if($gameHtml -match 'part:"([^"]+)"'){$part=$matches[1]}

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

$gameDir = Join-Path $tempDir 'n3ondashj'
New-Item -ItemType Directory -Path $gameDir | Out-Null
[System.IO.File]::WriteAllText((Join-Path $gameDir 'index.html'), $gameHtml, $utf8NoBom)

$assetsDir = Join-Path $src 'n3ondashj'
if(Test-Path $assetsDir){
    Get-ChildItem $assetsDir -File | ForEach-Object {
        Copy-Item $_.FullName (Join-Path $gameDir $_.Name)
    }
}

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
Write-Host "Reminder: add changelog entry for v$newVersion in n3ondashj.html if needed." -ForegroundColor Yellow
