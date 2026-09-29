import { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useAuth, useTheme } from '../../../context/ContextProvider';
import { BmCard } from '../../../components/BmCard';
import {
	formatElapsed,
	verificationAge,
	verificationColor,
} from '../../../utils/format';
import type { BienMueble } from '../../../types/bm';

type State =
	| { kind: 'loading' }
	| { kind: 'error'; message: string }
	| { kind: 'ok'; data: BienMueble[] };

function getVerificationBadge(verifiedAt: string | null | undefined): {
	rightLabel: string | null;
	rightColor: string;
} {
	const label = formatElapsed(verifiedAt);
	if (label) {
		return {
			rightLabel: label,
			rightColor: verificationColor(verificationAge(verifiedAt)),
		};
	}
	return {
		rightLabel: null,
		rightColor: verificationColor('unverified'),
	};
}

export default function BmList() {
	const params = useLocalSearchParams<{
		rfc: string;
		ua: string;
		ct: string;
		area: string;
	}>();

	const rfc = Array.isArray(params.rfc) ? params.rfc[0] : params.rfc ?? '-';
	const ua = Array.isArray(params.ua) ? params.ua[0] : params.ua ?? '0';
	const ct = Array.isArray(params.ct) ? params.ct[0] : params.ct ?? '0';
	const area = Array.isArray(params.area) ? params.area[0] : params.area ?? '000';

	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const { authedFetch } = useAuth();
	const [state, setState] = useState<State>({ kind: 'loading' });

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setState({ kind: 'loading' });
			try {
				const res = await authedFetch(
					`/bm/${encodeURIComponent(rfc)}/${ua}/${ct}/${encodeURIComponent(area)}`,
				);
				if (cancelled) return;
				if (res.status === 404) {
					setState({ kind: 'ok', data: [] });
					return;
				}
				if (!res.ok) {
					const body = (await res.json().catch(() => ({}))) as {
						message?: string;
					};
					setState({
						kind: 'error',
						message: body?.message ?? `Error del servidor (${res.status})`,
					});
					return;
				}
				const data = (await res.json()) as BienMueble[];
				if (!Array.isArray(data)) {
					setState({ kind: 'error', message: 'Respuesta inválida del servidor' });
					return;
				}
				setState({ kind: 'ok', data });
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
	}, [rfc, ua, ct, area, authedFetch]);

	const summary = useMemo(() => {
		const parts: string[] = [];
		if (rfc && rfc !== '-') parts.push(`RFC: ${rfc}`);
		if (ua !== '0') parts.push(`UA: ${ua}`);
		else parts.push('Todas las Unidades');
		if (ua !== '0' && ct !== '255') parts.push(`CT: ${ct}`);
		else if (ua !== '0') parts.push('Todos los Centros');
		if (ua !== '0' && ct !== '255' && area !== '000')
			parts.push(`Área: ${area}`);
		else if (ua !== '0' && ct !== '255') parts.push('Todas las Áreas');
		return parts.join(' · ');
	}, [rfc, ua, ct, area]);

	return (
		<>
			<Stack.Screen options={{ title: 'Resultados' }} />
			<View style={styles.root}>
				{state.kind === 'loading' && (
					<View style={styles.center}>
						<ActivityIndicator size="large" color={colors.primary} />
						<Text style={styles.loadingText}>Buscando bienes muebles…</Text>
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
					<FlatList
						data={state.data}
						keyExtractor={(item) => String(item.NUIBM)}
						renderItem={({ item }) => (
							<Pressable
								onPress={() => router.push(`/bm/${item.NUIBM}`)}
								style={({ pressed }) => [
									styles.cardWrap,
									pressed && styles.cardWrapPressed,
								]}
							>
								<BmCard
									titulo={String(item.NUIBM)}
									contenido={item.FullDescripcion || 'Sin descripción'}
									footer1={item.NameArea}
									footer2={item.Resguardatarios}
									{...(getVerificationBadge(item.VerifiedAt) ?? {})}
								/>
							</Pressable>
						)}
						contentContainerStyle={styles.list}
						ListHeaderComponent={
							<View style={styles.header}>
								<Text style={styles.summary}>{summary}</Text>
								<Text style={styles.count}>
									{state.data.length} resultado{state.data.length === 1 ? '' : 's'}
								</Text>
							</View>
						}
						ListEmptyComponent={
							<View style={styles.empty}>
								<Text style={styles.emptyEmoji}>📭</Text>
								<Text style={styles.emptyTitle}>Sin resultados</Text>
								<Text style={styles.emptyBody}>
									No se encontraron bienes muebles con los filtros seleccionados.
								</Text>
							</View>
						}
					/>
				)}
			</View>
		</>
	);
}

const createStyles = (c: ReturnType<typeof useTheme>['colors']) =>
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
		list: {
			padding: 20,
			paddingBottom: 40,
			gap: 12,
		},
		header: {
			marginBottom: 8,
		},
		summary: {
			fontSize: 12,
			color: c.textMuted,
			textTransform: 'uppercase',
			letterSpacing: 0.6,
			fontWeight: '700',
		},
		count: {
			fontSize: 14,
			color: c.text,
			marginTop: 4,
			fontWeight: '600',
		},
		cardWrap: {
			borderRadius: 12,
		},
		cardWrapPressed: {
			opacity: 0.85,
			transform: [{ scale: 0.99 }],
		},
		empty: {
			alignItems: 'center',
			paddingVertical: 48,
			paddingHorizontal: 24,
		},
		emptyEmoji: {
			fontSize: 48,
			marginBottom: 8,
		},
		emptyTitle: {
			fontSize: 16,
			fontWeight: '700',
			color: c.text,
			marginBottom: 4,
		},
		emptyBody: {
			fontSize: 13,
			color: c.textSub,
			textAlign: 'center',
		},
	});
