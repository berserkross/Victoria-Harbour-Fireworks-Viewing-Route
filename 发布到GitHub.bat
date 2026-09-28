@echo off
chcp 65001 >nul
setlocal
rem ============================================================
rem  发布到GitHub.bat
rem  双击本文件，把网页上传到你的 GitHub 仓库，并自动开启网页发布。
rem
rem  有两条路径，脚本会自动选：
rem    A. 找得到令牌  -> 走 GitHub API 上传，并顺手开启 GitHub Pages
rem    B. 找不到令牌  -> 走普通 git push，会弹出浏览器让你登录授权
rem ============================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo   准备上传到：
echo   https://github.com/berserkross/Victoria-Harbour-Fireworks-Viewing-Route
echo ============================================================
echo.

if exist "E:\dsh-token.txt" goto api
if exist "%~dp0.token.txt" goto api

echo [方式 B] 未找到令牌文件，改用 git push。
echo         如果弹出浏览器，请登录 GitHub 并点「授权」。
echo.
git push -u origin main
if errorlevel 1 goto failed
goto ok

:api
echo [方式 A] 找到令牌，走 GitHub API 上传（并自动开启 Pages）...
echo.
node "%~dp0upload.mjs" --with-pages
if errorlevel 1 goto failed

:ok
echo.
echo ============================================================
echo   上传成功！
echo.
echo   网页地址（Pages 首次构建约需 1-2 分钟）：
echo   https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/
echo.
echo   仓库地址：
echo   https://github.com/berserkross/Victoria-Harbour-Fireworks-Viewing-Route
echo ============================================================
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo   上传失败。常见原因：
echo.
echo   1) 令牌无效或权限不足 —— 需要该仓库的 Contents: Read and write
echo   2) 网络问题 —— 检查网络后重试
echo   3) 仓库不存在 —— 确认 github.com 上已有同名仓库
echo ============================================================
echo.
pause
exit /b 1
