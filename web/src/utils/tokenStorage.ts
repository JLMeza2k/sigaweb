const TOKEN_KEY = 'sigaweb-token';
const LEGACY_KEY = 'token';

function safeRemove(key: string): void {
   try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
   } catch {
      // ignore storage errors (private mode / disabled storage)
   }
}

export function getStoredToken(): string {
   try {
      const persisted = window.localStorage.getItem(TOKEN_KEY);
      if (persisted) return persisted;
      // transitional: sessions started before the localStorage migration
      return window.sessionStorage.getItem(LEGACY_KEY) || '';
   } catch {
      return '';
   }
}

export function storeToken(token: string): void {
   try {
      window.localStorage.setItem(TOKEN_KEY, token);
      window.sessionStorage.removeItem(LEGACY_KEY);
   } catch {
      // ignore quota / private mode errors
   }
}

export function clearStoredToken(): void {
   safeRemove(TOKEN_KEY);
   safeRemove(LEGACY_KEY);
}

type SessionExpiredListener = () => void;

const listeners = new Set<SessionExpiredListener>();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
   listeners.add(listener);
   return () => {
      listeners.delete(listener);
   };
}

export function emitSessionExpired(): void {
   listeners.forEach((listener) => {
      try {
         listener();
      } catch {
         // ignore listener failures
      }
   });
}

// Endpoints where a 401 is a business error, not an expired session
const AUTH_FLOW_PATHS = new Set([
   'users/login',
   'users/send-reset-code',
   'users/verify-reset-code',
   'users/reset-password',
   'users/verify-activation-code',
]);

export function isSessionExpired(status: number, path: string, token: string): boolean {
   if (!token || token === 'NoToken') return false;
   if (AUTH_FLOW_PATHS.has(path)) return false;
   // 403 is only produced by checkToken when the JWT is missing/invalid/expired
   return status === 403 || status === 401;
}