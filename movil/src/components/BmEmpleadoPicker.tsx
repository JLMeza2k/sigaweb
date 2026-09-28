import { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useAuth, useTheme } from '../context/ContextProvider';
import type { Empleado } from '../types/catalogos';

export interface BmEmpleadoPickerProps {
	visible: boolean;
	pattern: string;
	onClose(): void;
	onSelect(emp: Empleado): void;
}

export function BmEmpleadoPicker({
	visible,
	pattern,
	onClose,
	onSelect,
}: BmEmpleadoPickerProps) {
	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const { authedFetch } = useAuth();

	const [results, setResults] = useState<Empleado[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!visible) return;
		let cancelled = false;
		(async () => {
			const trimmed = pattern.trim();
			if (!trimmed) {
				setResults([]);
				setError(null);
				setLoading(false);
				return;
			}
			setLoading(true);
			setError(null);
			setResults([]);
			try {
				const sanitized = trimmed.replace(/[%_']/g, (c) => `\\${c}`);
				const res = await authedFetch(
					`/catalogos/buscar-empleados?searchPattern=${encodeURIComponent(sanitized)}`,
				);
				if (cancelled) return;
				if (!res.ok) {
					const body = (await res.json().catch(() => ({}))) as {
						message?: string;
					};
					setError(
						body?.message ?? `Error del servidor (${res.status})`,
					);
					setResults([]);
					return;
				}
				const data = (await res.json()) as
					| { recordset?: Empleado[] }
					| Empleado[];
				const list = Array.isArray(data) ? data : (data.recordset ?? []);
				if (list.length === 1) {
					onSelect(list[0]);
					return;
				}
				setResults(list);
			} catch (e) {
				if (!cancelled) {
					setError(
						e instanceof Error
							? e.message
							: 'No se pudo conectar con el servidor',
					);
					setResults([]);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [visible, pattern, authedFetch, onSelect]);

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent
			onRequestClose={onClose}
		>
			<Pressable style={styles.overlay} onPress={onClose}>
				<Pressable style={styles.sheet} onPress={() => {}}>
					<View style={styles.handle} />
					<Text style={styles.title}>Seleccionar empleado</Text>
					{pattern.trim() ? (
						<Text style={styles.subtitle}>«{pattern.trim()}»</Text>
					) : null}

					{loading ? (
						<View style={styles.center}>
							<ActivityIndicator size="large" color={colors.primary} />
							<Text style={styles.statusText}>Buscando…</Text>
						</View>
					) : error ? (
						<View style={styles.center}>
							<Text style={styles.statusEmoji}>⚠️</Text>
							<Text style={styles.statusTitle}>Error</Text>
							<Text style={styles.statusBody}>{error}</Text>
						</View>
					) : results.length === 0 ? (
						<View style={styles.center}>
							<Text style={styles.statusEmoji}>📭</Text>
							<Text style={styles.statusTitle}>Sin coincidencias</Text>
							<Text style={styles.statusBody}>
								No se encontraron empleados para esta búsqueda.
							</Text>
						</View>
					) : (
						<FlatList
							data={results}
							keyExtractor={(item) => `${item.RFC}-${item.CLUES}`}
							renderItem={({ item }) => (
								<Pressable
									onPress={() => onSelect(item)}
									style={({ pressed }) => [
										styles.item,
										pressed && styles.itemPressed,
									]}
								>
									<Text style={styles.itemRfc} numberOfLines={1}>
										{item.RFC}
									</Text>
									<Text style={styles.itemNombre} numberOfLines={1}>
										{item.Nombre}
									</Text>
									<Text style={styles.itemMeta} numberOfLines={1}>
										{item.CLUES} · {item.Unidad}
									</Text>
								</Pressable>
							)}
						/>
					)}
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
			maxHeight: '75%',
			gap: 12,
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
			marginBottom: 4,
		},
		title: {
			fontSize: 16,
			fontWeight: '700',
			color: c.text,
			textAlign: 'center',
		},
		subtitle: {
			fontSize: 12,
			color: c.textMuted,
			textAlign: 'center',
			fontStyle: 'italic',
		},
		center: {
			alignItems: 'center',
			justifyContent: 'center',
			paddingVertical: 32,
			paddingHorizontal: 16,
			gap: 6,
		},
		statusText: {
			marginTop: 8,
			fontSize: 13,
			color: c.textSub,
		},
		statusEmoji: {
			fontSize: 36,
			marginBottom: 4,
		},
		statusTitle: {
			fontSize: 15,
			fontWeight: '700',
			color: c.text,
		},
		statusBody: {
			fontSize: 13,
			color: c.textSub,
			textAlign: 'center',
		},
		item: {
			paddingVertical: 12,
			paddingHorizontal: 12,
			borderRadius: 10,
			borderBottomWidth: 1,
			borderBottomColor: c.divider,
		},
		itemPressed: {
			backgroundColor: c.inputFocusBg,
		},
		itemRfc: {
			fontSize: 14,
			fontWeight: '700',
			color: c.text,
			fontVariant: ['tabular-nums'],
		},
		itemNombre: {
			fontSize: 13,
			color: c.text,
			marginTop: 2,
		},
		itemMeta: {
			fontSize: 11,
			color: c.textMuted,
			marginTop: 2,
		},
	});
