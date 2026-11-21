param(
  [string]$Render = '.tmp/promo-production-20261115/render',
  [string]$Output = 'site/promo',
  [string]$Audio = '.tmp/promo-audio-20261119/mix/splat-street-master.wav'
)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$renderPath = [IO.Path]::GetFullPath((Join-Path $root $Render))
$outputPath = [IO.Path]::GetFullPath((Join-Path $root $Output))
$audioPath = [IO.Path]::GetFullPath((Join-Path $root $Audio))
if (-not (Test-Path -LiteralPath $audioPath)) { throw "Missing audio mix: $audioPath" }
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
$manifest = Get-Content -LiteralPath (Join-Path $renderPath 'capture-manifest.json') -Raw | ConvertFrom-Json
if ($manifest.frames -ne 900 -or $manifest.sampling.dsf -ne 2) { throw 'Expected 900 frames sampled at DSF=2' }
$frames = Join-Path $renderPath 'frames/%05d.jpg'
$video = Join-Path $outputPath 'splat-street-vertical.mp4'
$coverPng = Join-Path $outputPath 'cover-vertical.png'
$posterWebp = Join-Path $outputPath 'poster-vertical.webp'
if (-not (Test-Path -LiteralPath $coverPng)) {
  & node (Join-Path $PSScriptRoot 'render-covers.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Cover rendering failed' }
}
$videoRaw = Join-Path $renderPath 'vertical-raw.mp4'
$coverJpg = Join-Path $renderPath 'cover-vertical.jpg'
& ffmpeg -hide_banner -y -framerate 30 -i $coverPng -framerate 30 -start_number 1 -i $frames -i $audioPath -frames:v 900 -filter_complex "[0:v]scale=1080:1440:flags=lanczos:in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p,setsar=1[cov];[1:v]scale=1080:1440:flags=lanczos:in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p,sidedata=mode=delete:type=ICC_PROFILE,setsar=1[main];[cov][main]concat=n=2:v=1:a=0,setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709,setsar=1[vout]" -map "[vout]" -map "2:a" -c:v libx264 -preset slow -crf 18 -r 30 -c:a aac -b:a 192k -ar 48000 -ac 2 -shortest -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -movflags +faststart $videoRaw
if ($LASTEXITCODE -ne 0) { throw 'Video encoding failed' }
& ffmpeg -hide_banner -y -i $coverPng -frames:v 1 -q:v 2 -update 1 $coverJpg
if ($LASTEXITCODE -ne 0) { throw 'Cover JPG conversion failed' }
& ffmpeg -hide_banner -y -i $videoRaw -i $coverJpg -map 0 -map 1 -c copy -disposition:v:1 attached_pic -metadata:s:v:1 title="Cover" -movflags +faststart $video
if ($LASTEXITCODE -ne 0) { throw 'Cover embedding failed' }
Remove-Item -Force -ErrorAction SilentlyContinue $videoRaw, $coverJpg
& ffmpeg -hide_banner -y -i $coverPng -c:v libwebp -quality 92 -update 1 $posterWebp
if ($LASTEXITCODE -ne 0) { throw 'Poster extraction failed' }
$probe = & ffprobe -v error -show_streams -show_format -of json $video | ConvertFrom-Json
$v = $probe.streams | Where-Object { $_.codec_type -eq 'video' -and $_.disposition.attached_pic -ne 1 }
$a = $probe.streams | Where-Object codec_type -eq 'audio'
$c = $probe.streams | Where-Object { $_.disposition.attached_pic -eq 1 }
if ($v.width -ne 1080 -or $v.height -ne 1440 -or $v.codec_name -ne 'h264' -or $v.pix_fmt -ne 'yuv420p' -or $v.r_frame_rate -ne '30/1' -or $v.nb_frames -ne '900' -or [double]$probe.format.duration -ne 30 -or $probe.streams.Count -ne 3 -or $null -eq $a -or $a.codec_name -ne 'aac' -or [int]$a.sample_rate -ne 48000 -or [int]$a.channels -ne 2 -or $null -eq $c -or $c.width -ne 1080 -or $c.height -ne 1440 -or $v.color_space -ne 'bt709' -or $v.color_transfer -ne 'bt709' -or $v.color_primaries -ne 'bt709') { throw 'Encoded stream does not match delivery specification' }
$probe | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $outputPath 'video-probe.json')
