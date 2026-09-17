import os, subprocess, tempfile
from pathlib import Path
script=str(Path(__file__).resolve().with_name('build-docker.sh'))
with tempfile.TemporaryDirectory() as d:
 p=Path(d); log=p/'calls'
 (p/'docker').write_text('#!/bin/sh\nprintf "%s\\n" "$*" >> "$CALLS"\ncase "$*" in *inspect*) exit 1;; *"buildx build"*) exit "${BUILD_EXIT:-0}";; esac\n')
 (p/'docker').chmod(0o755)
 env={**os.environ,'PATH':d+':'+os.environ['PATH'],'CALLS':str(log)}
 for mode,code in [('local',0),('push',0),('local',7)]:
  log.write_text('');r=subprocess.run(['bash',script,'test',mode],env={**env,'BUILD_EXIT':str(code)},capture_output=True,text=True)
  calls=log.read_text();assert r.returncode==code,(r,calls)
  assert '--no-cache' not in calls and '--buildkitd-config infra/buildkitd.toml' in calls
  assert 'prune --builder amfora-builder --force --max-used-space 4GB' in calls
  assert ('--load -t amfora:test' in calls) if mode=='local' else ('--push' in calls)
  assert '--push' not in calls if mode=='local' else True
 for tag,mode in [('../bad','local'),('ok','wrong'),('','local')]:
  log.write_text('');r=subprocess.run(['bash',script,tag,mode],env=env,capture_output=True);assert r.returncode==2 and not log.read_text()
 (p/'git').write_text('#!/bin/sh\nexit 1\n'); (p/'git').chmod(0o755)
 log.write_text('')
 r=subprocess.run(['bash',script,'archive','local'],env=env,capture_output=True)
 assert r.returncode==0 and 'org.opencontainers.image.revision=unknown' in log.read_text()
print('Build wrapper: local, explicit publish, failure cleanup, invalid input, source archive PASS')
