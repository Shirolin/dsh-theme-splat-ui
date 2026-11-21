param(
  [string]$Render = '.tmp/promo-landscape-20261115/render',
  [string]$Audio = '.tmp/promo-audio-20261119/mix/splat-street-master.wav'
)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$renderPath = [IO.Path]::GetFullPath((Join-Path $root $Render))
$audioPath = [IO.Path]::GetFullPath((Join-Path $root $Audio))
if (-not (Test-Path -LiteralPath $audioPath)) { throw "Missing audio mix: $audioPath" }
$manifest = Get-Content -LiteralPath (Join-Path $renderPath 'capture-manifest.json') -Raw | ConvertFrom-Json
if ($manifest.frames -ne 900 -or $manifest.sampling.dsf -ne 2 -or $manifest.width -ne 1280) { throw 'Expected landscape animatic: 900 frames, DSF=2, 1280px output' }
$frames = Join-Path $renderPath 'frames/%05d.jpg'
$promoDir = Join-Path $root 'site/promo'
$video = Join-Path $promoDir 'splat-street-landscape-animatic.mp4'
$coverPng = Join-Path $promoDir 'cover-landscape.png'
$posterWebp = Join-Path $promoDir 'poster-landscape.webp'
if (-not (Test-Path -LiteralPath $coverPng)) {
  & node (Join-Path $PSScriptRoot 'render-covers.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Cover rendering failed' }
}
$videoRaw = Join-Path $renderPath 'landscape-raw.mp4'
$coverJpg = Join-Path $renderPath 'cover-landscape.jpg'
& ffmpeg -hide_banner -y -framerate 30 -i $coverPng -framerate 30 -start_number 1 -i $frames -i $audioPath -frames:v 900 -filter_complex "[0:v]scale=1280:720:flags=lanczos:in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p,setsar=1[cov];[1:v]scale=1280:720:flags=lanczos:in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p,sidedata=mode=delete:type=ICC_PROFILE,setsar=1[main];[cov][main]concat=n=2:v=1:a=0,setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709,setsar=1[vout]" -map "[vout]" -map "2:a" -c:v libx264 -preset medium -crf 18 -r 30 -c:a aac -b:a 192k -ar 48000 -ac 2 -shortest -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -movflags +faststart $videoRaw
if ($LASTEXITCODE -ne 0) { throw 'Animatic encoding failed' }
& ffmpeg -hide_banner -y -i $coverPng -frames:v 1 -q:v 2 -update 1 $coverJpg
if ($LASTEXITCODE -ne 0) { throw 'Landscape cover JPG conversion failed' }
& ffmpeg -hide_banner -y -i $videoRaw -i $coverJpg -map 0 -map 1 -c copy -disposition:v:1 attached_pic -metadata:s:v:1 title="Cover" -movflags +faststart $video
if ($LASTEXITCODE -ne 0) { throw 'Landscape cover embedding failed' }
Remove-Item -Force -ErrorAction SilentlyContinue $videoRaw, $coverJpg
& ffmpeg -hide_banner -y -i $coverPng -c:v libwebp -quality 92 -update 1 $posterWebp
if ($LASTEXITCODE -ne 0) { throw 'Landscape poster generation failed' }
