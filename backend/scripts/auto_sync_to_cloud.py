import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def main() -> int:
    interval = int(os.getenv("AUTO_SYNC_INTERVAL_SECONDS", "60"))
    if interval < 10:
        interval = 10

    script_dir = Path(__file__).resolve().parent
    sync_script = script_dir / "sync_mysql_to_postgres.py"

    print(f"[{_now()}] Snapshot sync started. Interval={interval}s")
    print(f"[{_now()}] Running: {sync_script}")

    while True:
        started = time.time()
        result = subprocess.run([sys.executable, str(sync_script)], cwd=script_dir.parent)

        if result.returncode == 0:
            print(f"[{_now()}] Snapshot sync success")
        else:
            print(f"[{_now()}] Snapshot sync failed with code {result.returncode}")

        elapsed = int(time.time() - started)
        sleep_for = max(1, interval - elapsed)
        print(f"[{_now()}] Next sync in {sleep_for}s")
        time.sleep(sleep_for)


if __name__ == "__main__":
    raise SystemExit(main())
