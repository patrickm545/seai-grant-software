import { hash } from '@node-rs/argon2';

const passwordHashOptions = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32
} as const;

export async function hashPilotPassword(password: string) {
  if (password.length < 12) {
    throw new Error('Pilot passwords must contain at least 12 characters.');
  }

  return hash(password, passwordHashOptions);
}
