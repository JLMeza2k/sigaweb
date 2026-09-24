import { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useAuth, useTheme } from '../../../context/ContextProvider';
import { BmFieldRow } from '../../../components/BmFieldRow';
import { BmFieldRowPair } from '../../../components/BmFieldRowPair';
import { BmStatusChips } from '../../../components/BmStatusChips';
import {
	formatCurrency,
	formatDate,
	formatEntrada,
	isValidNuibm,
} from '../../../utils/format';
import type { BienMueble } from '../../../types/bm';

type State =
	| { kind: 'loading' }
	| { kind: 'error'; message: string }
	| { kind: 'ok'; data: BienMueble };

export default function BmDetail() {
	const params = useLocalSearchParams<{ nuibm: string }>();
	const rawNuibm = Array.isArray(params.nuibm) ? params.nuibm[0] : params.nuibm;
	const validNuibm = rawNuibm && isValidNuibm(rawNuibm) ? rawNuibm : null;
	const { colors } = useTheme();
	const styles = useMemo(() => createInvalidStyles(colors), [colors]);

	const title = validNuibm ? `NUIBM ${validNuibm}` : 'Detalle';

	if (!validNuibm) {
		return (
			<>
				<Stack.Screen options={{ title }} />
				<View style={styles.center}>
					<View style={styles.errorBox}>
						<Text style={styles.errorEmoji}>⚠️</Text>
						<Text style={styles.errorTitle}>NUIBM inválido</Text>
						<Text style={styles.errorMessage}>
							El código capturado no tiene el formato esperado (6 dígitos).
						</Text>
					</View>
				</View>
			</>
		);
	}

	return (
		<>
			<Stack.Screen options={{ title }} />
			<BmDetailContent key={validNuibm} nuibm={validNuibm} />
		</>
	);
}

function BmDetailContent({ nuibm }: { nuibm: string }) {
	const { authedFetch } = useAuth();
	const { colors } = useTheme();
	const styles = useMemo(() => createContentStyles(colors), [colors]);
	const [state, setState] = useState<State>({ kind: 'loading' });

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await authedFetch(`/bm/${nuibm}`);
				if (cancelled) return;
				if (res.status === 404) {
					setState({ kind: 'error', message: 'Bien Mueble no encontrado' });
					return;
				}
				if (!res.ok) {
					const body = await res.json().catch(() => ({}));
					setState({
						kind: 'error',
						message: body?.message ?? `Error del servidor (${res.status})`,
					});
					return;
				}
				const data = (await res.json()) as BienMueble[];
				if (!Array.isArray(data) || data.length === 0) {
					setState({ kind: 'error', message: 'Bien Mueble no encontrado' });
					return;
				}
				setState({ kind: 'ok', data: data[0] });
			} catch (e) {
				if (cancelled) return;
				setState({
					kind: 'error',
					message:
						e instanceof Error
							? e.message
							: 'No se pudo conectar con el servidor',
				});
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [nuibm, authedFetch]);

	return (
		<View style={styles.root}>
			{state.kind === 'loading' && (
				<View style={styles.center}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={styles.loadingText}>Cargando información…</Text>
				</View>
			)}

			{state.kind === 'error' && (
				<View style={styles.center}>
					<View style={styles.errorBox}>
						<Text style={styles.errorEmoji}>⚠️</Text>
						<Text style={styles.errorTitle}>No encontrado</Text>
						<Text style={styles.errorMessage}>{state.message}</Text>
						<Pressable
							onPress={() => setState({ kind: 'loading' })}
							style={({ pressed }) => [
								styles.retryBtn,
								pressed && styles.retryBtnPressed,
							]}
						>
							<Text style={styles.retryText}>Reintentar</Text>
						</Pressable>
					</View>
				</View>
			)}

			{state.kind === 'ok' && (
				<ScrollView
					contentContainerStyle={styles.scroll}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.heroCard}>
						<View style={styles.heroTop}>
							<View style={styles.heroNuibmBlock}>
								<Text style={styles.heroLabel}>NUIBM</Text>
								<Text style={styles.heroNuibm}>{String(state.data.NUIBM)}</Text>
							</View>
							<View style={styles.heroDividerV} />
							<View style={styles.heroCveBlock}>
								<Text style={styles.heroLabel}>Cve. CABMS</Text>
								<Text style={styles.heroCve} numberOfLines={2}>
									{state.data.CveCABMS || '—'}
								</Text>
							</View>
						</View>
						<View style={styles.heroDividerH} />
						<Text style={styles.heroDesc} numberOfLines={3}>
							{state.data.DescCABMS || state.data.CveCABMS || 'Sin descripción'}
						</Text>
						{state.data.Complementaria ? (
							<>
								<View style={styles.heroDividerH} />
								<Text style={styles.heroLabel}>Complementaria</Text>
								<Text style={styles.heroComp} numberOfLines={2}>
									{state.data.Complementaria}
								</Text>
							</>
						) : null}
					</View>

					<Section title="Características" styles={styles}>
						<BmFieldRowPair
							left={{ label: 'Marca', value: state.data.Marca }}
							right={{ label: 'Modelo', value: state.data.Modelo }}
						/>
						<BmFieldRow label="Serie" value={state.data.Serie} />
						<BmFieldRowPair
							left={{ label: 'Color', value: state.data.Color }}
							right={{ label: 'Condiciones', value: state.data.Condiciones }}
						/>
					</Section>

					<Section title="Adquisición" styles={styles}>
						<BmFieldRow label="Valor" value={formatCurrency(state.data.Valor)} />
						<BmFieldRow label="Proveedor" value={state.data.NameProv} />
						<BmFieldRow label="RFC Proveedor" value={state.data.RFCProveedor} mono />
						<BmFieldRowPair
							left={{ label: 'Factura', value: state.data.Factura }}
							right={{
								label: 'Fecha Factura',
								value: formatDate(state.data.FechaFactura),
							}}
						/>
						<BmFieldRow label="Referencia" value={state.data.Referencia} />
						<BmFieldRow
							label="Entrada"
							value={formatEntrada(state.data.Entrada, state.data.AñoEntr)}
						/>
					</Section>

					<Section title="Estado" styles={styles}>
						<BmStatusChips
							firmado={state.data.Firmado}
							etiquetado={state.data.Etiquetado}
							baja={state.data.Baja}
							blackList={state.data.BlackList}
						/>
					</Section>
				</ScrollView>
			)}
		</View>
	);
}

function Section({
	title,
	children,
	styles,
}: {
	title: string;
	children: React.ReactNode;
	styles: ReturnType<typeof createContentStyles>;
}) {
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>{title}</Text>
			<View style={styles.sectionCard}>{children}</View>
		</View>
	);
}

const createInvalidStyles = (c: ReturnType<typeof useTheme>['colors']) =>
	StyleSheet.create({
		center: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			padding: 24,
			backgroundColor: c.bg,
		},
		errorBox: {
			backgroundColor: c.bgElevated,
			borderRadius: 20,
			padding: 28,
			alignItems: 'center',
			width: '100%',
			maxWidth: 360,
			shadowColor: c.shadow,
			shadowOpacity: 0.08,
			shadowRadius: 12,
			shadowOffset: { width: 0, height: 4 },
			elevation: 3,
		},
		errorEmoji: {
			fontSize: 40,
			marginBottom: 8,
		},
		errorTitle: {
			fontSize: 18,
			fontWeight: '700',
			color: c.text,
			marginBottom: 4,
		},
		errorMessage: {
			fontSize: 13,
			color: c.textSub,
			textAlign: 'center',
			marginBottom: 16,
		},
	});

const createContentStyles = (c: ReturnType<typeof useTheme>['colors']) =>
	StyleSheet.create({
		root: {
			flex: 1,
			backgroundColor: c.bg,
		},
		center: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			padding: 24,
		},
		loadingText: {
			marginTop: 12,
			color: c.textSub,
			fontSize: 14,
		},
		errorBox: {
			backgroundColor: c.bgElevated,
			borderRadius: 20,
			padding: 28,
			alignItems: 'center',
			width: '100%',
			maxWidth: 360,
			shadowColor: c.shadow,
			shadowOpacity: 0.08,
			shadowRadius: 12,
			shadowOffset: { width: 0, height: 4 },
			elevation: 3,
		},
		errorEmoji: {
			fontSize: 40,
			marginBottom: 8,
		},
		errorTitle: {
			fontSize: 18,
			fontWeight: '700',
			color: c.text,
			marginBottom: 4,
		},
		errorMessage: {
			fontSize: 13,
			color: c.textSub,
			textAlign: 'center',
			marginBottom: 16,
		},
		retryBtn: {
			backgroundColor: c.primary,
			borderRadius: 10,
			paddingVertical: 10,
			paddingHorizontal: 24,
		},
		retryBtnPressed: {
			backgroundColor: c.primaryPressed,
		},
		retryText: {
			color: c.textOnPrimary,
			fontSize: 13,
			fontWeight: '700',
		},
		scroll: {
			padding: 20,
			paddingBottom: 40,
		},
		heroCard: {
			backgroundColor: c.heroBg,
			borderRadius: 20,
			padding: 24,
			marginBottom: 16,
			shadowColor: c.heroBg,
			shadowOpacity: 0.25,
			shadowRadius: 12,
			shadowOffset: { width: 0, height: 6 },
			elevation: 4,
		},
		heroTop: {
			flexDirection: 'row',
			alignItems: 'flex-start',
		},
		heroNuibmBlock: {
			flex: 3,
		},
		heroCveBlock: {
			flex: 2,
			paddingLeft: 12,
		},
		heroDividerV: {
			width: 1,
			backgroundColor: c.heroDivider,
			alignSelf: 'stretch',
			marginHorizontal: 12,
		},
		heroDividerH: {
			height: 1,
			backgroundColor: c.heroDivider,
			marginVertical: 14,
		},
		heroLabel: {
			color: c.heroSubtle,
			fontSize: 11,
			fontWeight: '700',
			textTransform: 'uppercase',
			letterSpacing: 1,
		},
		heroNuibm: {
			color: c.heroFg,
			fontSize: 40,
			fontWeight: '800',
			letterSpacing: 4,
			marginTop: 4,
			fontVariant: ['tabular-nums'],
		},
		heroCve: {
			color: c.heroFg,
			fontSize: 15,
			fontWeight: '600',
			marginTop: 6,
			fontVariant: ['tabular-nums'],
		},
		heroDesc: {
			color: c.heroDesc,
			fontSize: 14,
			fontWeight: '500',
		},
		heroComp: {
			color: c.heroFg,
			fontSize: 14,
			fontWeight: '500',
			marginTop: 4,
		},
		section: {
			marginBottom: 16,
		},
		sectionTitle: {
			fontSize: 12,
			fontWeight: '700',
			color: c.textMuted,
			textTransform: 'uppercase',
			letterSpacing: 0.8,
			marginBottom: 8,
			marginLeft: 4,
		},
		sectionCard: {
			backgroundColor: c.bgElevated,
			borderRadius: 16,
			paddingHorizontal: 16,
			paddingTop: 4,
			paddingBottom: 4,
			shadowColor: c.shadow,
			shadowOpacity: 0.05,
			shadowRadius: 8,
			shadowOffset: { width: 0, height: 2 },
			elevation: 2,
		},
	});
