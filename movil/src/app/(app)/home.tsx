import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useTheme } from '../../context/ContextProvider';

interface MenuItem {
	key: string;
	emoji: string;
	title: string;
	subtitle: string;
	href?: string;
	enabled: boolean;
	badge?: string;
}

export default function Home() {
	const { user, logout } = useAuth();
	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);

	const items: MenuItem[] = [
		{
			key: 'bm',
			emoji: '📦',
			title: 'Bienes Muebles',
			subtitle: 'Consulta por NUIBM o QR',
			href: '/bmSearch',
			enabled: true,
			badge: 'Nuevo',
		},
		{
			key: 'viaticos',
			emoji: '🧾',
			title: 'Viáticos',
			subtitle: 'Próximamente',
			enabled: false,
		},
		{
			key: 'dashboard',
			emoji: '📊',
			title: 'Dashboard',
			subtitle: 'Próximamente',
			enabled: false,
		},
		{
			key: 'catalogos',
			emoji: '📚',
			title: 'Catálogos',
			subtitle: 'Próximamente',
			enabled: false,
		},
	];

	return (
		<SafeAreaView style={styles.safe} edges={['bottom']}>
			<ScrollView contentContainerStyle={styles.container}>
				<View style={styles.greeting}>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>
							{user?.Nombre?.charAt(0).toUpperCase() ?? '?'}
						</Text>
					</View>
					<View style={styles.greetingText}>
						<Text style={styles.hello}>Hola, {user?.Nombre ?? 'usuario'}</Text>
						<Text style={styles.rfc}>{user?.RFC ?? '—'}</Text>
					</View>
				</View>

				<Text style={styles.sectionTitle}>Menú</Text>

				{items.map((item) => (
					<Pressable
						key={item.key}
						onPress={() => item.enabled && item.href && router.push(item.href)}
						disabled={!item.enabled}
						style={({ pressed }) => [
							styles.menuCard,
							pressed && item.enabled && styles.menuCardPressed,
							!item.enabled && styles.menuCardDisabled,
						]}
					>
						<View style={styles.menuEmojiBox}>
							<Text style={styles.menuEmoji}>{item.emoji}</Text>
						</View>
						<View style={styles.menuText}>
							<Text style={styles.menuTitle}>{item.title}</Text>
							<Text style={styles.menuSubtitle}>{item.subtitle}</Text>
						</View>
						{item.badge ? (
							<View style={styles.badge}>
								<Text style={styles.badgeText}>{item.badge}</Text>
							</View>
						) : item.enabled ? (
							<Text style={styles.menuArrow}>›</Text>
						) : null}
					</Pressable>
				))}

				<Pressable
					onPress={() => void logout()}
					style={({ pressed }) => [
						styles.logout,
						pressed && styles.logoutPressed,
					]}
				>
					<Text style={styles.logoutText}>Cerrar sesión</Text>
				</Pressable>
			</ScrollView>
		</SafeAreaView>
	);
}

const createStyles = (c: ReturnType<typeof useTheme>['colors']) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: c.bg },
		container: {
			padding: 20,
			paddingBottom: 32,
		},
		greeting: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 24,
		},
		avatar: {
			width: 56,
			height: 56,
			borderRadius: 28,
			backgroundColor: c.primary,
			alignItems: 'center',
			justifyContent: 'center',
			marginRight: 14,
		},
		avatarText: {
			color: c.textOnPrimary,
			fontSize: 22,
			fontWeight: '700',
		},
		greetingText: {
			flex: 1,
		},
		hello: {
			fontSize: 18,
			fontWeight: '700',
			color: c.text,
		},
		rfc: {
			fontSize: 13,
			color: c.textSub,
			marginTop: 2,
		},
		sectionTitle: {
			fontSize: 12,
			fontWeight: '700',
			color: c.textMuted,
			textTransform: 'uppercase',
			letterSpacing: 0.8,
			marginBottom: 12,
			marginLeft: 4,
		},
		menuCard: {
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: c.bgElevated,
			borderRadius: 16,
			padding: 16,
			marginBottom: 10,
			shadowColor: c.shadow,
			shadowOpacity: 0.05,
			shadowRadius: 8,
			shadowOffset: { width: 0, height: 2 },
			elevation: 2,
		},
		menuCardPressed: {
			backgroundColor: c.bgInput,
			transform: [{ scale: 0.99 }],
		},
		menuCardDisabled: {
			opacity: 0.55,
		},
		menuEmojiBox: {
			width: 44,
			height: 44,
			borderRadius: 12,
			backgroundColor: c.inputFocusBg,
			alignItems: 'center',
			justifyContent: 'center',
			marginRight: 14,
		},
		menuEmoji: {
			fontSize: 22,
		},
		menuText: {
			flex: 1,
		},
		menuTitle: {
			fontSize: 15,
			fontWeight: '700',
			color: c.text,
		},
		menuSubtitle: {
			fontSize: 12,
			color: c.textSub,
			marginTop: 2,
		},
		badge: {
			backgroundColor: c.primary,
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 999,
		},
		badgeText: {
			color: c.textOnPrimary,
			fontSize: 10,
			fontWeight: '800',
			letterSpacing: 0.5,
		},
		menuArrow: {
			fontSize: 28,
			color: c.textMuted,
			fontWeight: '300',
		},
		logout: {
			marginTop: 18,
			backgroundColor: c.heroBg,
			borderRadius: 12,
			paddingVertical: 14,
			alignItems: 'center',
		},
		logoutPressed: {
			opacity: 0.85,
		},
		logoutText: {
			color: c.heroFg,
			fontSize: 14,
			fontWeight: '700',
		},
	});
