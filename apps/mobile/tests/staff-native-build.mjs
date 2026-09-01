// Local emulator validation only. The isolated staffValidation variant uses the
// mock API, a debug signing key, a distinct application ID, and testOnly=true.
// It is NEVER a production/release-distribution artifact. Install with adb -t.
import { spawn } from 'node:child_process';
import { mkdirSync, createWriteStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mobile = fileURLToPath(new URL('../', import.meta.url));
const out = path.resolve(mobile, '.expo/staff-native-validation');
mkdirSync(out, { recursive: true });
const dryRun = process.argv.includes('--dry-run');
const manifestOnly = process.argv.includes('--manifest-only');
const bundleOnly = process.argv.includes('--bundle-only');
const log = createWriteStream(path.join(out, dryRun ? 'build-dry-run.log' : manifestOnly ? 'build-manifest.log' : bundleOnly ? 'build-bundle.log' : 'build.log'));
const initScript = fileURLToPath(new URL('./staff-native-validation.init.gradle', import.meta.url));
const task = manifestOnly ? ':app:processStaffValidationMainManifest' : bundleOnly ? ':app:createBundleStaffValidationJsAndAssets' : ':app:assembleStaffValidation';
const args = [task, '--init-script', initScript, '-PreactNativeArchitectures=x86_64', '--no-daemon', '--max-workers=2', '--console=plain'];
if (dryRun) args.push('--dry-run');
if (!process.argv.includes('--online')) args.push('--offline');
const child = spawn('cmd.exe', ['/d', '/c', 'gradlew.bat', ...args], {
  cwd: path.join(mobile, 'android'), windowsHide: true,
  env: { ...process.env, NODE_ENV: 'production', EXPO_NO_METRO_WORKSPACE_ROOT: '1', EXPO_PUBLIC_API_URL: 'http://127.0.0.1:8100' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
for (const stream of [child.stdout, child.stderr]) stream.on('data', (data) => { process.stdout.write(data); log.write(data); });
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; log.end(); });
child.on('close', (code) => { log.end(); process.exitCode = code ?? 1; });
