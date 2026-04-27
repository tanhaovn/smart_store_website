@echo off
setlocal

echo === One-time snapshot sync MySQL local -> Postgres cloud ===
set "MYSQL_HOST=localhost"
set "MYSQL_PORT=3306"
set "MYSQL_USER=root"
set "MYSQL_DB=smart_store"

set /p MYSQL_PASSWORD=Nhap MYSQL_PASSWORD: 
set /p POSTGRES_URL=Nhap POSTGRES_URL (kem ?sslmode=require neu chua co): 

if "%MYSQL_PASSWORD%"=="" (
  echo MYSQL_PASSWORD khong duoc de trong.
  exit /b 1
)

if "%POSTGRES_URL%"=="" (
  echo POSTGRES_URL khong duoc de trong.
  exit /b 1
)

python scripts\sync_mysql_to_postgres.py
if errorlevel 1 (
  echo Sync that bai.
  exit /b 1
)

echo Snapshot sync thanh cong.
endlocal
