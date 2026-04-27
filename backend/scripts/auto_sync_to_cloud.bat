@echo off
setlocal

set "MYSQL_HOST=localhost"
set "MYSQL_PORT=3306"
set "MYSQL_USER=root"
set "MYSQL_DB=smart_store"

if "%AUTO_SYNC_INTERVAL_SECONDS%"=="" set "AUTO_SYNC_INTERVAL_SECONDS=60"

echo === Periodic snapshot sync MySQL local -> Postgres cloud ===
echo Interval: %AUTO_SYNC_INTERVAL_SECONDS%s

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

python scripts\auto_sync_to_cloud.py
