import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { ReadStream, WriteStream } from 'node:tty';
import {
  readConfirmedHiddenCredential,
  readHiddenCredential,
  SecureCredentialInputError
} from '../../lib/secure-credential-input';

function fakeTerminal() {
  const input = new EventEmitter() as EventEmitter & {
    isTTY: boolean;
    setRawMode: (enabled: boolean) => void;
    resume: () => void;
    pause: () => void;
    setEncoding: (encoding: string) => void;
  };
  const rawModes: boolean[] = [];
  input.isTTY = true;
  input.setRawMode = (enabled) => rawModes.push(enabled);
  input.resume = () => undefined;
  input.pause = () => undefined;
  input.setEncoding = () => undefined;
  const outputText: string[] = [];
  const output = {
    isTTY: true,
    write: (value: string) => {
      outputText.push(value);
      return true;
    }
  };
  return {
    input: input as unknown as ReadStream,
    output: output as unknown as WriteStream,
    rawModes,
    outputText
  };
}

test('hidden credential input returns the value without echoing it', async () => {
  const terminal = fakeTerminal();
  const secret = 'Temporary!Credential!47';
  const pending = readHiddenCredential(terminal.input, terminal.output);
  terminal.input.emit('data', `${secret}\r`);
  assert.equal(await pending, secret);
  assert.deepEqual(terminal.rawModes, [true, false]);
  assert.ok(!terminal.outputText.join('').includes(secret));
});

test('hidden credential input fails closed outside a private interactive terminal', async () => {
  const terminal = fakeTerminal();
  (terminal.input as unknown as { isTTY: boolean }).isTTY = false;
  await assert.rejects(
    readHiddenCredential(terminal.input, terminal.output),
    (error: unknown) => error instanceof SecureCredentialInputError
  );
});

test('hidden credential input requires an exact second entry', async () => {
  const prompts: string[] = [];
  const values = ['Temporary!Credential!47', 'Different!Credential!48'];
  await assert.rejects(
    readConfirmedHiddenCredential(async (prompt) => {
      prompts.push(prompt);
      return values.shift()!;
    }),
    (error: unknown) => error instanceof SecureCredentialInputError
  );
  assert.equal(prompts.length, 2);
});

test('Production recovery command exposes no password argument or environment-variable fallback', () => {
  const command = readFileSync('scripts/reissue-production-credential.ts', 'utf8');
  assert.match(command, /readConfirmedHiddenCredential/);
  assert.match(command, /--confirm-production/);
  assert.match(command, /--plan-reference/);
  assert.doesNotMatch(command, /--password|--credential(?:\s|['"`])|PILOT_OWNER_PASSWORD|TEMPORARY_PASSWORD/);
  assert.doesNotMatch(command, /console\.(?:log|error)\([^\n)]*temporaryCredential/);
});
