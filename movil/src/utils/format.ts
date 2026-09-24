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
