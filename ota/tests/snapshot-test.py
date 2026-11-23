import pathlib
import sqlite3
import subprocess
import tempfile
import threading
import time
import unittest


class SnapshotTest(unittest.TestCase):
    def test_sustained_writer(self):
        for journal_mode in ('DELETE', 'WAL'):
            with self.subTest(journal_mode=journal_mode), tempfile.TemporaryDirectory() as tmp:
                root = pathlib.Path(tmp)
                source = root / 'prisma'
                source.mkdir()
                dest = root / 'snapshot'
                db = source / 'amfora.db'
                c = sqlite3.connect(db)
                c.execute(f'PRAGMA journal_mode={journal_mode}')
                c.execute('CREATE TABLE rows(id INTEGER PRIMARY KEY, value TEXT)')
                c.execute("INSERT INTO rows VALUES(1,'committed-before')")
                c.executemany('INSERT INTO rows(value) VALUES(?)', [('x' * 1024,)] * 5000)
                c.commit()
                c.close()
                stop = threading.Event()
                errors = []

                def writer():
                    try:
                        w = sqlite3.connect(db, timeout=30)
                        while not stop.is_set():
                            w.execute("INSERT INTO rows(value) VALUES('writer')")
                            w.commit()
                            time.sleep(.001)
                        w.close()
                    except Exception as error:
                        errors.append(error)

                worker = threading.Thread(target=writer)
                worker.start()
                try:
                    for n in range(4):
                        target = dest / str(n)
                        subprocess.run(['python3', str(pathlib.Path(__file__).parents[1] / 'snapshot-prisma.py'), str(source), str(target)], check=True)
                        restored = sqlite3.connect(target / 'amfora.db')
                        self.assertEqual(restored.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
                        self.assertEqual(restored.execute('SELECT value FROM rows WHERE id=1').fetchone()[0], 'committed-before')
                        count, max_id = restored.execute('SELECT count(*),max(id) FROM rows').fetchone()
                        self.assertEqual(count, max_id)
                        self.assertGreater(count, 5001)
                        restored.close()
                finally:
                    stop.set()
                    worker.join()
                self.assertEqual(errors, [])


unittest.main()
