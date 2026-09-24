import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../context/ContextProvider';
import type { ThemeMode } from '../context/theme';

const ORDER: ThemeMode[] = ['system', 'light', 'dark'];

const ICONS: Record<ThemeMode, string> = {
	system: '🔄',
	light: '☀️',
	dark: '🌙',
};

export function ThemeToggle() {
	const { mode, colors, setMode } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);

	const cycle = () => {
		const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
		void setMode(next);
	};

	return (
		<Pressable
			onPress={cycle}
			hitSlop={8}
			style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
			accessibilityLabel={`Tema: ${mode}. Toca para cambiar.`}
		>
			<Text style={styles.icon}>{ICONS[mode]}</Text>
		</Pressable>
	);
}

const createStyles = (c: ReturnType<typeof useTheme>['colors']) =>
	StyleSheet.create({
		btn: {
			width: 36,
			height: 36,
			borderRadius: 18,
			alignItems: 'center',
			justifyContent: 'center',
			marginRight: 8,
			backgroundColor: 'transparent',
		},
		btnPressed: {
			backgroundColor: c.bgInput,
		},
		icon: {
			fontSize: 18,
		},
	});
