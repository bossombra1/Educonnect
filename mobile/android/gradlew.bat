@echo off
setlocal
set "GRADLE_VERSION=9.3.1"
set "GRADLE_HOME=%USERPROFILE%\.gradle\wrapper\dists\gradle-%GRADLE_VERSION%-bin\educonnect"
set "GRADLE_ZIP=%TEMP%\gradle-%GRADLE_VERSION%-bin.zip"
if not exist "%GRADLE_HOME%\bin\gradle.bat" (
  echo Downloading Gradle %GRADLE_VERSION%...
  if not exist "%GRADLE_HOME%" mkdir "%GRADLE_HOME%"
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri 'https://services.gradle.org/distributions/gradle-%GRADLE_VERSION%-bin.zip' -OutFile '%GRADLE_ZIP%'; Expand-Archive -Path '%GRADLE_ZIP%' -DestinationPath '%GRADLE_HOME%' -Force"
  if errorlevel 1 exit /b %errorlevel%
  for /d %%D in ("%GRADLE_HOME%\gradle-%GRADLE_VERSION%") do move "%%D\*" "%GRADLE_HOME%" >nul
  rmdir /s /q "%GRADLE_HOME%\gradle-%GRADLE_VERSION%" 2>nul
  del /q "%GRADLE_ZIP%" 2>nul
)
call "%GRADLE_HOME%\bin\gradle.bat" %*
