import os
from pathlib import Path

import pymysql
import pymysql.cursors
from dbutils.pooled_db import PooledDB
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

DB_CONFIG = {
    "host": os.getenv("DB_HOST", ""),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", ""),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", ""),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}

# PooledDB is thread-safe: each thread gets its own dedicated connection
# from the pool and returns it when done. mincached=2 keeps 2 connections
# alive at startup; maxcached=10 is the upper idle limit.
_pool: PooledDB = PooledDB(
    creator=pymysql,
    mincached=2,
    maxcached=3,
    maxconnections=4,
    blocking=True,
    ping=1,          # ping before returning a connection to check it's alive
    **DB_CONFIG,
)


def get_db_connection() -> pymysql.connections.Connection:
    """Returns a thread-local connection from the pool."""
    return _pool.connection()
