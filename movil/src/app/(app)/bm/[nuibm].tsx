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
import { BmCard } from '../../../components/BmCard';
import { BmVerificarModal } from '../../../components/BmVerificarModal';
import {
	formatCurrency,
	formatDate,
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
	const { authedFetch, user } = useAuth();
	const { colors } = useTheme();
	const styles = useMemo(() => createContentStyles(colors), [colors]);
	const [state, setState] = useState<State>({ kind: 'loading' });
	const [reloadKey, setReloadKey] = useState(0);
	const [verificarOpen, setVerificarOpen] = useState(false);

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
	}, [nuibm, authedFetch, reloadKey]);

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
					<BmCard
						titulo={String(state.data.NUIBM)}
						contenido={state.data.FullDescripcion || 'Sin descripción'}
						footer1={state.data.NameArea}
						footer2={state.data.Resguardatarios}
					/>

					<AdqCard data={state.data} styles={styles} />

					<StatusCard data={state.data} styles={styles} />

					{state.data.Verificado ? (
						<VerifiedCard data={state.data} styles={styles} />
					) : null}

					{state.data.Baja ? <BajaCard data={state.data} styles={styles} /> : null}

					{canRevalidate(state.data) ? (
						<View style={styles.section}>
							<Pressable
								onPress={() => setVerificarOpen(true)}
								style={({ pressed }) => [
									styles.verifyBtn,
									pressed && styles.verifyBtnPressed,
								]}
							>
								<Text style={styles.verifyBtnText}>
									{state.data.Verificado
										? '🔁 Reverificar'
										: '✓ Verificar este bien'}
								</Text>
							</Pressable>
						</View>
					) : null}
				</ScrollView>
			)}

			{state.kind === 'ok' && user?.IdUser != null ? (
				<BmVerificarModal
					visible={verificarOpen}
					nuibm={state.data.NUIBM}
					userId={user.IdUser}
					defaults={{
						Unidad: Number(state.data.Unidad),
						Centro: Number(state.data.Centro),
						Area: state.data.Area,
					}}
					onClose={() => setVerificarOpen(false)}
					onSuccess={() => {
						setVerificarOpen(false);
						setReloadKey((k) => k + 1);
					}}
				/>
			) : null}
		</View>
	);
}

function canRevalidate(data: BienMueble): boolean {
	if (!data.Verificado) return true;
	if (!data.VerifiedAt) return true;
	const verifiedDate = new Date(data.VerifiedAt);
	if (Number.isNaN(verifiedDate.getTime())) return true;
	const oneMonthAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
	return verifiedDate.getTime() < oneMonthAgoMs;
}

function AdqCard({
	data,
	styles,
}: {
	data: BienMueble;
	styles: ReturnType<typeof createContentStyles>;
}) {
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>Adquisición</Text>
			<View style={styles.sectionCard}>
				<BmFieldRowPair
					left={{ label: 'Condiciones', value: data.Condiciones }}
					right={{ label: 'Valor', value: formatCurrency(data.Valor) }}
				/>
				<BmFieldRow label="Proveedor" value={data.nameProveedor} />
				<BmFieldRowPair
					left={{ label: 'Factura', value: data.Factura }}
					right={{
						label: 'Fecha Factura',
						value: formatDate(data.FechaFactura),
					}}
				/>
				<BmFieldRow label="Referencia" value={data.Referencia} />
			</View>
		</View>
	);
}

function StatusCard({
	data,
	styles,
}: {
	data: BienMueble;
	styles: ReturnType<typeof createContentStyles>;
}) {
	const items: { label: string; value: boolean }[] = [
		{ label: 'Etiquetado', value: data.Etiquetado },
		{ label: 'Firmado', value: data.Firmado },
		{ label: 'Baja', value: data.Baja },
		{ label: 'EF', value: data.EF },
	];

	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>Estado</Text>
			<View style={styles.statusCard}>
				<View style={styles.statusRow}>
					<StatusCell
						label="Etiquetado"
						active={items[0].value}
						styles={styles}
					/>
					<View style={styles.statusDivider} />
					<StatusCell
						label="Firmado"
						active={items[1].value}
						styles={styles}
					/>
				</View>
				<View style={styles.statusDividerH} />
				<View style={styles.statusRow}>
					<StatusCell
						label="Baja"
						active={items[2].value}
						styles={styles}
					/>
					<View style={styles.statusDivider} />
					<StatusCell label="EF" active={items[3].value} styles={styles} />
				</View>
			</View>
		</View>
	);
}

function StatusCell({
	label,
	active,
	styles,
}: {
	label: string;
	active: boolean;
	styles: ReturnType<typeof createContentStyles>;
}) {
	return (
		<View style={styles.statusCell}>
			<View
				style={[
					styles.statusDot,
					{ backgroundColor: active ? styles.statusOkBg.backgroundColor : styles.statusOffBg.backgroundColor },
				]}
			>
				<Text
					style={[
						styles.statusDotText,
						{ color: active ? styles.statusOkFg.color : styles.statusOffFg.color },
					]}
				>
					{active ? '✓' : '✗'}
				</Text>
			</View>
			<Text style={styles.statusCellLabel}>{label}</Text>
		</View>
	);
}

function BajaCard({
	data,
	styles,
}: {
	data: BienMueble;
	styles: ReturnType<typeof createContentStyles>;
}) {
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>Detalles de Baja</Text>
			<View style={styles.sectionCard}>
				<BmFieldRow label="Fecha de Baja" value={formatDate(data.FechaBaja)} />
				<BmFieldRow label="Causa" value={data.dscCausaBaja} />
				<BmFieldRow label="Observaciones" value={data.obsBaja} />
			</View>
		</View>
	);
}

function VerifiedCard({
	data,
	styles,
}: {
	data: BienMueble;
	styles: ReturnType<typeof createContentStyles>;
}) {
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>Verificación</Text>
			<View style={styles.sectionCard}>
				<BmFieldRow
					label="Fecha de Verificación"
					value={formatDate(data.VerifiedAt)}
				/>
				<BmFieldRow label="Verificador" value={data.NameVerifiedBy} />
				<BmFieldRow
					label="Área donde se encontró"
					value={data.FoundIn}
				/>
			</View>
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

const createContentStyles = (c: ReturnType<typeof useTheme>['colors']) => {
	const statusOkBg = '#dcfce7';
	const statusOkFg = '#166534';
	const statusOffBg = '#1e293b';
	const statusOffFg = '#94a3b8';

	return StyleSheet.create({
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
			gap: 16,
		},
		section: {
			marginBottom: 0,
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
			borderWidth: 1,
			borderColor: c.border,
			shadowColor: c.shadow,
			shadowOpacity: 0.05,
			shadowRadius: 8,
			shadowOffset: { width: 0, height: 2 },
			elevation: 2,
		},
		statusCard: {
			backgroundColor: c.bgElevated,
			borderRadius: 16,
			borderWidth: 1,
			borderColor: c.border,
			paddingVertical: 8,
			paddingHorizontal: 8,
			shadowColor: c.shadow,
			shadowOpacity: 0.05,
			shadowRadius: 8,
			shadowOffset: { width: 0, height: 2 },
			elevation: 2,
		},
		statusRow: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingVertical: 10,
		},
		statusDivider: {
			width: 1,
			alignSelf: 'stretch',
			backgroundColor: c.divider,
			marginHorizontal: 4,
		},
		statusDividerH: {
			height: 1,
			backgroundColor: c.divider,
		},
		statusCell: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: 8,
			gap: 8,
		},
		statusDot: {
			width: 28,
			height: 28,
			borderRadius: 14,
			alignItems: 'center',
			justifyContent: 'center',
		},
		statusDotText: {
			fontSize: 14,
			fontWeight: '700',
		},
		statusCellLabel: {
			fontSize: 13,
			fontWeight: '600',
			color: c.text,
			flexShrink: 1,
		},
		statusOkBg: { backgroundColor: statusOkBg },
		statusOkFg: { color: statusOkFg },
		statusOffBg: { backgroundColor: statusOffBg },
		statusOffFg: { color: statusOffFg },
		verifyBtn: {
			backgroundColor: statusOkBg,
			borderRadius: 14,
			paddingVertical: 14,
			alignItems: 'center',
			borderWidth: 1,
			borderColor: statusOkFg,
		},
		verifyBtnPressed: {
			opacity: 0.85,
			transform: [{ scale: 0.99 }],
		},
		verifyBtnText: {
			color: statusOkFg,
			fontSize: 15,
			fontWeight: '700',
			letterSpacing: 0.4,
		},
	});
};
