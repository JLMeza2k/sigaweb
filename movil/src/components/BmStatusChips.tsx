import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ContextProvider';

interface ChipDef {
	key: string;
	label: string;
	value: boolean;
	activeBg: string;
	activeFg: string;
}

export interface BmStatusChipsProps {
	firmado: boolean;
	etiquetado: boolean;
	baja: boolean;
	blackList: boolean;
}

export function BmStatusChips({ firmado, etiquetado, baja, blackList }: BmStatusChipsProps) {
	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);

	const chips: ChipDef[] = [
		{ key: 'firmado', label: 'Firmado', value: firmado, activeBg: colors.statusOkBg, activeFg: colors.statusOkFg },
		{ key: 'etiquetado', label: 'Etiquetado', value: etiquetado, activeBg: colors.statusInfoBg, activeFg: colors.statusInfoFg },
		{ key: 'baja', label: 'Baja', value: baja, activeBg: colors.statusWarnBg, activeFg: colors.statusWarnFg },
		{ key: 'blacklist', label: 'BlackList', value: blackList, activeBg: colors.statusBlacklistBg, activeFg: colors.statusBlacklistFg },
	];

	return (
		<View style={styles.row}>
			{chips.map((c) => (
				<View
					key={c.key}
					style={[
						styles.chip,
						{ backgroundColor: c.value ? c.activeBg : colors.statusOffBg },
					]}
				>
					<Text
						style={[
							styles.chipText,
							{ color: c.value ? c.activeFg : colors.statusOffFg },
						]}
					>
						{c.value ? '✓' : '·'} {c.label}
					</Text>
				</View>
			))}
		</View>
	);
}

const createStyles = (_c: ReturnType<typeof useTheme>['colors']) =>
	StyleSheet.create({
		row: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			gap: 8,
		},
		chip: {
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 999,
		},
		chipText: {
			fontSize: 12,
			fontWeight: '700',
		},
	});
