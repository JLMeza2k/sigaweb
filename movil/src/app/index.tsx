import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/ContextProvider';

export default function Index() {
	const { token, isHydrated } = useAuth();

	useEffect(() => {
		if (!isHydrated) return;
		router.replace(token ? '/home' : '/login');
	}, [isHydrated, token]);

	return <View style={{ flex: 1, backgroundColor: '#0b1220' }} />;
}
