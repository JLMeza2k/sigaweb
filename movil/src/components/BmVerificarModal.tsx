import { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useAuth, useTheme } from '../context/ContextProvider';
import { BmComboBox, type ComboOption } from './BmComboBox';
import type { Area, Centro, Unidad } from '../types/catalogos';

export interface VerificarDefaults {
	Unidad: number;
	Centro: number;
	Area: string;
}

export interface BmVerificarModalProps {
	visible: boolean;
	nuibm: number;
	userId: number;
	defaults: VerificarDefaults;
	onClose(): void;
	onSuccess(): void;
}

export function BmVerificarModal({
	visible,
	nuibm,
	userId,
	defaults,
	onClose,
	onSuccess,
}: BmVerificarModalProps) {
	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const { authedFetch } = useAuth();

	const [unidad, setUnidad] = useState<number>(defaults.Unidad);
	const [centro, setCentro] = useState<number>(defaults.Centro);
	const [area, setArea] = useState<string>(defaults.Area);

	const [unidades, setUnidades] = useState<Unidad[]>([]);
	const [centros, setCentros] = useState<Centro[]>([]);
	const [areas, setAreas] = useState<Area[]>([]);

	const [loadingUnidades, setLoadingUnidades] = useState(false);
	const [loadingCentros, setLoadingCentros] = useState(false);
	const [loadingAreas, setLoadingAreas] = useState(false);

	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!visible) return;
		(async () => {
			setUnidad(defaults.Unidad);
			setCentro(defaults.Centro);
			setArea(defaults.Area);
			setError(null);
		})();
	}, [visible, defaults.Unidad, defaults.Centro, defaults.Area]);

	useEffect(() => {
		if (!visible) return;
		let cancelled = false;
		(async () => {
			setLoadingUnidades(true);
			try {
				const res = await authedFetch('/catalogos/unidades');
				if (cancelled) return;
				if (!res.ok) return;
				const data = (await res.json()) as
					| { recordset?: Unidad[] }
					| Unidad[];
				const list = Array.isArray(data) ? data : (data.recordset ?? []);
				setUnidades(list);
			} catch {
				if (!cancelled) setUnidades([]);
			} finally {
				if (!cancelled) setLoadingUnidades(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [visible, authedFetch]);

	useEffect(() => {
		if (!visible) return;
		let cancelled = false;
		(async () => {
			if (!unidad) {
				setCentros([]);
				return;
			}
			setLoadingCentros(true);
			try {
				const res = await authedFetch(`/catalogos/centros/${unidad}`);
				if (cancelled) return;
				if (!res.ok) {
					setCentros([]);
					return;
				}
				const data = (await res.json()) as
					| { recordset?: Centro[] }
					| Centro[];
				const list = Array.isArray(data) ? data : (data.recordset ?? []);
				setCentros(list);
			} catch {
				if (!cancelled) setCentros([]);
			} finally {
				if (!cancelled) setLoadingCentros(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [visible, unidad, authedFetch]);

	useEffect(() => {
		if (!visible) return;
		let cancelled = false;
		(async () => {
			if (!unidad || !centro) {
				setAreas([]);
				return;
			}
			setLoadingAreas(true);
			try {
				const res = await authedFetch(
					`/catalogos/areas/${unidad}/${centro}`,
				);
				if (cancelled) return;
				if (!res.ok) {
					setAreas([]);
					return;
				}
				const data = (await res.json()) as
					| { recordset?: Area[] }
					| Area[];
				const list = Array.isArray(data) ? data : (data.recordset ?? []);
				setAreas(list);
			} catch {
				if (!cancelled) setAreas([]);
			} finally {
				if (!cancelled) setLoadingAreas(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [visible, unidad, centro, authedFetch]);

	const handleUnidadChange = (v: number) => {
		setUnidad(v);
		setCentro(0);
		setArea('');
		setCentros([]);
		setAreas([]);
	};

	const handleCentroChange = (v: number) => {
		setCentro(v);
		setArea('');
		setAreas([]);
	};

	const unidadOptions: ComboOption<number>[] = useMemo(
		() => [
			...unidades.map((u) => ({
				value: u.Unidad,
				label: `${u.ShortName}`,
			})),
		],
		[unidades],
	);

	const centroOptions: ComboOption<number>[] = useMemo(
		() => [
			...centros.map((c) => ({
				value: c.Centro,
				label: `${c.ShortName}`,
			})),
		],
		[centros],
	);

	const areaOptions: ComboOption<string>[] = useMemo(
		() => [
			...areas.map((a) => ({
				value: a.Area,
				label: `${a.Descripcion}`,
			})),
		],
		[areas],
	);

	const canSubmit =
		unidad > 0 && centro > 0 && area.trim() !== '' && !submitting;

	const onSubmit = async () => {
		if (!canSubmit) return;
		setSubmitting(true);
		setError(null);
		try {
			const res = await authedFetch(`/bm/verificar/${nuibm}`, {
				method: 'POST',
				body: JSON.stringify({
					fecha: new Date().toISOString(),
					verifiedBy: userId,
					foundUA: unidad,
					foundCt: centro,
					foundArea: area,
				}),
			});
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as {
					message?: string;
				};
				setError(
					body?.message ?? `Error del servidor (${res.status})`,
				);
				return;
			}
			onSuccess();
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: 'No se pudo conectar con el servidor',
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent
			onRequestClose={onClose}
		>
			<Pressable style={styles.overlay} onPress={onClose}>
				<Pressable style={styles.sheet} onPress={() => { }}>
					<View style={styles.handle} />
					<ScrollView
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
					>
						<Text style={styles.title}>Verificar Bien Mueble</Text>
						<Text style={styles.subtitle}>NUIBM {nuibm}</Text>

						<BmComboBox<number>
							label="Unidad"
							value={unidad || null}
							options={unidadOptions}
							onChange={handleUnidadChange}
							placeholder={
								loadingUnidades ? 'Cargando…' : 'Selecciona'
							}
							disabled={loadingUnidades}
							emptyText="Sin unidades disponibles"
						/>

						<BmComboBox<number>
							label="Centro"
							value={centro || null}
							options={centroOptions}
							onChange={handleCentroChange}
							placeholder={
								!unidad
									? 'Selecciona una unidad'
									: loadingCentros
										? 'Cargando…'
										: 'Selecciona'
							}
							disabled={!unidad || loadingCentros}
							emptyText="Sin centros disponibles"
						/>

						<BmComboBox<string>
							label="Área"
							value={area || null}
							options={areaOptions}
							onChange={setArea}
							placeholder={
								!unidad || !centro
									? 'Selecciona un centro'
									: loadingAreas
										? 'Cargando…'
										: 'Selecciona'
							}
							disabled={!unidad || !centro || loadingAreas}
							emptyText="Sin áreas disponibles"
						/>

						{error ? (
							<Text style={styles.errorText}>{error}</Text>
						) : null}

						<Pressable
							onPress={onSubmit}
							disabled={!canSubmit}
							style={({ pressed }) => [
								styles.submit,
								pressed && canSubmit && styles.submitPressed,
								!canSubmit && styles.submitDisabled,
							]}
						>
							{submitting ? (
								<ActivityIndicator color={colors.textOnPrimary} />
							) : (
								<Text style={styles.submitText}>
									Confirmar verificación
								</Text>
							)}
						</Pressable>
					</ScrollView>
				</Pressable>
			</Pressable>
		</Modal>
	);
}

const createStyles = (c: ReturnType<typeof useTheme>['colors']) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			backgroundColor: 'rgba(0,0,0,0.55)',
			justifyContent: 'flex-end',
		},
		sheet: {
			backgroundColor: c.bg,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			padding: 20,
			paddingBottom: 32,
			maxHeight: '85%',
			shadowColor: c.shadow,
			shadowOpacity: 0.2,
			shadowRadius: 16,
			shadowOffset: { width: 0, height: -4 },
			elevation: 12,
		},
		handle: {
			alignSelf: 'center',
			width: 44,
			height: 5,
			borderRadius: 3,
			backgroundColor: c.divider,
			marginBottom: 12,
		},
		title: {
			fontSize: 18,
			fontWeight: '700',
			color: c.text,
			textAlign: 'center',
		},
		subtitle: {
			fontSize: 13,
			color: c.textMuted,
			textAlign: 'center',
			marginBottom: 16,
		},
		errorText: {
			color: c.danger,
			fontSize: 12,
			marginTop: 8,
			marginBottom: 8,
			textAlign: 'center',
		},
		submit: {
			backgroundColor: c.primary,
			borderRadius: 12,
			paddingVertical: 14,
			alignItems: 'center',
			justifyContent: 'center',
			marginTop: 12,
			shadowColor: c.primary,
			shadowOpacity: 0.3,
			shadowRadius: 8,
			shadowOffset: { width: 0, height: 4 },
			elevation: 3,
		},
		submitPressed: {
			backgroundColor: c.primaryPressed,
			transform: [{ scale: 0.98 }],
		},
		submitDisabled: {
			backgroundColor: c.textMuted,
			shadowOpacity: 0,
			elevation: 0,
		},
		submitText: {
			color: c.textOnPrimary,
			fontSize: 15,
			fontWeight: '700',
			letterSpacing: 0.4,
		},
	});
