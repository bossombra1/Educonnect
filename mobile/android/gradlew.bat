@echo off
setlocal

set "GRADLE_VERSION=9.3.1"
set "GRADLE_BASE=%USERPROFILE%\.gradle\educonnect-gradle"
set "GRADLE_HOME=%GRADLE_BASE%\gradle-%GRADLE_VERSION%"
set "GRADLE_ZIP=%TEMP%\educonnect-gradle-%GRADLE_VERSION%-bin.zip"

if not exist "%GRADLE_HOME%\bin\gradle.bat" (
  echo Downloading Gradle %GRADLE_VERSION%...
  if not exist "%GRADLE_BASE%" mkdir "%GRADLE_BASE%"

  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Invoke-WebRequest -UseBasicParsing -Uri 'https://services.gradle.org/distributions/gradle-%GRADLE_VERSION%-bin.zip' -OutFile '%GRADLE_ZIP%'; Expand-Archive -Path '%GRADLE_ZIP%' -DestinationPath '%GRADLE_BASE%' -Force; Remove-Item '%GRADLE_ZIP%' -Force"
  if errorlevel 1 (
    echo Failed to download or extract Gradle %GRADLE_VERSION%.
    exit /b 1
  )
)

if not exist "%GRADLE_HOME%\bin\gradle.bat" (
  echo Gradle %GRADLE_VERSION% was not installed correctly.
  exit /b 1
)

call "%GRADLE_HOME%\bin\gradle.bat" %*
exit /b %errorlevel%
