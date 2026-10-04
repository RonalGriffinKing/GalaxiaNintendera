$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot 'android'
$gradleWrapper = Join-Path $androidRoot 'gradlew.bat'
$env:GRADLE_USER_HOME = Join-Path $projectRoot '.gradle'

if (-not (Test-Path -LiteralPath $gradleWrapper)) {
  throw 'No se encontro el proyecto Android. Ejecuta npm run android:add primero.'
}

$userJdksRoot = Join-Path $env:USERPROFILE '.jdks'
$java21 = if (Test-Path -LiteralPath $userJdksRoot) {
  Get-ChildItem -LiteralPath $userJdksRoot -Directory |
    Where-Object { $_.Name -match '21' -and (Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe')) } |
    Select-Object -First 1
}

if ($java21) {
  $env:JAVA_HOME = $java21.FullName
}
elseif (-not $env:JAVA_HOME) {
  $androidStudioJava = 'C:\Program Files\Android\Android Studio\jbr'
  if (Test-Path -LiteralPath (Join-Path $androidStudioJava 'bin\java.exe')) {
    $env:JAVA_HOME = $androidStudioJava
  }
}

if (-not $env:ANDROID_HOME) {
  $localAndroidSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  if (Test-Path -LiteralPath $localAndroidSdk) {
    $env:ANDROID_HOME = $localAndroidSdk
  }
}

Push-Location $androidRoot
try {
  & $gradleWrapper assembleDebug
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
  Pop-Location
}

$apkPath = Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path -LiteralPath $apkPath)) {
  throw 'Gradle termino sin crear el APK esperado.'
}

Write-Host "APK creado: $apkPath"
