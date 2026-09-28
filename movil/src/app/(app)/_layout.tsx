import { Stack } from 'expo-router';
import { useTheme } from '../../context/ContextProvider';
import { ThemeToggle } from '../../components/ThemeToggle';

export default function AppLayout() {
	const { colors } = useTheme();

	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: colors.bgElevated },
				headerTintColor: colors.text,
				headerTitleStyle: { fontWeight: '700' },
				contentStyle: { backgroundColor: colors.bg },
			}}
		>
			<Stack.Screen
				name="home"
				options={{
					title: 'Inicio',
					headerRight: () => <ThemeToggle />,
				}}
			/>
			<Stack.Screen name="bmSearch" options={{ title: 'Bienes Muebles' }} />
			<Stack.Screen
				name="bm/scan"
				options={{ presentation: 'fullScreenModal', headerShown: false }}
			/>
			<Stack.Screen name="bm/[nuibm]" options={{ title: 'Detalle' }} />
			<Stack.Screen name="bm/list" options={{ title: 'Resultados' }} />
		</Stack>
	);
}
