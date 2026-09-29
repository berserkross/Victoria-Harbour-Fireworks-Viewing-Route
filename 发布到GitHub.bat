@echo off
chcp 65001 >nul
setlocal
rem ============================================================
rem  发布到GitHub.bat
rem  双击本文件，把网页上传到你的 GitHub 仓库。
rem
rem  流程：
rem    1. 先跑 check.mjs 体检（标签配平 / 锚点死链 / 资源 / 体积）
rem    2. 体检有问题会停下来问你，要不要照样上传
rem    3. 上传（自动二选一）：
rem         A. 找得到令牌  -> 走 GitHub API 上传
rem         B. 找不到令牌  -> 走普通 git push，弹浏览器登录授权
rem ============================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo   准备上传到：
echo   https://github.com/berserkross/Victoria-Harbour-Fireworks-Viewing-Route
echo ============================================================
echo.

rem ---------- 第 1 步：体检 ----------
set "CHECKLOG=%TEMP%\fireworks-check.log"
echo [1/2] 网页体检...
echo.
node "%~dp0check.mjs" > "%CHECKLOG%" 2>&1
set CHK=%errorlevel%
type "%CHECKLOG%"
del "%CHECKLOG%" >nul 2>&1
echo.

if not "%CHK%"=="0" goto checkfail
echo   体检通过，继续上传。
echo.
goto upload

:checkfail
echo ============================================================
echo   体检发现问题。上面带 ✗ 的就是。
echo.
echo   常见情况与处理：
echo     · 锚点死链   -> 改了标题文字，但目录里的 #链接 没跟着改
echo     · 标签不配平 -> 手改 HTML 时删多了或漏了闭合标签
echo     · 资源不存在 -> 图片/视频路径写错，或文件被移走
echo ============================================================
echo.
choice /c YN /n /m "  仍然要上传吗？[Y=上传 / N=停下修改] "
if errorlevel 2 goto aborted
echo.
echo   好，照样上传。
echo.

rem ---------- 第 2 步：上传 ----------
:upload
if exist "E:\dsh-token.txt" goto api
if exist "%~dp0.token.txt" goto api

echo [方式 B] 未找到令牌文件，改用 git push。
echo         如果弹出浏览器，请登录 GitHub 并点「授权」。
echo.
git push -u origin main
if errorlevel 1 goto failed
goto ok

:api
echo [方式 A] 找到令牌，走 GitHub API 上传...
echo.
node "%~dp0upload.mjs" --with-pages
if errorlevel 1 goto failed

:ok
echo.
echo ============================================================
echo   上传成功！
echo.
echo   网页地址（Pages 构建约需 1-2 分钟）：
echo   https://berserkross.github.io/Victoria-Harbour-Fireworks-Viewing-Route/
echo.
echo   仓库地址：
echo   https://github.com/berserkross/Victoria-Harbour-Fireworks-Viewing-Route
echo ============================================================
echo.
pause
exit /b 0

:aborted
echo.
echo ============================================================
echo   已取消上传，什么都没改。
echo.
echo   修好之后再双击本文件即可。
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
