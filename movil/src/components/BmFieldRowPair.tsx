import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ContextProvider';

export interface PairItem {
	label: string;
	value: string;
	mono?: boolean;
}

interface BmFieldRowPairProps {
	left: PairItem;
	right: PairItem;
}

export function BmFieldRowPair({ left, right }: BmFieldRowPairProps) {
	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);

	return (
		<View style={styles.row}>
			<View style={styles.half}>
				<Text style={styles.label}>{left.label}</Text>
				<Text
					style={[styles.value, left.mono && styles.mono]}
					numberOfLines={2}
				>
					{left.value || '—'}
				</Text>
			</View>
			<View style={styles.divider} />
			<View style={styles.half}>
				<Text style={styles.label}>{right.label}</Text>
				<Text
					style={[styles.value, right.mono && styles.mono]}
					numberOfLines={2}
				>
					{right.value || '—'}
				</Text>
			</View>
		</View>
	);
}

const createStyles = (c: ReturnType<typeof useTheme>['colors']) =>
	StyleSheet.create({
		row: {
			flexDirection: 'row',
			paddingVertical: 10,
			borderBottomWidth: 1,
			borderBottomColor: c.divider,
		},
		half: {
			flex: 1,
			paddingHorizontal: 4,
		},
		divider: {
			width: 1,
			backgroundColor: c.divider,
			alignSelf: 'stretch',
			marginHorizontal: 8,
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
