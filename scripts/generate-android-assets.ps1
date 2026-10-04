Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot 'public\icons\icon-512.png'
$resourceRoot = Join-Path $projectRoot 'android\app\src\main\res'

if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "No se encontro el icono fuente: $sourcePath"
}

if (-not (Test-Path -LiteralPath $resourceRoot)) {
  throw "No se encontro el proyecto Android. Ejecuta npm run android:add primero."
}

$source = [System.Drawing.Image]::FromFile($sourcePath)

function Write-ContainedPng {
  param(
    [Parameter(Mandatory = $true)][string]$OutputPath,
    [Parameter(Mandatory = $true)][int]$Width,
    [Parameter(Mandatory = $true)][int]$Height,
    [Parameter(Mandatory = $true)][double]$Scale,
    [System.Drawing.Color]$Background = [System.Drawing.Color]::Transparent
  )

  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
  $bitmap.SetResolution(144, 144)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear($Background)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $maxWidth = [Math]::Max(1, [int]($Width * $Scale))
  $maxHeight = [Math]::Max(1, [int]($Height * $Scale))
  $ratio = [Math]::Min($maxWidth / $source.Width, $maxHeight / $source.Height)
  $drawWidth = [Math]::Max(1, [int]($source.Width * $ratio))
  $drawHeight = [Math]::Max(1, [int]($source.Height * $ratio))
  $x = [int](($Width - $drawWidth) / 2)
  $y = [int](($Height - $drawHeight) / 2)

  $graphics.DrawImage($source, $x, $y, $drawWidth, $drawHeight)
  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

try {
  $densities = @{
    'mdpi' = 48
    'hdpi' = 72
    'xhdpi' = 96
    'xxhdpi' = 144
    'xxxhdpi' = 192
  }

  foreach ($density in $densities.Keys) {
    $size = $densities[$density]
    $folder = Join-Path $resourceRoot "mipmap-$density"
    Write-ContainedPng (Join-Path $folder 'ic_launcher.png') $size $size 0.94
    Write-ContainedPng (Join-Path $folder 'ic_launcher_round.png') $size $size 0.82 ([System.Drawing.Color]::FromArgb(255, 5, 8, 22))
    Write-ContainedPng (Join-Path $folder 'ic_launcher_foreground.png') ([int]($size * 2.25)) ([int]($size * 2.25)) 0.66
  }

  Get-ChildItem -LiteralPath $resourceRoot -Directory |
    Where-Object { $_.Name -like 'drawable-*' } |
    ForEach-Object {
      $splashPath = Join-Path $_.FullName 'splash.png'
      if (-not (Test-Path -LiteralPath $splashPath)) { return }
      $existing = [System.Drawing.Image]::FromFile($splashPath)
      $width = $existing.Width
      $height = $existing.Height
      $existing.Dispose()
      Write-ContainedPng $splashPath $width $height 0.36 ([System.Drawing.Color]::FromArgb(255, 5, 8, 22))
    }

  $baseSplash = Join-Path $resourceRoot 'drawable\splash.png'
  $existingBase = [System.Drawing.Image]::FromFile($baseSplash)
  $baseWidth = $existingBase.Width
  $baseHeight = $existingBase.Height
  $existingBase.Dispose()
  Write-ContainedPng $baseSplash $baseWidth $baseHeight 0.36 ([System.Drawing.Color]::FromArgb(255, 5, 8, 22))
}
finally {
  $source.Dispose()
}

Write-Host 'Iconos y splash de Android actualizados.'
