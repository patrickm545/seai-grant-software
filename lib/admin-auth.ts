import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'solar_admin_session';
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;
const textEncoder = new TextEncoder();

function getAdminPassword() {
  const configuredPassword = process.env.ADMIN_PASSWORD?.trim();
  if (configuredPassword) return configuredPassword;
  return process.env.NODE_ENV === 'production' ? null : 'admin123';
}

export function verifyAdminPassword(password: string) {
  const adminPassword = getAdminPassword();
  return !!adminPassword && password === adminPassword;
}

function getAdminSessionSecret() {
  const configuredSecret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (configuredSecret) return configuredSecret;
  return process.env.NODE_ENV === 'production' ? null : 'development-admin-session-secret';
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function signSessionValue(payload: string, secret: string) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, textEncoder.encode(payload));
  return toHex(signature);
}

async function signaturesMatch(left: string, right: string) {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

export async function createAdminSessionValue() {
  const adminSessionSecret = getAdminSessionSecret();
  if (!adminSessionSecret) {
    throw new Error('ADMIN_SESSION_SECRET must be set in production.');
  }

  const expiresAt = Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000;
  const payload = `v1.${expiresAt}`;
  const signature = await signSessionValue(payload, adminSessionSecret);
  return `${payload}.${signature}`;
}

export async function verifyAdminSessionValue(sessionValue?: string | null) {
  if (!sessionValue) return false;

  const adminSessionSecret = getAdminSessionSecret();
  if (!adminSessionSecret) return false;

  const [version, expiresAtRaw, signature] = sessionValue.split('.');
  if (version !== 'v1' || !expiresAtRaw || !signature) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expectedSignature = await signSessionValue(`v1.${expiresAtRaw}`, adminSessionSecret);
  return signaturesMatch(signature, expectedSignature);
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return verifyAdminSessionValue(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}
