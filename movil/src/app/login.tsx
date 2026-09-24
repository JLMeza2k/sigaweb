import { useMemo, useState, type ReactNode } from 'react';
import {
	ActivityIndicator,
	Image,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useTheme } from '../context/ContextProvider';

export default function Login() {
	const { login } = useAuth();
	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);

	const [identifier, setIdentifier] = useState('');
	const [password, setPassword] = useState('');
	const [showPwd, setShowPwd] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [focusedField, setFocusedField] = useState<string | null>(null);

	const onSubmit = async () => {
		if (loading) return;
		if (!identifier.trim() || !password) {
			setError('Ingresa tu usuario y contraseña');
			return;
		}
		setError(null);
		setLoading(true);
		try {
			await login(identifier.trim(), password);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
		} finally {
			setLoading(false);
		}
	};

	return (
		<LinearGradient
			colors={[colors.gradTop, colors.gradMid, colors.gradBot]}
			locations={[0, 0.5, 1]}
			style={styles.root}
		>
			<SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
				<KeyboardAvoidingView
					style={styles.flex}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				>
					<ScrollView
						contentContainerStyle={styles.scroll}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.brand}>
							<Image
								source={require('../../assets/siga.png')}
								style={styles.logo}
								resizeMode="contain"
							/>
							<Text style={styles.brandTitle}>SIGA Móvil</Text>
							<Text style={styles.brandInstitute}>
								Sistema Integral de Gestión Administrativa
							</Text>
							<View style={styles.brandDivider} />
							<Text style={styles.brandTagline}>
								Instituto de Servicios de Salud de BCS
							</Text>
						</View>

						<View style={styles.card}>
							<View style={styles.cardTop}>
								<View style={styles.cardAccent} />
								<Text style={styles.cardTitle}>Acceso al sistema</Text>
							</View>
							<Text style={styles.cardSub}>Ingresa tus credenciales institucionales</Text>

							<Field label="Usuario / RFC" focused={focusedField === 'user'} styles={styles}>
								<TextInput
									style={styles.input}
									placeholder="RFC o correo electrónico"
									placeholderTextColor={colors.textMuted}
									autoCapitalize="none"
									autoCorrect={false}
									keyboardType="email-address"
									value={identifier}
									onChangeText={setIdentifier}
									editable={!loading}
									onFocus={() => setFocusedField('user')}
									onBlur={() => setFocusedField(null)}
								/>
							</Field>

							<Field label="Contraseña" focused={focusedField === 'pwd'} styles={styles}>
								<View style={styles.pwdRow}>
									<TextInput
										style={[styles.input, styles.pwdInput]}
										placeholder="••••••••"
										placeholderTextColor={colors.textMuted}
										secureTextEntry={!showPwd}
										autoCapitalize="none"
										autoCorrect={false}
										value={password}
										onChangeText={setPassword}
										editable={!loading}
										onSubmitEditing={onSubmit}
										returnKeyType="go"
										onFocus={() => setFocusedField('pwd')}
										onBlur={() => setFocusedField(null)}
									/>
									<Pressable
										onPress={() => setShowPwd((v) => !v)}
										hitSlop={10}
										style={styles.eyeBtn}
									>
										<Text style={styles.eyeIcon}>{showPwd ? '🙈' : '👁'}</Text>
									</Pressable>
								</View>
							</Field>

							{error ? (
								<View style={styles.errorBox}>
									<Text style={styles.errorIcon}>⚠️</Text>
									<Text style={styles.errorText}>{error}</Text>
								</View>
							) : null}

							<Pressable
								onPress={onSubmit}
								disabled={loading}
								style={({ pressed }) => [
									styles.btn,
									pressed && styles.btnPressed,
									loading && styles.btnDisabled,
								]}
							>
								{loading ? (
									<ActivityIndicator color={colors.textOnPrimary} size="small" />
								) : (
									<Text style={styles.btnText}>Iniciar sesión</Text>
								)}
							</Pressable>

							<View style={styles.divRow}>
								<View style={styles.divider} />
								<Text style={styles.divText}>ISSABCS</Text>
								<View style={styles.divider} />
							</View>

							<Pressable hitSlop={10} style={styles.forgotWrap}>
								<Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
							</Pressable>
						</View>

						<Text style={styles.version}>SIGA Móvil v1.0.0  ·  © 2026 ISSABCS</Text>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</LinearGradient>
	);
}

function Field({
	label,
	focused,
	children,
	styles,
}: {
	label: string;
	focused: boolean;
	children: ReactNode;
	styles: ReturnType<typeof createStyles>;
}) {
	return (
		<View style={styles.field}>
			<Text style={[styles.fieldLabel, focused && styles.fieldLabelFocused]}>{label}</Text>
			<View style={[styles.inputBox, focused && styles.inputBoxFocused]}>{children}</View>
		</View>
	);
}

const createStyles = (c: ReturnType<typeof useTheme>['colors']) =>
	StyleSheet.create({
		root: { flex: 1 },
		safe: { flex: 1 },
		flex: { flex: 1 },

		scroll: {
			flexGrow: 1,
			paddingHorizontal: 24,
			paddingTop: 36,
			paddingBottom: 32,
			justifyContent: 'center',
		},

		brand: { alignItems: 'center', marginBottom: 36 },
		logo: {
			width: 80,
			height: 80,
			marginBottom: 16,
		},
		brandTitle: {
			color: c.text,
			fontSize: 26,
			fontWeight: '800',
			letterSpacing: 0.3,
		},
		brandInstitute: {
			color: c.textSub,
			fontSize: 12,
			marginTop: 5,
			textAlign: 'center',
			letterSpacing: 0.1,
		},
		brandDivider: {
			width: 40,
			height: 2,
			backgroundColor: c.primary,
			borderRadius: 1,
			marginVertical: 12,
		},
		brandTagline: {
			color: c.textMuted,
			fontSize: 11,
			letterSpacing: 0.4,
			textAlign: 'center',
		},

		card: {
			backgroundColor: c.cardBg,
			borderRadius: 24,
			borderWidth: 1,
			borderColor: c.border,
			padding: 22,
			shadowColor: c.shadow,
			shadowOpacity: 0.3,
			shadowRadius: 20,
			shadowOffset: { width: 0, height: 10 },
			elevation: 8,
		},
		cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 10 },
		cardAccent: {
			width: 3,
			height: 22,
			borderRadius: 2,
			backgroundColor: c.primary,
		},
		cardTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
		cardSub: { color: c.textSub, fontSize: 13, marginBottom: 20 },

		field: { marginBottom: 14 },
		fieldLabel: {
			color: c.textMuted,
			fontSize: 11,
			fontWeight: '700',
			letterSpacing: 0.9,
			textTransform: 'uppercase',
			marginBottom: 6,
		},
		fieldLabelFocused: { color: c.inputFocusBorder },
		inputBox: {
			backgroundColor: c.bgInput,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: c.inputBorder,
			paddingHorizontal: 14,
			flexDirection: 'row',
			alignItems: 'center',
		},
		inputBoxFocused: {
			borderColor: c.inputFocusBorder,
			backgroundColor: c.inputFocusBg,
		},
		input: {
			flex: 1,
			paddingVertical: 13,
			fontSize: 15,
			color: c.text,
		},
		pwdRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
		pwdInput: { flex: 1 },
		eyeBtn: { paddingHorizontal: 4, paddingVertical: 4 },
		eyeIcon: { fontSize: 16 },

		errorBox: {
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: c.dangerBg,
			borderColor: c.dangerBorder,
			borderWidth: 1,
			borderRadius: 10,
			paddingVertical: 10,
			paddingHorizontal: 12,
			marginBottom: 14,
			gap: 8,
		},
		errorIcon: { fontSize: 14 },
		errorText: { color: c.danger, fontSize: 13, flex: 1 },

		btn: {
			backgroundColor: c.primary,
			borderRadius: 14,
			paddingVertical: 15,
			alignItems: 'center',
			justifyContent: 'center',
			marginTop: 4,
			shadowColor: c.primary,
			shadowOpacity: 0.4,
			shadowRadius: 10,
			shadowOffset: { width: 0, height: 5 },
			elevation: 5,
		},
		btnPressed: { backgroundColor: c.primaryPressed, transform: [{ scale: 0.98 }] },
		btnDisabled: { opacity: 0.6 },
		btnText: { color: c.textOnPrimary, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

		divRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
		divider: { flex: 1, height: 1, backgroundColor: c.divider },
		divText: { color: c.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },

		forgotWrap: { alignItems: 'center' },
		forgotText: { color: c.primarySoft, fontSize: 13, fontWeight: '600' },

		version: {
			textAlign: 'center',
			color: c.textMuted,
			fontSize: 11,
			marginTop: 24,
			letterSpacing: 0.3,
		},
	});
