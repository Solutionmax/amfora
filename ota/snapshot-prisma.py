#!/usr/bin/env python3
"""SQLite-consistent metadata rollback snapshot; object storage is excluded."""
import os
import pathlib
import shutil
import sqlite3
import sys

source, destination = map(pathlib.Path, sys.argv[1:])
if not (source / 'amfora.db').is_file():
    raise SystemExit('Missing amfora.db; refusing an incomplete rollback snapshot')
# Never copy live database files or SQLite journals. SQLite backup reads one consistent view.
shutil.copytree(source, destination, ignore=shutil.ignore_patterns('*.db', '*.db-wal', '*.db-shm', '*.db-journal'))
for database in source.glob('*.db'):
    target = destination / database.name
    with sqlite3.connect(database.resolve().as_uri() + '?mode=ro', uri=True, timeout=30) as live:
        with sqlite3.connect(target) as snapshot:
            live.backup(snapshot, pages=-1, sleep=.01)
            if snapshot.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise SystemExit('SQLite snapshot integrity check failed')
    os.chmod(target, 0o600)
    with target.open('rb') as handle:
        os.fsync(handle.fileno())
