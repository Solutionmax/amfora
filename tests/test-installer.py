"""Installer control-flow tests: no network calls or real Docker mutations."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

INSTALLER = Path(__file__).resolve().parents[1] / 'site/get'

class InstallerTests(unittest.TestCase):
    def run_installer(self, mode='', args=('--docker',), existing=False):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            binary = root / 'bin'
            binary.mkdir()
            script = '''#!/usr/bin/python3
import os,sys,pathlib
args=sys.argv[1:]; tool=pathlib.Path(sys.argv[0]).name; mode=os.environ.get('CASE','')
with open(os.environ['LOG'],'a') as f:f.write(tool+' '+' '.join(args)+'\\n')
if tool=='git':
 if mode=='auth':sys.exit(1)
 if args[0]=='clone':
  p=pathlib.Path(args[-1]);p.mkdir();(p/'infra').mkdir();(p/'infra/build-docker.sh').write_text('exit '+('1' if mode=='build' else '0')+'\\n')
if tool=='docker':
 if args==['info']:sys.exit(1 if mode=='daemon' else 0)
 if args[:2]==['buildx','prune']:
  print('old options' if mode=='old' else '--max-used-space --reserved-space --min-free-space')
 if args[:1]==['inspect'] or args[:2]==['volume','inspect']:sys.exit(0 if mode=='existing-data' else 1)
 if args[:3]==['compose','up','-d']:sys.exit(1 if mode=='start' else 0)
'''
            for tool in ['git', 'docker']:
                p = binary / tool
                p.write_text(script)
                p.chmod(0o755)
            if existing:
                (root / 'amfora').mkdir()
                (root / 'amfora/keep').write_text('keep')
            env = dict(os.environ, PATH=str(binary)+':/usr/bin:/bin', CASE=mode, LOG=str(root/'calls'))
            # Feed stdin exactly as curl | sh does.
            result = subprocess.run(['sh', '-s', '--', *args], input=INSTALLER.read_text(), cwd=root, env=env, capture_output=True, text=True)
            calls = (root/'calls').read_text() if (root/'calls').exists() else ''
            if existing:self.assertEqual((root/'amfora/keep').read_text(), 'keep')
            return result, calls

    def test_success(self):
        r,c=self.run_installer(); self.assertEqual(r.returncode,0,r.stderr); self.assertIn('compose up -d --no-build',c); self.assertIn('localhost:5487',r.stdout)
    def test_help_without_dependencies(self):
        r,c=self.run_installer(args=('--help',)); self.assertEqual(r.returncode,0); self.assertEqual(c,'')
    def test_reject_php(self):
        r,c=self.run_installer(args=('--php',)); self.assertNotEqual(r.returncode,0); self.assertEqual(c,'')
    def test_existing_directory_untouched(self):
        r,c=self.run_installer(existing=True); self.assertNotEqual(r.returncode,0); self.assertNotIn('clone',c)
    def test_preflight_failures_do_not_clone(self):
        for mode in ['auth','daemon','old','existing-data']:
            with self.subTest(mode=mode):
                r,c=self.run_installer(mode); self.assertNotEqual(r.returncode,0); self.assertNotIn('git clone',c)
    def test_build_failure_does_not_start(self):
        r,c=self.run_installer('build'); self.assertNotEqual(r.returncode,0); self.assertNotIn('compose up',c)
    def test_start_failure_is_reported(self):
        r,c=self.run_installer('start'); self.assertNotEqual(r.returncode,0); self.assertNotIn('Installation complete',r.stdout)

if __name__ == '__main__': unittest.main()
