import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ContextProvider';

export interface BmCardProps {
	titulo: string;
	contenido: string;
	footer1: string;
	footer2: string;
}

export function BmCard({ titulo, contenido, footer1, footer2 }: BmCardProps) {
	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);

	return (
		<View style={styles.card}>
			<View style={styles.titleBox}>
				<Text style={styles.title} numberOfLines={1}>
					{titulo}
				</Text>
			</View>
			<View style={styles.contentBox}>
				<Text style={styles.content} numberOfLines={5} ellipsizeMode="tail">
					{contenido}
				</Text>
			</View>
			<View style={styles.footerBox}>
				<Text style={styles.footer} numberOfLines={1}>
					{footer1}
				</Text>
			</View>
			<View style={styles.footerBox}>
				<Text style={styles.footer} numberOfLines={1}>
					{footer2}
				</Text>
			</View>
		</View>
	);
}

const createStyles = (c: ReturnType<typeof useTheme>['colors']) =>
	StyleSheet.create({
		card: {
			width: '100%',
			height: 150,
			backgroundColor: c.cardBg,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: c.border,
			paddingHorizontal: 12,
			paddingVertical: 6,
			overflow: 'hidden',
			shadowColor: c.shadow,
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 6,
			elevation: 3,
		},
		titleBox: {
			flex: 0.15,
			justifyContent: 'center',
		},
		title: {
			fontSize: 16,
			fontWeight: 'bold',
			lineHeight: 20,
			letterSpacing: 4.8,
			textAlign: 'center',
			color: c.text,
		},
		contentBox: {
			flex: 0.7,
			justifyContent: 'center',
		},
		content: {
			fontSize: 14,
			fontWeight: 'bold',
			lineHeight: 18,
			textAlign: 'center',
			color: c.textSub,
		},
		footerBox: {
			flex: 0.075,
			justifyContent: 'center',
		},
		footer: {
			fontSize: 10,
			fontWeight: 'normal',
			lineHeight: 11,
			color: c.textMuted,
		},
	});
