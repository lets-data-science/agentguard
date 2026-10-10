"""Package the local AgentGuard preview from an explicit source allowlist.

Never include generated runtime state, keys, images, evidence, or dependencies.
Use --verify to extract both variants into fresh temporary folders and run tests.
"""
from pathlib import Path
import hashlib,json,re,subprocess,sys,tempfile,zipfile
SOURCE=Path(__file__).resolve().parents[1]
DEST=SOURCE.parent/'bundles'/'agentguard'
FILES=('.github/workflows/check.yml','CONTRIBUTORS.md',
 '.env.example','.gitignore','package.json','package-lock.json','README.md','LICENSE','NOTICE','Dockerfile',
 'server/index.mjs','server/openshell.mjs','ui/index.html','ui/app.js','ui/styles.css','ui/lds-logo.svg',
 'learner/policy.mjs','learner/evidence.mjs','learner/report.mjs','scripts/restore.mjs','scripts/build-bundles.py',
 'test/policy.test.mjs','docs/BUILD.md','docs/DESIGN.md','docs/VERIFICATION.md','docs/WALKTHROUGH-SCRIPT.md',
)
MODULES=('policy','evidence','report')
STUBS={
 'policy':"/** Return a validated CLI argument array for one read-only network grant. */\nexport function policyArguments(sandbox) {\n  throw new Error('Implement learner/policy.mjs: validate the lab sandbox and grant one read-only endpoint.');\n}\n",
 'evidence':"/** Return allowed, blocked or inconclusive based on actual runtime evidence. */\nexport function classifyEvidence(result, expected) {\n  throw new Error('Implement learner/evidence.mjs: a failed connection alone is not a policy verdict.');\n}\n",
 'report':"/** Require all four distinct checks and a completed, error-free run. */\nexport function buildReport(run) {\n  throw new Error('Implement learner/report.mjs: incomplete or duplicate checks must require review.');\n}\n",
}
def read_source(name):
 source=SOURCE/name
 if not source.is_file() or source.is_symlink():raise ValueError(f'Missing or unsafe source entry: {name}')
 data=source.read_bytes()
 if re.search(rb'(?:AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9]{24,}|sk_[A-Za-z0-9]{32,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)',data):raise ValueError(f'Credential-like content found: {name}')
 return data

def build():
 version=json.loads(read_source('package.json'))['version']
 if not re.fullmatch(r'\d+\.\d+\.\d+',version):raise ValueError('A stable semantic version is required')
 DEST.mkdir(parents=True,exist_ok=True)
 variants={}
 for variant in ('starter','reference'):
  files={name:read_source(name) for name in FILES}
  for module in MODULES:
   # Recovery checkpoints always match the exact completed source in this archive.
   files[f'checkpoints/{module}.mjs']=read_source(f'learner/{module}.mjs')
   if variant=='starter':files[f'learner/{module}.mjs']=STUBS[module].encode()
  if variant=='starter':files['starter.json']=(json.dumps({'project':'agentguard','modules':list(MODULES)})+'\n').encode()
  filename=f'agentguard-{variant}-{version}.zip';destination=DEST/filename
  with zipfile.ZipFile(destination,'w',compression=zipfile.ZIP_DEFLATED)as archive:
   for name,data in files.items():
    info=zipfile.ZipInfo(f'agentguard/{name}',(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;archive.writestr(info,data)
  payload=destination.read_bytes();variants[variant]={'filename':filename,'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest(),'files':list(files)}
  print(f'{variant}: {len(files)} reviewed files, {len(payload)} bytes')
 manifest={'project':'agentguard','version':version,**variants['reference'],'variants':variants}
 (DEST/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 return manifest

def verify(manifest):
 results=[]
 for variant,details in manifest['variants'].items():
  with tempfile.TemporaryDirectory(prefix=f'lds-agentguard-{variant}-')as temporary:
   with zipfile.ZipFile(DEST/details['filename'])as archive:
    names=archive.namelist()
    for name in names:
     parts=Path(name).parts
     if '..' in parts or Path(name).is_absolute() or any(part in parts for part in ('.data','.env','.env.local','.backups','node_modules')):raise ValueError(f'Unsafe package entry: {name}')
    archive.extractall(temporary)
   target=Path(temporary)/'agentguard'
   first=subprocess.run(['npm','test'],cwd=target,capture_output=True,text=True)
   if variant=='starter':
    if first.returncode==0 or 'Implement learner/' not in first.stdout+first.stderr:raise ValueError('Fresh starter must fail its intentional learner exercises')
    for module in MODULES:subprocess.run(['npm','run','restore','--',module],cwd=target,check=True,capture_output=True)
    restored=subprocess.run(['npm','test'],cwd=target,capture_output=True,text=True)
    if restored.returncode:raise ValueError(restored.stdout+restored.stderr)
    if len(list((target/'.backups').glob('*.mjs')))!=3:raise ValueError('Restore did not preserve all three original learner files')
   elif first.returncode:raise ValueError(first.stdout+first.stderr)
   syntax=subprocess.run(['npm','run','check'],cwd=target,capture_output=True,text=True)
   if syntax.returncode:raise ValueError(syntax.stdout+syntax.stderr)
   results.append({'variant':variant,'archiveFiles':len(names),'initialTestsExitCode':first.returncode,'restoredTestsPassed':variant=='starter','syntaxPassed':True,'sha256':details['sha256']})
 (DEST/'verification.json').write_text(json.dumps({'checks':results,'scope':'Offline contracts and clean archive recovery only; real OpenShell enforcement is verified separately.'},indent=2)+'\n')
 print(json.dumps(results))

if __name__=='__main__':
 manifest=build()
 if '--verify' in sys.argv:verify(manifest)
