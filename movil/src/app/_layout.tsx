import { useEffect } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ContextProvider, useAuth, useTheme } from '../context/ContextProvider';

function AuthGate() {
	const { token, isHydrated } = useAuth();
	const pathname = usePathname();

	useEffect(() => {
		if (!isHydrated) return;
		if (!token && pathname !== '/login') router.replace('/login');
		else if (token && pathname === '/login') router.replace('/home');
	}, [isHydrated, token, pathname]);

	return null;
}

function ThemedShell() {
	const { colors, scheme } = useTheme();

	return (
		<>
			<StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
			<Stack
				screenOptions={{
					headerShown: false,
					animation: 'fade',
					contentStyle: { backgroundColor: colors.bg },
				}}
			>
				<Stack.Screen name="index" options={{ animation: 'none' }} />
				<Stack.Screen name="login" />
				<Stack.Screen name="(app)" />
			</Stack>
			<AuthGate />
		</>
	);
}

export default function RootLayout() {
	return (
		<KeyboardProvider>
			<ContextProvider>
				<ThemedShell />
			</ContextProvider>
		</KeyboardProvider>
	);
}
