import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ContextProvider';

interface BmFieldRowProps {
	label: string;
	value: string;
	mono?: boolean;
}

export function BmFieldRow({ label, value, mono = false }: BmFieldRowProps) {
	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);

	return (
		<View style={styles.row}>
			<Text style={styles.label}>{label}</Text>
			<Text style={[styles.value, mono && styles.mono]} numberOfLines={2}>
				{value || '—'}
			</Text>
		</View>
	);
}

const createStyles = (c: ReturnType<typeof useTheme>['colors']) =>
	StyleSheet.create({
		row: {
			paddingVertical: 10,
			borderBottomWidth: 1,
			borderBottomColor: c.divider,
		},
		label: {
			fontSize: 11,
			fontWeight: '700',
			color: c.textMuted,
			textTransform: 'uppercase',
			letterSpacing: 0.6,
			marginBottom: 4,
		},
		value: {
			fontSize: 15,
			color: c.text,
			fontWeight: '500',
		},
		mono: {
			fontVariant: ['tabular-nums'],
		},
	});
