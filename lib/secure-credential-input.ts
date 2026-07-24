import type { ReadStream, WriteStream } from 'node:tty';

export class SecureCredentialInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecureCredentialInputError';
  }
}

export async function readHiddenCredential(
  input: ReadStream = process.stdin,
  output: WriteStream = process.stderr,
  prompt = 'Temporary credential (input hidden): '
) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') {
    throw new SecureCredentialInputError(
      'A private interactive terminal is required for credential entry.'
    );
  }

  output.write(prompt);
  input.setRawMode(true);
  input.resume();
  input.setEncoding('utf8');

  return new Promise<string>((resolve, reject) => {
    let value = '';
    const finish = (error?: Error) => {
      input.off('data', onData);
      input.setRawMode(false);
      input.pause();
      output.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk: string | Buffer) => {
      for (const character of String(chunk)) {
        if (character === '\u0003') {
          finish(new SecureCredentialInputError('Credential entry was cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        if (/[\u0000-\u001f\u007f]/.test(character)) {
          finish(new SecureCredentialInputError('Credential entry contained an unsupported control character.'));
          return;
        }
        if (value.length >= 128) {
          finish(new SecureCredentialInputError('Credential entry exceeded the maximum length.'));
          return;
        }
        value += character;
      }
    };
    input.on('data', onData);
  });
}

export async function readConfirmedHiddenCredential(
  reader: (prompt: string) => Promise<string> = (prompt) =>
    readHiddenCredential(process.stdin, process.stderr, prompt)
) {
  const credential = await reader('Temporary credential (input hidden): ');
  const confirmation = await reader('Confirm temporary credential (input hidden): ');
  if (credential !== confirmation) {
    throw new SecureCredentialInputError('Credential confirmation did not match.');
  }
  return credential;
}
