import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';

export type BoundedProcessResult = {
  stage: string;
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: Buffer;
  stderr: Buffer;
  durationMs: number;
  timedOut: boolean;
};

export type BoundedProcessOptions = {
  stage: string;
  program: string;
  arguments: readonly string[];
  timeoutMs: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdio?: 'pipe' | 'ignore';
  mirrorOutput?: boolean;
  platform?: NodeJS.Platform;
  spawnProcess?: typeof spawn;
  terminateProcessTree?: (process: ChildProcessWithoutNullStreams) => void;
  expectedExitCodes?: readonly number[];
};

const stagePattern = /^[a-z][a-z0-9-]{1,79}$/;

export class BoundedProcessTimeoutError extends Error {
  constructor(
    public readonly stage: string,
    public readonly timeoutMs: number,
    public readonly result: BoundedProcessResult
  ) {
    super(`PREPRODUCTION_VALIDATION_TIMEOUT: stage=${stage}; timeoutMs=${timeoutMs}`);
    this.name = 'BoundedProcessTimeoutError';
  }
}

export class BoundedProcessExitError extends Error {
  constructor(public readonly result: BoundedProcessResult) {
    super(
      `PREPRODUCTION_VALIDATION_FAILED: stage=${result.stage}; exitCode=${result.status ?? 'null'}`
    );
    this.name = 'BoundedProcessExitError';
  }
}

function defaultTerminateProcessTree(
  child: ChildProcessWithoutNullStreams,
  platform: NodeJS.Platform
) {
  if (!child.pid) return;
  if (platform === 'win32') {
    spawnSync('C:\\Windows\\System32\\taskkill.exe', [
      '/PID',
      String(child.pid),
      '/T',
      '/F'
    ], {
      shell: false,
      windowsHide: true,
      stdio: 'ignore'
    });
    if (!child.killed) child.kill('SIGKILL');
    return;
  }
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    child.kill('SIGKILL');
  }
}

export async function runBoundedProcess(
  options: BoundedProcessOptions
): Promise<BoundedProcessResult> {
  if (!stagePattern.test(options.stage)) {
    throw new Error('PREPRODUCTION_VALIDATION_UNSAFE: invalid stage name.');
  }
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1) {
    throw new Error('PREPRODUCTION_VALIDATION_UNSAFE: invalid stage timeout.');
  }
  if (!options.program.trim() || options.arguments.some((value) => typeof value !== 'string')) {
    throw new Error('PREPRODUCTION_VALIDATION_UNSAFE: invalid process boundary.');
  }
  const expectedExitCodes = options.expectedExitCodes ?? [0];
  if (
    expectedExitCodes.length === 0 ||
    expectedExitCodes.some((value) => !Number.isSafeInteger(value) || value < 0)
  ) {
    throw new Error('PREPRODUCTION_VALIDATION_UNSAFE: invalid expected exit codes.');
  }

  const platform = options.platform ?? process.platform;
  const spawnProcess = options.spawnProcess ?? spawn;
  const startedAt = performance.now();
  const stdio = options.stdio ?? 'pipe';
  const child = spawnProcess(options.program, [...options.arguments], {
    cwd: options.cwd,
    env: options.env,
    shell: false,
    windowsHide: true,
    detached: platform !== 'win32',
    stdio: stdio === 'pipe' ? 'pipe' : 'ignore'
  }) as ChildProcessWithoutNullStreams;
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  if (stdio === 'pipe') {
    child.stdout.on('data', (chunk: Buffer) => {
      stdout.push(Buffer.from(chunk));
      if (options.mirrorOutput) process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr.push(Buffer.from(chunk));
      if (options.mirrorOutput) process.stderr.write(chunk);
    });
  }

  let timedOut = false;
  const result = await new Promise<BoundedProcessResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      timedOut = true;
      (options.terminateProcessTree ?? ((process_) => defaultTerminateProcessTree(process_, platform)))(
        child
      );
    }, options.timeoutMs);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(new Error(`PREPRODUCTION_VALIDATION_LAUNCH_FAILED: stage=${options.stage}; code=${(error as NodeJS.ErrnoException).code ?? 'UNKNOWN'}`));
    });
    child.once('close', (status, signal) => {
      clearTimeout(timer);
      resolve({
        stage: options.stage,
        status,
        signal,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
        durationMs: Math.round(performance.now() - startedAt),
        timedOut
      });
    });
  });

  if (result.timedOut) {
    throw new BoundedProcessTimeoutError(options.stage, options.timeoutMs, result);
  }
  if (result.status === null || !expectedExitCodes.includes(result.status)) {
    throw new BoundedProcessExitError(result);
  }
  return result;
}
