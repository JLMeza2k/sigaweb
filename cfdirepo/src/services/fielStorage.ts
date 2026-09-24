// ── FIEL Client-Side Storage ─────────────────────────────────────────────
// Almacena la FIEL (PFX + password) en localStorage del navegador.
// Password cifrado con AES-256-GCM via Web Crypto API.

export interface FielRecord {
  nombre: string;
  vigencia: string | null;
  revocado: boolean;
}

export interface SaveFielPayload {
  nombre: string;
  password: string;
  rawFile: string; // base64-encoded PFX
  vigencia: string | null;
}

// ── localStorage keys ──────────────────────────────────────────────────

const KEYS = {
  pfx: "fiel_pfx",
  password: "fiel_password",
  nombre: "fiel_nombre",
  vigencia: "fiel_vigencia",
  revocado: "fiel_revocado",
} as const;

// ── Web Crypto encryption (AES-256-GCM) ────────────────────────────────

function bufToHex(buf: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuf(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function deriveKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(window.location.origin + "-getcfdis"),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("getcfdis-salt"), iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptPassword(password: string): Promise<string> {
  const key = await deriveKey();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(password),
  );
  return `${bufToHex(iv)}:${bufToHex(encrypted)}`;
}

async function decryptPassword(encryptedText: string): Promise<string> {
  const key = await deriveKey();
  const [ivHex, cipherHex] = encryptedText.split(":");
  const iv = hexToBuf(ivHex);
  const cipher = hexToBuf(cipherHex);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(decrypted);
}

// ── Public API ─────────────────────────────────────────────────────────

export async function saveFiel(
  payload: SaveFielPayload,
): Promise<{ success: boolean; nombre: string }> {
  const encryptedPw = await encryptPassword(payload.password);

  localStorage.setItem(KEYS.pfx, payload.rawFile);
  localStorage.setItem(KEYS.password, encryptedPw);
  localStorage.setItem(KEYS.nombre, payload.nombre);
  localStorage.setItem(KEYS.vigencia, payload.vigencia ?? "");
  localStorage.setItem(KEYS.revocado, "false");

  return { success: true, nombre: payload.nombre };
}

export async function listFieles(): Promise<FielRecord[]> {
  const nombre = localStorage.getItem(KEYS.nombre);
  if (!nombre) return [];

  return [
    {
      nombre,
      vigencia: localStorage.getItem(KEYS.vigencia) || null,
      revocado: localStorage.getItem(KEYS.revocado) === "true",
    },
  ];
}

export async function deleteFiel(
  _nombre: string,
): Promise<{ success: boolean }> {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  return { success: true };
}

export async function getFielPfx(
  _nombre: string,
): Promise<{ password: string; rawFile: string }> {
  const encryptedPw = localStorage.getItem(KEYS.password);
  const pfx = localStorage.getItem(KEYS.pfx);

  if (!encryptedPw || !pfx) {
    throw new Error("No se encontró la FIEL configurada");
  }

  return {
    password: await decryptPassword(encryptedPw),
    rawFile: pfx,
  };
}
