@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ========================================
echo   Feed - MongoDB 연동 서버
echo  ========================================
echo.

if not exist ".env" (
  echo  [안내] .env 파일이 없습니다.
  echo  1. .env.example 을 복사해 .env 생성
  echo  2. MONGODB_URI 에 Atlas 비밀번호 입력
  echo  3. npm install ^&^& npm run seed ^&^& npm start
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo  패키지 설치 중...
  call npm install
)

echo  서버 시작 (포트 8080)...
echo  PC: http://localhost:8080
echo.
call npm start
