import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuth, useTheme } from '../../context/ContextProvider';
import { BmCard } from '../../components/BmCard';
import { BmComboBox, type ComboOption } from '../../components/BmComboBox';
import { BmEmpleadoPicker } from '../../components/BmEmpleadoPicker';
import { isValidNuibm } from '../../utils/format';
import type { BienMueble } from '../../types/bm';
import type { Area, Centro, Unidad } from '../../types/catalogos';

export default function BmSearch() {
	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const { authedFetch } = useAuth();

	const [nuibm, setNuibm] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [result, setResult] = useState<BienMueble | null>(null);

	const [rfc, setRfc] = useState('');
	const [unidad, setUnidad] = useState<number>(0);
	const [centro, setCentro] = useState<number>(255);
	const [area, setArea] = useState<string>('000');

	const [unidades, setUnidades] = useState<Unidad[]>([]);
	const [centros, setCentros] = useState<Centro[]>([]);
	const [areas, setAreas] = useState<Area[]>([]);

	const [loadingUnidades, setLoadingUnidades] = useState(false);
	const [loadingCentros, setLoadingCentros] = useState(false);
	const [loadingAreas, setLoadingAreas] = useState(false);
	const [loadingRelacion, setLoadingRelacion] = useState(false);
	const [errorRelacion, setErrorRelacion] = useState<string | null>(null);
	const [empleadoPickerOpen, setEmpleadoPickerOpen] = useState(false);

	const valid = isValidNuibm(nuibm);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoadingUnidades(true);
			try {
				const res = await authedFetch('/catalogos/unidades');
				if (cancelled) return;
				if (!res.ok) return;
				const data = (await res.json()) as { recordset?: Unidad[] } | Unidad[];
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
	}, [authedFetch]);

	useEffect(() => {
		if (unidad === 0) return;
		let cancelled = false;
		(async () => {
			setLoadingCentros(true);
			try {
				const res = await authedFetch(`/catalogos/centros/${unidad}`);
				if (cancelled) return;
				if (!res.ok) {
					setCentros([]);
					return;
				}
				const data = (await res.json()) as { recordset?: Centro[] } | Centro[];
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
	}, [unidad, authedFetch]);

	useEffect(() => {
		if (unidad === 0 || centro === 255) return;
		let cancelled = false;
		(async () => {
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
				const data = (await res.json()) as { recordset?: Area[] } | Area[];
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
	}, [unidad, centro, authedFetch]);

	const handleUnidadChange = (v: number) => {
		setUnidad(v);
		setCentro(255);
		setArea('000');
		setCentros([]);
		setAreas([]);
	};

	const handleCentroChange = (v: number) => {
		setCentro(v);
		setArea('000');
		setAreas([]);
	};

	const unidadOptions: ComboOption<number>[] = useMemo(
		() => [
			{ value: 0, label: 'Todas' },
			...unidades.map((u) => ({
				value: u.Unidad,
				label: `${u.ShortName}`,
			})),
		],
		[unidades],
	);

	const centroOptions: ComboOption<number>[] = useMemo(
		() => [
			{ value: 255, label: 'Todos' },
			...centros.map((c) => ({
				value: c.Centro,
				label: `${c.ShortName}`,
			})),
		],
		[centros],
	);

	const areaOptions: ComboOption<string>[] = useMemo(
		() => [
			{ value: '000', label: 'Todas las Áreas' },
			...areas.map((a) => ({
				value: a.Area,
				label: `${a.Descripcion}`,
			})),
		],
		[areas],
	);

	const closeModal = useCallback(() => {
		setModalVisible(false);
		setResult(null);
		setError(null);
		setNuibm('');
	}, []);

	const onSubmit = async () => {
		if (!valid || loading) {
			setError('El NUIBM debe ser exactamente 6 dígitos');
			return;
		}
		setError(null);
		setLoading(true);
		try {
			const res = await authedFetch(`/bm/${nuibm}`);
			if (res.status === 404) {
				setError('Bien Mueble no encontrado');
				return;
			}
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as { message?: string };
				setError(body?.message ?? `Error del servidor (${res.status})`);
				return;
			}
			const data = (await res.json()) as BienMueble[];
			if (!Array.isArray(data) || data.length === 0) {
				setError('Bien Mueble no encontrado');
				return;
			}
			setResult(data[0]);
			setModalVisible(true);
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: 'No se pudo conectar con el servidor',
			);
		} finally {
			setLoading(false);
		}
	};

	const onSubmitRelacion = async () => {
		if (loadingRelacion) return;
		setErrorRelacion(null);
		const rfcParam = rfc.trim() === '' ? '-' : rfc.trim();
		const url = `/bm/${encodeURIComponent(rfcParam)}/${unidad}/${centro}/${encodeURIComponent(area)}`;
		setLoadingRelacion(true);
		try {
			const res = await authedFetch(url);
			if (res.status === 404) {
				router.push(
					`/bm/list?rfc=${encodeURIComponent(rfcParam)}&ua=${unidad}&ct=${centro}&area=${encodeURIComponent(area)}`,
				);
				return;
			}
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as { message?: string };
				setErrorRelacion(
					body?.message ?? `Error del servidor (${res.status})`,
				);
				return;
			}
			router.push(
				`/bm/list?rfc=${encodeURIComponent(rfcParam)}&ua=${unidad}&ct=${centro}&area=${encodeURIComponent(area)}`,
			);
		} catch (e) {
			setErrorRelacion(
				e instanceof Error
					? e.message
					: 'No se pudo conectar con el servidor',
			);
		} finally {
			setLoadingRelacion(false);
		}
	};

	return (
		<>
			<Stack.Screen options={{ title: 'Bienes Muebles' }} />
			<View style={styles.root}>
				<KeyboardAvoidingView
					style={styles.flex}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				>
					<ScrollView
						contentContainerStyle={styles.scroll}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.card}>
							<View style={styles.headerRow}>
								<View style={styles.headerIcon}>
									<Text style={styles.headerEmoji}>🔍</Text>
								</View>
								<View style={styles.headerText}>
									<Text style={styles.title}>Buscar Bien Mueble</Text>
									<Text style={styles.subtitle}>
										Ingresa el NUIBM o escanea el QR de la etiqueta.
									</Text>
								</View>
							</View>

							<View style={styles.field}>
								<Text style={styles.label}>NUIBM</Text>
								<View style={styles.inputRow}>
									<TextInput
										style={styles.input}
										placeholder="000000"
										placeholderTextColor={colors.textMuted}
										keyboardType="number-pad"
										maxLength={6}
										value={nuibm}
										onChangeText={(t) => {
											setNuibm(t.replace(/\D/g, ''));
											setError(null);
										}}
										onSubmitEditing={onSubmit}
										returnKeyType="go"
									/>
									<Pressable
										onPress={() => router.push('/bm/scan')}
										style={({ pressed }) => [
											styles.scanBtn,
											pressed && styles.scanBtnPressed,
										]}
									>
										<Text style={styles.scanEmoji}>📷</Text>
									</Pressable>
								</View>
								{error ? (
									<Text style={styles.errorText}>{error}</Text>
								) : (
									<Text style={styles.helperText}>
										{nuibm.length}/6 dígitos
									</Text>
								)}
							</View>

							<Pressable
								onPress={onSubmit}
								disabled={!valid || loading}
								style={({ pressed }) => [
									styles.submit,
									pressed && styles.submitPressed,
									(!valid || loading) && styles.submitDisabled,
								]}
							>
								{loading ? (
									<ActivityIndicator color={colors.textOnPrimary} />
								) : (
									<Text style={styles.submitText}>Buscar bien</Text>
								)}
							</Pressable>
						</View>

						<View style={styles.card}>
							<View style={styles.headerRow}>
								<View style={styles.headerIcon}>
									<Text style={styles.headerEmoji}>📚</Text>
								</View>
								<View style={styles.headerText}>
									<Text style={styles.title}>Búsqueda por Relación</Text>
									<Text style={styles.subtitle}>
										Filtra por RFC, Unidad, Centro y Área.
									</Text>
								</View>
							</View>

							<View style={styles.field}>
								<Text style={styles.label}>RFC</Text>
								<View style={styles.inputRow}>
									<TextInput
										style={[styles.inputSolo, styles.inputFlex]}
										placeholder="RFC del resguardatario (opcional)"
										placeholderTextColor={colors.textMuted}
										value={rfc}
										onChangeText={(t) => setRfc(t.toUpperCase())}
										autoCapitalize="characters"
										autoCorrect={false}
										maxLength={13}
									/>
									<Pressable
										onPress={() => {
											if (!rfc.trim()) return;
											setEmpleadoPickerOpen(true);
										}}
										disabled={!rfc.trim()}
										style={({ pressed }) => [
											styles.searchBtn,
											pressed && styles.scanBtnPressed,
											!rfc.trim() && styles.searchBtnDisabled,
										]}
									>
										<Text style={styles.scanEmoji}>🔎</Text>
									</Pressable>
								</View>
							</View>

							<View style={styles.comboRow}>
								<BmComboBox<number>
									label="Unidad"
									value={unidad}
									options={unidadOptions}
									onChange={handleUnidadChange}
									placeholder={loadingUnidades ? 'Cargando…' : 'Selecciona'}
									disabled={loadingUnidades}
									emptyText="Sin unidades disponibles"
									containerStyle={styles.comboCell}
								/>

								<BmComboBox<number>
									label="Centro"
									value={centro}
									options={centroOptions}
									onChange={handleCentroChange}
									placeholder={
										unidad === 0
											? 'Selecciona una unidad'
											: loadingCentros
												? 'Cargando…'
												: 'Selecciona'
									}
									disabled={unidad === 0 || loadingCentros}
									emptyText="Sin centros disponibles"
									containerStyle={styles.comboCell}
								/>
							</View>

							<BmComboBox<string>
								label="Área"
								value={area}
								options={areaOptions}
								onChange={setArea}
								placeholder={
									unidad === 0 || centro === 255
										? 'Selecciona un centro'
										: loadingAreas
											? 'Cargando…'
											: 'Selecciona'
								}
								disabled={unidad === 0 || centro === 255 || loadingAreas}
								emptyText="Sin áreas disponibles"
							/>

							{errorRelacion ? (
								<Text style={styles.errorText}>{errorRelacion}</Text>
							) : null}

							<Pressable
								onPress={onSubmitRelacion}
								disabled={loadingRelacion}
								style={({ pressed }) => [
									styles.submit,
									pressed && styles.submitPressed,
									loadingRelacion && styles.submitDisabled,
								]}
							>
								{loadingRelacion ? (
									<ActivityIndicator color={colors.textOnPrimary} />
								) : (
									<Text style={styles.submitText}>Buscar relación</Text>
								)}
							</Pressable>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			</View>

			<Modal
				visible={modalVisible}
				animationType="slide"
				transparent
				onRequestClose={closeModal}
			>
				<Pressable style={styles.overlay} onPress={closeModal}>
					<Pressable style={styles.modalSheet} onPress={() => { }}>
						<View style={styles.modalHandle} />
						{result && (
							<BmCard
								titulo={String(result.NUIBM)}
								contenido={result.FullDescripcion || 'Sin descripción'}
								footer1={result.NameArea}
								footer2={result.Resguardatarios}
							/>
						)}
						<Pressable
							onPress={() => {
								if (!result) return;
								router.push(`/bm/${result.NUIBM}`);
							}}
							style={({ pressed }) => [
								styles.closeBtn,
								pressed && styles.closeBtnPressed,
							]}
						>
							<Text style={styles.closeBtnText}>Ver detalles</Text>
						</Pressable>
					</Pressable>
				</Pressable>
			</Modal>

			<BmEmpleadoPicker
				visible={empleadoPickerOpen}
				pattern={rfc}
				onClose={() => setEmpleadoPickerOpen(false)}
				onSelect={(emp) => {
					setRfc(emp.RFC);
					setEmpleadoPickerOpen(false);
				}}
			/>
		</>
	);
}

const createStyles = (c: ReturnType<typeof useTheme>['colors']) =>
	StyleSheet.create({
		flex: { flex: 1 },
		root: {
			flex: 1,
			backgroundColor: c.bg,
		},
		scroll: {
			padding: 20,
			paddingBottom: 40,
			gap: 16,
		},
		card: {
			backgroundColor: c.bgElevated,
			borderRadius: 20,
			padding: 20,
			shadowColor: c.shadow,
			shadowOpacity: 0.08,
			shadowRadius: 12,
			shadowOffset: { width: 0, height: 4 },
			elevation: 3,
		},
		headerRow: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 16,
		},
		headerIcon: {
			width: 48,
			height: 48,
			borderRadius: 14,
			backgroundColor: c.inputFocusBg,
			alignItems: 'center',
			justifyContent: 'center',
			marginRight: 12,
		},
		headerEmoji: {
			fontSize: 24,
		},
		headerText: {
			flex: 1,
		},
		title: {
			fontSize: 18,
			fontWeight: '700',
			color: c.text,
		},
		subtitle: {
			fontSize: 13,
			color: c.textSub,
			marginTop: 2,
		},
		field: {
			marginBottom: 12,
		},
		label: {
			fontSize: 12,
			fontWeight: '700',
			color: c.textMuted,
			textTransform: 'uppercase',
			letterSpacing: 0.6,
			marginBottom: 6,
		},
		inputRow: {
			flexDirection: 'row',
			alignItems: 'stretch',
			gap: 10,
		},
		input: {
			flex: 1,
			backgroundColor: c.bgInput,
			borderWidth: 1,
			borderColor: c.inputBorder,
			borderRadius: 12,
			paddingHorizontal: 16,
			paddingVertical: 14,
			fontSize: 22,
			fontWeight: '700',
			color: c.text,
			letterSpacing: 6,
			textAlign: 'center',
			fontVariant: ['tabular-nums'],
		},
		inputSolo: {
			backgroundColor: c.bgInput,
			borderWidth: 1,
			borderColor: c.inputBorder,
			borderRadius: 12,
			paddingHorizontal: 14,
			paddingVertical: 12,
			fontSize: 15,
			color: c.text,
		},
		inputFlex: {
			flex: 1,
		},
		searchBtn: {
			width: 48,
			backgroundColor: c.primary,
			borderRadius: 12,
			alignItems: 'center',
			justifyContent: 'center',
		},
		searchBtnDisabled: {
			backgroundColor: c.textMuted,
		},
		comboRow: {
			flexDirection: 'row',
			gap: 12,
		},
		comboCell: {
			flex: 1,
		},
		scanBtn: {
			width: 56,
			backgroundColor: c.heroBg,
			borderRadius: 12,
			alignItems: 'center',
			justifyContent: 'center',
		},
		scanBtnPressed: {
			opacity: 0.85,
			transform: [{ scale: 0.97 }],
		},
		scanEmoji: {
			fontSize: 22,
		},
		errorText: {
			color: c.danger,
			fontSize: 12,
			marginTop: 6,
			marginBottom: 8,
		},
		helperText: {
			color: c.textMuted,
			fontSize: 12,
			marginTop: 6,
			textAlign: 'right',
			fontVariant: ['tabular-nums'],
		},
		submit: {
			backgroundColor: c.primary,
			borderRadius: 12,
			paddingVertical: 14,
			alignItems: 'center',
			justifyContent: 'center',
			marginTop: 6,
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
		overlay: {
			flex: 1,
			backgroundColor: 'rgba(0,0,0,0.55)',
			justifyContent: 'flex-end',
		},
		modalSheet: {
			backgroundColor: c.bg,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			padding: 20,
			paddingBottom: 32,
			gap: 16,
			shadowColor: c.shadow,
			shadowOpacity: 0.2,
			shadowRadius: 16,
			shadowOffset: { width: 0, height: -4 },
			elevation: 12,
		},
		modalHandle: {
			alignSelf: 'center',
			width: 44,
			height: 5,
			borderRadius: 3,
			backgroundColor: c.divider,
			marginBottom: 4,
		},
		closeBtn: {
			backgroundColor: c.primary,
			borderRadius: 12,
			paddingVertical: 14,
			alignItems: 'center',
			justifyContent: 'center',
		},
		closeBtnPressed: {
			backgroundColor: c.primaryPressed,
			transform: [{ scale: 0.98 }],
		},
		closeBtnText: {
			color: c.textOnPrimary,
			fontSize: 15,
			fontWeight: '700',
		},
	});
