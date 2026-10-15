import { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useAuth, useCatalogos, useTheme } from '../context/ContextProvider';
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
	const { requiredActions, loadRequiredActions } = useCatalogos();

	const [unidad, setUnidad] = useState<number | null>(
		defaults.Unidad > 0 ? defaults.Unidad : null,
	);
	const [centro, setCentro] = useState<number | null>(
		defaults.Centro != null && defaults.Centro !== 255
			? defaults.Centro
			: null,
	);
	const [area, setArea] = useState<string>(defaults.Area);
	const [idRequiredAction, setIdRequiredAction] = useState<number | null>(0);
	const [verifObs, setVerifObs] = useState<string>('');

	const [unidades, setUnidades] = useState<Unidad[]>([]);
	const [centros, setCentros] = useState<Centro[]>([]);
	const [areas, setAreas] = useState<Area[]>([]);

	const [loadingUnidades, setLoadingUnidades] = useState(false);
	const [loadingCentros, setLoadingCentros] = useState(false);
	const [loadingAreas, setLoadingAreas] = useState(false);

	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [prevVisible, setPrevVisible] = useState(visible);

	if (visible !== prevVisible) {
		setPrevVisible(visible);
		if (visible) {
			setUnidad(defaults.Unidad > 0 ? defaults.Unidad : null);
			setCentro(
				defaults.Centro != null && defaults.Centro !== 255
					? defaults.Centro
					: null,
			);
			setArea(defaults.Area);
			setIdRequiredAction(0);
			setVerifObs('');
			setError(null);
		}
	}

	useEffect(() => {
		if (visible) {
			loadRequiredActions();
		}
	}, [visible, loadRequiredActions]);

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
			if (!unidad || unidad <= 0) {
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
			if (
				!unidad ||
				unidad <= 0 ||
				centro == null ||
				centro === 255
			) {
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
		setCentro(null);
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

	const requiredActionOptions: ComboOption<number>[] = useMemo(() => {
		const options = requiredActions.map((ra) => ({ value: ra.Id, label: ra.Descripcion }));
		if (!options.some((opt) => opt.value === 0)) {
			options.unshift({ value: 0, label: 'Ninguna' });
		}
		return options;
	}, [requiredActions]);

	const canSubmit =
		unidad != null &&
		unidad > 0 &&
		centro != null &&
		centro !== 255 &&
		area.trim() !== '' &&
		!submitting;

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
					idRequiredAction: idRequiredAction ?? 0,
					verifObs: verifObs.trim() || null,
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
							value={unidad}
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
							value={centro}
							options={centroOptions}
							onChange={handleCentroChange}
							placeholder={
								!unidad || unidad <= 0
									? 'Selecciona una unidad'
									: loadingCentros
										? 'Cargando…'
										: 'Selecciona'
							}
							disabled={!unidad || unidad <= 0 || loadingCentros}
							emptyText="Sin centros disponibles"
						/>

						<BmComboBox<string>
							label="Área"
							value={area || null}
							options={areaOptions}
							onChange={setArea}
							placeholder={
								!unidad ||
								unidad <= 0 ||
								centro == null ||
								centro === 255
									? 'Selecciona un centro'
									: loadingAreas
										? 'Cargando…'
										: 'Selecciona'
							}
							disabled={
								!unidad ||
								unidad <= 0 ||
								centro == null ||
								centro === 255 ||
								loadingAreas
							}
							emptyText="Sin áreas disponibles"
						/>

						<BmComboBox<number>
							label="Acción Requerida"
							value={idRequiredAction}
							options={requiredActionOptions}
							onChange={setIdRequiredAction}
							placeholder="Selecciona (opcional)"
							disabled={requiredActionOptions.length === 0}
							emptyText="Sin acciones disponibles"
						/>

						<View style={styles.obsField}>
							<Text style={styles.obsLabel}>Observaciones</Text>
							<TextInput
								style={styles.obsInput}
								value={verifObs}
								onChangeText={setVerifObs}
								placeholder="Escribe observaciones (opcional)"
								placeholderTextColor={colors.textMuted}
								multiline
								numberOfLines={3}
								textAlignVertical="top"
							/>
						</View>

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
			maxHeight: '90%',
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
		obsField: {
			marginTop: 4,
			marginBottom: 4,
		},
		obsLabel: {
			fontSize: 11,
			fontWeight: '700',
			color: c.textMuted,
			letterSpacing: 0.8,
			textTransform: 'uppercase',
			marginBottom: 6,
			marginLeft: 2,
		},
		obsInput: {
			backgroundColor: c.bgInput,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: c.inputBorder,
			paddingHorizontal: 14,
			paddingVertical: 10,
			fontSize: 14,
			color: c.text,
			minHeight: 72,
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
