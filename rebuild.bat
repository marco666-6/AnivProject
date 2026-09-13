@echo off
REM ===================================================================
REM  Aniv - full clean rebuild
REM  Double-click this file, or run it from a terminal in this folder.
REM
REM  WARNING: the -v flag deletes the aniv-data volume, so Aby scores,
REM  unlocked messages, hearted photos and replies get wiped.
REM  Remove -v below if you want to keep them.
REM ===================================================================

cd /d "%~dp0"
title Aniv - rebuild

echo.
echo === docker compose down -v --rmi all ===
docker compose down -v --rmi all
if errorlevel 1 goto fail_down

echo.
echo === docker compose up -d --build ===
docker compose up -d --build
if errorlevel 1 goto fail_up

echo.
docker compose ps

echo.
echo Nunggu server siap...
timeout /t 8 /nobreak >nul
curl -fsS http://localhost:3000/api/health
if errorlevel 1 goto not_ready

echo.
echo.
echo Beres. Buka http://localhost:3000
start "" http://localhost:3000
goto done

:fail_down
echo.
echo Gagal di step down. Docker Desktop-nya udah jalan belum?
goto done

:fail_up
echo.
echo Build gagal. Scroll ke atas buat lihat errornya.
goto done

:not_ready
echo.
echo Container jalan tapi belum bales. Cek: docker compose logs -f
goto done

:done
echo.
pause
