import { useMemo, useState } from 'react';
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useTheme } from '../../context/ContextProvider';
import { isValidNuibm } from '../../utils/format';

export default function BmSearch() {
	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);

	const [nuibm, setNuibm] = useState('');
	const [error, setError] = useState<string | null>(null);

	const valid = isValidNuibm(nuibm);

	const onSubmit = () => {
		if (!valid) {
			setError('El NUIBM debe ser exactamente 6 dígitos');
			return;
		}
		setError(null);
		router.push(`/bm/${nuibm}`);
	};

	return (
		<>
			<Stack.Screen options={{ title: 'Bienes Muebles' }} />
			<View style={styles.root}>
				<KeyboardAvoidingView
					style={styles.flex}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				>
					<ScrollView
						contentContainerStyle={styles.scroll}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.card}>
							<View style={styles.headerIcon}>
								<Text style={styles.headerEmoji}>🔍</Text>
							</View>
							<Text style={styles.title}>Buscar Bien Mueble</Text>
							<Text style={styles.subtitle}>
								Ingresa el NUIBM o escanea el QR de la etiqueta.
							</Text>

							<View style={styles.field}>
								<Text style={styles.label}>NUIBM</Text>
								<View style={styles.inputRow}>
									<TextInput
										style={styles.input}
										placeholder="000000"
										placeholderTextColor={colors.textMuted}
										keyboardType="number-pad"
										maxLength={6}
										value={nuibm}
										onChangeText={(t) => {
											setNuibm(t.replace(/\D/g, ''));
											setError(null);
										}}
										onSubmitEditing={onSubmit}
										returnKeyType="go"
									/>
									<Pressable
										onPress={() => router.push('/bm/scan')}
										style={({ pressed }) => [
											styles.scanBtn,
											pressed && styles.scanBtnPressed,
										]}
									>
										<Text style={styles.scanEmoji}>📷</Text>
									</Pressable>
								</View>
								{error ? (
									<Text style={styles.errorText}>{error}</Text>
								) : (
									<Text style={styles.helperText}>
										{nuibm.length}/6 dígitos
									</Text>
								)}
							</View>

							<Pressable
								onPress={onSubmit}
								disabled={!valid}
								style={({ pressed }) => [
									styles.submit,
									pressed && styles.submitPressed,
									!valid && styles.submitDisabled,
								]}
							>
								<Text style={styles.submitText}>Buscar bien</Text>
							</Pressable>
						</View>

						<View style={styles.tip}>
							<Text style={styles.tipTitle}>💡 Consejo</Text>
							<Text style={styles.tipBody}>
								Captura el código de 6 dígitos impreso en la etiqueta del bien, o
								toca el icono de la cámara para escanear el código QR adherido.
							</Text>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			</View>
		</>
	);
}

const createStyles = (c: ReturnType<typeof useTheme>['colors']) =>
	StyleSheet.create({
		flex: { flex: 1 },
		root: {
			flex: 1,
			backgroundColor: c.bg,
		},
		scroll: {
			padding: 20,
			paddingBottom: 40,
		},
		card: {
			backgroundColor: c.bgElevated,
			borderRadius: 20,
			padding: 24,
			shadowColor: c.shadow,
			shadowOpacity: 0.08,
			shadowRadius: 12,
			shadowOffset: { width: 0, height: 4 },
			elevation: 3,
		},
		headerIcon: {
			width: 56,
			height: 56,
			borderRadius: 16,
			backgroundColor: c.inputFocusBg,
			alignItems: 'center',
			justifyContent: 'center',
			marginBottom: 12,
		},
		headerEmoji: {
			fontSize: 28,
		},
		title: {
			fontSize: 22,
			fontWeight: '700',
			color: c.text,
		},
		subtitle: {
			fontSize: 14,
			color: c.textSub,
			marginTop: 4,
			marginBottom: 20,
		},
		field: {
			marginBottom: 16,
		},
		label: {
			fontSize: 12,
			fontWeight: '700',
			color: c.textMuted,
			textTransform: 'uppercase',
			letterSpacing: 0.6,
			marginBottom: 6,
		},
		inputRow: {
			flexDirection: 'row',
			alignItems: 'stretch',
			gap: 10,
		},
		input: {
			flex: 1,
			backgroundColor: c.bgInput,
			borderWidth: 1,
			borderColor: c.inputBorder,
			borderRadius: 12,
			paddingHorizontal: 16,
			paddingVertical: 14,
			fontSize: 22,
			fontWeight: '700',
			color: c.text,
			letterSpacing: 6,
			textAlign: 'center',
			fontVariant: ['tabular-nums'],
		},
		scanBtn: {
			width: 56,
			backgroundColor: c.heroBg,
			borderRadius: 12,
			alignItems: 'center',
			justifyContent: 'center',
		},
		scanBtnPressed: {
			opacity: 0.85,
			transform: [{ scale: 0.97 }],
		},
		scanEmoji: {
			fontSize: 22,
		},
		errorText: {
			color: c.danger,
			fontSize: 12,
			marginTop: 6,
		},
		helperText: {
			color: c.textMuted,
			fontSize: 12,
			marginTop: 6,
			textAlign: 'right',
			fontVariant: ['tabular-nums'],
		},
		submit: {
			backgroundColor: c.primary,
			borderRadius: 12,
			paddingVertical: 14,
			alignItems: 'center',
			justifyContent: 'center',
			marginTop: 6,
			shadowColor: c.primary,
			shadowOpacity: 0.3,
			shadowRadius: 8,
			shadowOffset: { width: 0, height: 4 },
			elevation: 3,
		},
		submitPressed: {
			backgroundColor: c.primaryPressed,
			transform: [{ scale: 0.98 }],
		},
		submitDisabled: {
			backgroundColor: c.textMuted,
			shadowOpacity: 0,
			elevation: 0,
		},
		submitText: {
			color: c.textOnPrimary,
			fontSize: 15,
			fontWeight: '700',
			letterSpacing: 0.4,
		},
		tip: {
			marginTop: 20,
			padding: 16,
			borderRadius: 14,
			backgroundColor: c.inputFocusBg,
			borderLeftWidth: 4,
			borderLeftColor: c.primary,
		},
		tipTitle: {
			fontSize: 13,
			fontWeight: '700',
			color: c.primary,
			marginBottom: 4,
		},
		tipBody: {
			fontSize: 13,
			color: c.text,
			lineHeight: 18,
		},
	});
