@echo off
setlocal
cd /d "%~dp0"
title Galaxia Nintendera - Subir a Git

echo Galaxia Nintendera - Publicar cambios en Git
echo Carpeta: %cd%
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo ERROR: Git no esta instalado o no esta disponible en PATH.
  goto :error
)

if not exist ".git" (
  echo ERROR: Esta carpeta no contiene el repositorio Git.
  goto :error
)

for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"
if /i not "%CURRENT_BRANCH%"=="main" (
  echo ERROR: La rama activa es "%CURRENT_BRANCH%" y la web publica desde "main".
  echo Cambia a main antes de volver a ejecutar este archivo.
  goto :error
)

where npm >nul 2>nul
if errorlevel 1 (
  echo AVISO: npm no esta disponible. Se omitira la comprobacion del build.
) else (
  echo Comprobando que la web compile correctamente...
  call npm run build
  if errorlevel 1 goto :command_error
)

git status --porcelain > "%TEMP%\galaxia-git-status.txt"
if errorlevel 1 goto :command_error

for %%A in ("%TEMP%\galaxia-git-status.txt") do set "STATUS_SIZE=%%~zA"
del "%TEMP%\galaxia-git-status.txt" >nul 2>nul

if "%STATUS_SIZE%"=="0" (
  echo.
  echo No hay cambios nuevos para crear un commit.
) else (
  echo.
  echo Preparando todos los cambios...
  git add -A
  if errorlevel 1 goto :command_error

  git commit -m "Actualizacion automatica"
  if errorlevel 1 goto :command_error
)

echo.
echo Subiendo la rama main al repositorio remoto...
git push origin main
if errorlevel 1 goto :command_error

echo.
echo LISTO: Los ultimos cambios ya estan publicados en Git.
echo.
pause
exit /b 0

:command_error
echo.
echo ERROR: Git o el build devolvieron un error.
echo Tus archivos no se han borrado. Revisa el mensaje mostrado arriba.

:error
echo.
pause
exit /b 1
