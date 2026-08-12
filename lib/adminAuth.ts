export const ADMIN_COOKIE = "the-path-admin-session";
const SESSION_LENGTH_SECONDS = 60 * 60 * 8;

function config() {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  return password && secret ? { password, secret } : null;
}

export function adminAccessConfigured() {
  return config() !== null;
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64Url(new Uint8Array(signature));
}

function secureEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function validAdminPassword(candidate: string) {
  const settings = config();
  if (!settings || !candidate) return false;
  const [candidateSignature, passwordSignature] = await Promise.all([
    sign(`password:${candidate}`, settings.secret),
    sign(`password:${settings.password}`, settings.secret),
  ]);
  return secureEqual(candidateSignature, passwordSignature);
}

export async function createAdminSession() {
  const settings = config();
  if (!settings) return null;

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_LENGTH_SECONDS;
  const nonce = new Uint8Array(16);
  crypto.getRandomValues(nonce);
  const encodedNonce = base64Url(nonce);
  const payload = `${expiresAt}.${encodedNonce}`;
  return `${payload}.${await sign(payload, settings.secret)}`;
}

export async function validAdminSession(token: string | undefined) {
  const settings = config();
  if (!settings || !token) return false;

  const [expiresAt, nonce, signature] = token.split(".");
  if (!expiresAt || !nonce || !signature || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;

  return secureEqual(signature, await sign(`${expiresAt}.${nonce}`, settings.secret));
}

export const adminSessionMaxAge = SESSION_LENGTH_SECONDS;
