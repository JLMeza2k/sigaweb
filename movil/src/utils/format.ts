export function extractNuibmFromQr(text: string): string | null {
	const firstField = text.split('|')[0]?.trim();
	if (!firstField) return null;
	if (!/^\d{6}$/.test(firstField)) return null;
	return firstField;
}

export function isValidNuibm(value: string): boolean {
	return /^\d{6}$/.test(value);
}

export function formatCurrency(n: number | null | undefined): string {
	if (n == null || Number.isNaN(n)) return '—';
	try {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN',
			minimumFractionDigits: 2,
		}).format(n);
	} catch {
		return `$${n.toFixed(2)} MXN`;
	}
}

export function formatDate(value: string | null | undefined): string {
	if (!value) return '—';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	try {
		return new Intl.DateTimeFormat('es-MX', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		}).format(d);
	} catch {
		const day = String(d.getDate()).padStart(2, '0');
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const year = d.getFullYear();
		return `${day}/${month}/${year}`;
	}
}

export function formatEntrada(
	entrada: number | string | null | undefined,
	anio: number | null | undefined,
): string {
	const e = entrada != null && entrada !== '' ? String(entrada) : '';
	const a = anio != null && anio !== 0 ? String(anio) : '';
	if (!e && !a) return '—';
	if (!a) return e;
	if (!e) return a;
	return `${e}-${a}`;
}

const MIN_MS = 60 * 1000;
const HOUR_MS = 60 * MIN_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

export function formatElapsed(
	verifiedAt: string | null | undefined,
	now: Date = new Date(),
): string | null {
	if (!verifiedAt) return null;
	const d = new Date(verifiedAt);
	if (Number.isNaN(d.getTime())) return null;
	const diff = now.getTime() - d.getTime();
	if (diff < 0) return null;
	if (diff < HOUR_MS) return `${Math.floor(diff / MIN_MS)}m`;
	if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h`;
	if (diff < WEEK_MS) return `${Math.floor(diff / DAY_MS)}d`;
	if (diff < MONTH_MS) return `${Math.floor(diff / WEEK_MS)}s`;
	if (diff < YEAR_MS) return `${Math.floor(diff / MONTH_MS)}M`;
	return `${Math.floor(diff / YEAR_MS)}a`;
}

export type VerificationAge = 'unverified' | 'recent' | 'medium' | 'old';

export function verificationAge(
	verifiedAt: string | null | undefined,
	now: Date = new Date(),
): VerificationAge {
	if (!verifiedAt) return 'unverified';
	const d = new Date(verifiedAt);
	if (Number.isNaN(d.getTime())) return 'unverified';
	const diff = now.getTime() - d.getTime();
	if (diff < MONTH_MS) return 'recent';
	if (diff < YEAR_MS) return 'medium';
	return 'old';
}

export function verificationColor(age: VerificationAge): string {
	switch (age) {
		case 'unverified':
			return '#dc2626';
		case 'recent':
			return '#16a34a';
		case 'medium':
			return '#2563eb';
		case 'old':
			return '#ea580c';
	}
}
