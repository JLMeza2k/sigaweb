import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, type Colors, type ColorScheme, type ThemeMode } from './theme';
import type { RequiredAction, Area } from '../types/catalogos';


export interface User {
	IdUser: number;
	RFC: string;
	Nombre: string;
	eMail: string;
	Profile: string;
	Activo: boolean;
	sideBarOpcs: string | null;
}

export interface AuthSlice {
	token: string | null;
	user: User | null | undefined;
	isHydrated: boolean;
	login(identifier: string, password: string): Promise<void>;
	logout(): Promise<void>;
	authedFetch(path: string, init?: RequestInit): Promise<Response>;
}

export interface ApiSlice {
	API_URL: string;
	setApiUrl(url: string): void;
}

export interface ThemeSlice {
	mode: ThemeMode;
	scheme: ColorScheme;
	colors: Colors;
	setMode(mode: ThemeMode): Promise<void>;
}

export interface CatalogosSlice {
	requiredActions: RequiredAction[];
	allAreas: Area[];
	loadingRequiredActions: boolean;
	loadingAreas: boolean;
	loadRequiredActions: () => Promise<RequiredAction[]>;
	loadAreas: () => Promise<Area[]>;
}

export type AppState = {
	auth: AuthSlice;
	api: ApiSlice;
	theme: ThemeSlice;
	catalogos: CatalogosSlice;
};

const TOKEN_KEY = '@sigamovil/token';
const THEME_KEY = '@sigamovil/theme-mode';
//const DEFAULT_API_URL = 'http://192.168.68.101:3000/api';
//const DEFAULT_API_URL = 'http://10.3.1.228:3000/api';
const DEFAULT_API_URL = 'https://sigaweb-delta.vercel.app/api';

const AppContext = createContext<AppState | null>(null);

interface ContextProviderProps {
	children: ReactNode;
}

function isThemeMode(value: unknown): value is ThemeMode {
	return value === 'light' || value === 'dark' || value === 'system';
}

export function ContextProvider({ children }: ContextProviderProps) {
	const [apiUrl, setApiUrl] = useState<string>(DEFAULT_API_URL);
	const [token, setToken] = useState<string | null>(null);
	const [user, setUser] = useState<User | null | undefined>(undefined);
	const [isHydrated, setIsHydrated] = useState(false);

	const systemScheme = useColorScheme();
	const [mode, setModeState] = useState<ThemeMode>('system');
	const scheme: ColorScheme =
		mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : mode;
	const colors = scheme === 'dark' ? darkColors : lightColors;

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const storedMode = await AsyncStorage.getItem(THEME_KEY);
				if (!cancelled && isThemeMode(storedMode)) {
					setModeState(storedMode);
				}
			} catch {
				// ignore: fallback to 'system'
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const setMode = useCallback(async (next: ThemeMode): Promise<void> => {
		setModeState(next);
		try {
			await AsyncStorage.setItem(THEME_KEY, next);
		} catch {
			// ignore: state already updated
		}
	}, []);

	const fetchUser = useCallback(async (currentToken: string): Promise<User | null> => {
		try {
			const res = await fetch(`${apiUrl}/users/user`, {
				headers: { Authorization: currentToken },
			});
			if (!res.ok) return null;
			const data = (await res.json()) as User[];
			return Array.isArray(data) && data.length > 0 ? data[0] : null;
		} catch {
			return null;
		}
	}, [apiUrl]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const stored = await AsyncStorage.getItem(TOKEN_KEY);
				if (cancelled) return;
				if (stored) {
					setToken(stored);
					const u = await fetchUser(stored);
					if (cancelled) return;
					if (u) {
						setUser(u);
					} else {
						setToken(null);
						await AsyncStorage.removeItem(TOKEN_KEY);
					}
				}
			} finally {
				if (!cancelled) setIsHydrated(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [fetchUser]);

	const login = useCallback(async (identifier: string, password: string): Promise<void> => {
		const res = await fetch(`${apiUrl}/users/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ identifier, password }),
		});
		const body: { token?: string; message?: string } = await res.json().catch(() => ({}));
		if (!res.ok) {
			throw new Error(body.message ?? 'No se pudo iniciar sesión');
		}
		const newToken = body.token;
		if (!newToken) {
			throw new Error('El servidor no devolvió un token');
		}
		setToken(newToken);
		await AsyncStorage.setItem(TOKEN_KEY, newToken);
		const u = await fetchUser(newToken);
		setUser(u);
	}, [apiUrl, fetchUser]);

	const logout = useCallback(async (): Promise<void> => {
		setToken(null);
		setUser(null);
		await AsyncStorage.removeItem(TOKEN_KEY);
	}, []);

	const authedFetch = useCallback(async (path: string, init?: RequestInit): Promise<Response> => {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...((init?.headers as Record<string, string> | undefined) ?? {}),
		};
		if (token) headers.Authorization = token;
		return fetch(`${apiUrl}${path}`, { ...init, headers });
	}, [apiUrl, token]);

	// ── Catálogos globales (Carga perezosa / bajo demanda) ───────────────────
	const [requiredActions, setRequiredActions] = useState<RequiredAction[]>([]);
	const [allAreas, setAllAreas] = useState<Area[]>([]);
	const [loadingRequiredActions, setLoadingRequiredActions] = useState(false);
	const [loadingAreas, setLoadingAreas] = useState(false);

	const loadRequiredActions = useCallback(async (): Promise<RequiredAction[]> => {
		if (requiredActions.length > 0) return requiredActions;
		if (!token) return [];
		setLoadingRequiredActions(true);
		try {
			const res = await authedFetch('/catalogos/bm-verif-required-actions');
			if (res.ok) {
				const data = (await res.json()) as { recordset?: RequiredAction[] } | RequiredAction[];
				const list = Array.isArray(data) ? data : (data.recordset ?? []);
				setRequiredActions(list);
				return list;
			}
		} catch {
			// ignore
		} finally {
			setLoadingRequiredActions(false);
		}
		return [];
	}, [token, authedFetch, requiredActions]);

	const loadAreas = useCallback(async (): Promise<Area[]> => {
		if (allAreas.length > 0) return allAreas;
		if (!token) return [];
		setLoadingAreas(true);
		try {
			const res = await authedFetch('/catalogos/areas');
			if (res.ok) {
				const data = (await res.json()) as { recordset?: Area[] } | Area[];
				const list = Array.isArray(data) ? data : (data.recordset ?? []);
				setAllAreas(list);
				return list;
			}
		} catch {
			// ignore
		} finally {
			setLoadingAreas(false);
		}
		return [];
	}, [token, authedFetch, allAreas]);
	// ────────────────────────────────────────────────────────────────────────

	const value = useMemo<AppState>(
		() => ({
			auth: { token, user, isHydrated, login, logout, authedFetch },
			api: { API_URL: apiUrl, setApiUrl },
			theme: { mode, scheme, colors, setMode },
			catalogos: {
				requiredActions,
				allAreas,
				loadingRequiredActions,
				loadingAreas,
				loadRequiredActions,
				loadAreas,
			},
		}),
		[
			token,
			user,
			isHydrated,
			login,
			logout,
			authedFetch,
			apiUrl,
			mode,
			scheme,
			colors,
			setMode,
			requiredActions,
			allAreas,
			loadingRequiredActions,
			loadingAreas,
			loadRequiredActions,
			loadAreas,
		],
	);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppState {
	const ctx = useContext(AppContext);
	if (!ctx) throw new Error('useAppContext must be used within a ContextProvider');
	return ctx;
}

export function useAuth(): AuthSlice {
	return useAppContext().auth;
}

export function useApi(): ApiSlice {
	return useAppContext().api;
}

export function useTheme(): ThemeSlice {
	return useAppContext().theme;
}

export function useCatalogos(): CatalogosSlice {
	return useAppContext().catalogos;
}

