import { useMemo, useState, type ReactNode } from 'react';
import {
	ActivityIndicator,
	Alert,
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
import { useAuth, useApi, useTheme } from '../context/ContextProvider';

type ViewState = 'LOGIN' | 'REGISTER' | 'FORGOT_1' | 'FORGOT_2' | 'FORGOT_3';

export default function Login() {
	const { login } = useAuth();
	const { API_URL } = useApi();
	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);

	const [view, setView] = useState<ViewState>('LOGIN');

	// Shared state
	const [identifier, setIdentifier] = useState('');
	const [password, setPassword] = useState('');
	const [showPwd, setShowPwd] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [focusedField, setFocusedField] = useState<string | null>(null);

	// Register state
	const [rfc, setRfc] = useState('');
	const [email, setEmail] = useState('');
	const [regPassword, setRegPassword] = useState('');
	const [showRegPwd, setShowRegPwd] = useState(false);

	// Recovery state
	const [code, setCode] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [showNewPwd, setShowNewPwd] = useState(false);
	const [recoveryToken, setRecoveryToken] = useState('');

	const resetToLogin = () => {
		setView('LOGIN');
		setError(null);
		setIdentifier('');
		setPassword('');
		setCode('');
		setNewPassword('');
		setRecoveryToken('');
	};

	// ── LOGIN ────────────────────────────────────────────────────────────────
	const onLogin = async () => {
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

	// ── REGISTER ─────────────────────────────────────────────────────────────
	const onRegister = async () => {
		if (loading) return;
		if (!rfc.trim() || !email.trim() || !regPassword) {
			setError('Llena todos los campos');
			return;
		}
		setError(null);
		setLoading(true);
		try {
			const resp = await fetch(`${API_URL}/users/user`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rfc: rfc.trim(), email: email.trim(), password: regPassword }),
			});
			const data = await resp.json();
			if (resp.ok) {
				Alert.alert('Registro exitoso', 'Se envió un código de activación a tu correo. Ya puedes iniciar sesión.');
				setRfc('');
				setEmail('');
				setRegPassword('');
				setView('LOGIN');
			} else {
				setError(data.message || 'No se pudo completar el registro');
			}
		} catch {
			setError('No se pudo conectar al servidor');
		} finally {
			setLoading(false);
		}
	};

	// ── FORGOT: PASO 1 — Enviar código ───────────────────────────────────────
	const onSendCode = async () => {
		if (loading) return;
		if (!identifier.trim()) {
			setError('Ingresa tu RFC o correo electrónico');
			return;
		}
		setError(null);
		setLoading(true);
		try {
			const resp = await fetch(`${API_URL}/users/send-reset-code`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ identifier: identifier.trim() }),
			});
			const data = await resp.json();
			if (resp.ok) {
				Alert.alert('Código enviado', data.message || 'Revisa tu correo electrónico.');
				setView('FORGOT_2');
			} else {
				setError(data.message || 'No se pudo enviar el código');
			}
		} catch {
			setError('No se pudo conectar al servidor');
		} finally {
			setLoading(false);
		}
	};

	// ── FORGOT: PASO 2 — Verificar código ────────────────────────────────────
	const onVerifyCode = async () => {
		if (loading) return;
		if (!code.trim()) {
			setError('Ingresa el código de verificación');
			return;
		}
		setError(null);
		setLoading(true);
		try {
			const resp = await fetch(`${API_URL}/users/verify-reset-code`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ identifier: identifier.trim(), code: code.trim() }),
			});
			const data = await resp.json();
			if (resp.ok) {
				setRecoveryToken(data.token);
				setView('FORGOT_3');
			} else {
				setError(data.message || 'Código incorrecto');
			}
		} catch {
			setError('No se pudo conectar al servidor');
		} finally {
			setLoading(false);
		}
	};

	// ── FORGOT: PASO 3 — Nueva contraseña ────────────────────────────────────
	const onResetPassword = async () => {
		if (loading) return;
		if (!newPassword) {
			setError('Ingresa tu nueva contraseña');
			return;
		}
		setError(null);
		setLoading(true);
		try {
			const resp = await fetch(`${API_URL}/users/reset-password`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: recoveryToken,
				},
				body: JSON.stringify({ newPassword }),
			});
			if (resp.ok) {
				Alert.alert('Contraseña actualizada', 'Tu contraseña fue cambiada con éxito.');
				resetToLogin();
			} else {
				const data = await resp.json();
				setError(data.message || 'No se pudo cambiar la contraseña');
			}
		} catch {
			setError('No se pudo conectar al servidor');
		} finally {
			setLoading(false);
		}
	};

	// ── Helpers de render ─────────────────────────────────────────────────────
	const cardTitle = () => {
		switch (view) {
			case 'LOGIN': return 'Acceso al sistema';
			case 'REGISTER': return 'Crear cuenta';
			case 'FORGOT_1': return 'Recuperar contraseña';
			case 'FORGOT_2': return 'Verificar código';
			case 'FORGOT_3': return 'Nueva contraseña';
		}
	};

	const cardSub = () => {
		switch (view) {
			case 'LOGIN': return 'Ingresa tus credenciales institucionales';
			case 'REGISTER': return 'Completa los datos para registrarte';
			case 'FORGOT_1': return 'Ingresa tu RFC o correo para recibir un código';
			case 'FORGOT_2': return 'Ingresa el código que enviamos a tu correo';
			case 'FORGOT_3': return 'Tu identidad fue verificada. Crea una nueva contraseña';
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
						{/* Brand */}
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

						{/* Card */}
						<View style={styles.card}>
							<View style={styles.cardTop}>
								<View style={styles.cardAccent} />
								<Text style={styles.cardTitle}>{cardTitle()}</Text>
							</View>
							<Text style={styles.cardSub}>{cardSub()}</Text>

							{/* Error box */}
							{error ? (
								<View style={styles.errorBox}>
									<Text style={styles.errorIcon}>⚠️</Text>
									<Text style={styles.errorText}>{error}</Text>
								</View>
							) : null}

							{/* ── LOGIN ── */}
							{view === 'LOGIN' && (
								<>
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
												onSubmitEditing={onLogin}
												returnKeyType="go"
												onFocus={() => setFocusedField('pwd')}
												onBlur={() => setFocusedField(null)}
											/>
											<Pressable onPress={() => setShowPwd(v => !v)} hitSlop={10} style={styles.eyeBtn}>
												<Text style={styles.eyeIcon}>{showPwd ? '🙈' : '👁'}</Text>
											</Pressable>
										</View>
									</Field>

									<ActionBtn label="Iniciar sesión" loading={loading} onPress={onLogin} styles={styles} colors={colors} />

									<View style={styles.divRow}>
										<View style={styles.divider} />
										<Text style={styles.divText}>ISSABCS</Text>
										<View style={styles.divider} />
									</View>

									<Pressable hitSlop={10} style={styles.linkWrap} onPress={() => { setError(null); setView('FORGOT_1'); }}>
										<Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
									</Pressable>

									<Pressable hitSlop={10} style={[styles.linkWrap, { marginTop: 10 }]} onPress={() => { setError(null); setView('REGISTER'); }}>
										<Text style={styles.linkText}>¿No tienes cuenta? <Text style={styles.linkBold}>Regístrate</Text></Text>
									</Pressable>
								</>
							)}

							{/* ── REGISTER ── */}
							{view === 'REGISTER' && (
								<>
									<Field label="RFC" focused={focusedField === 'rfc'} styles={styles}>
										<TextInput
											style={styles.input}
											placeholder="Tu RFC (13 caracteres)"
											placeholderTextColor={colors.textMuted}
											autoCapitalize="characters"
											autoCorrect={false}
											maxLength={13}
											value={rfc}
											onChangeText={v => setRfc(v.toUpperCase())}
											editable={!loading}
											onFocus={() => setFocusedField('rfc')}
											onBlur={() => setFocusedField(null)}
										/>
									</Field>

									<Field label="Correo Electrónico" focused={focusedField === 'email'} styles={styles}>
										<TextInput
											style={styles.input}
											placeholder="ejemplo@saludbcs.gob.mx"
											placeholderTextColor={colors.textMuted}
											autoCapitalize="none"
											autoCorrect={false}
											keyboardType="email-address"
											value={email}
											onChangeText={setEmail}
											editable={!loading}
											onFocus={() => setFocusedField('email')}
											onBlur={() => setFocusedField(null)}
										/>
									</Field>

									<Field label="Contraseña" focused={focusedField === 'regpwd'} styles={styles}>
										<View style={styles.pwdRow}>
											<TextInput
												style={[styles.input, styles.pwdInput]}
												placeholder="••••••••"
												placeholderTextColor={colors.textMuted}
												secureTextEntry={!showRegPwd}
												autoCapitalize="none"
												autoCorrect={false}
												value={regPassword}
												onChangeText={setRegPassword}
												editable={!loading}
												onFocus={() => setFocusedField('regpwd')}
												onBlur={() => setFocusedField(null)}
											/>
											<Pressable onPress={() => setShowRegPwd(v => !v)} hitSlop={10} style={styles.eyeBtn}>
												<Text style={styles.eyeIcon}>{showRegPwd ? '🙈' : '👁'}</Text>
											</Pressable>
										</View>
									</Field>

									<ActionBtn label="Completar Registro" loading={loading} onPress={onRegister} styles={styles} colors={colors} />

									<Pressable hitSlop={10} style={[styles.linkWrap, { marginTop: 14 }]} onPress={() => { setError(null); setView('LOGIN'); }}>
										<Text style={styles.linkText}>← Volver al inicio de sesión</Text>
									</Pressable>
								</>
							)}

							{/* ── FORGOT: PASO 1 ── */}
							{view === 'FORGOT_1' && (
								<>
									<Field label="RFC o Correo" focused={focusedField === 'fg1'} styles={styles}>
										<TextInput
											style={styles.input}
											placeholder="Ingresa RFC o correo"
											placeholderTextColor={colors.textMuted}
											autoCapitalize="none"
											autoCorrect={false}
											keyboardType="email-address"
											value={identifier}
											onChangeText={setIdentifier}
											editable={!loading}
											onFocus={() => setFocusedField('fg1')}
											onBlur={() => setFocusedField(null)}
										/>
									</Field>

									<ActionBtn label="Enviar Código" loading={loading} onPress={onSendCode} styles={styles} colors={colors} />

									<Pressable hitSlop={10} style={[styles.linkWrap, { marginTop: 14 }]} onPress={() => { setError(null); setView('LOGIN'); }}>
										<Text style={styles.linkText}>← Cancelar</Text>
									</Pressable>
								</>
							)}

							{/* ── FORGOT: PASO 2 ── */}
							{view === 'FORGOT_2' && (
								<>
									<Field label="Código de Verificación" focused={focusedField === 'fg2'} styles={styles}>
										<TextInput
											style={styles.input}
											placeholder="A1B2C"
											placeholderTextColor={colors.textMuted}
											autoCapitalize="characters"
											autoCorrect={false}
											maxLength={5}
											value={code}
											onChangeText={v => setCode(v.toUpperCase())}
											editable={!loading}
											onSubmitEditing={onVerifyCode}
											returnKeyType="go"
											onFocus={() => setFocusedField('fg2')}
											onBlur={() => setFocusedField(null)}
										/>
									</Field>

									<ActionBtn label="Validar Código" loading={loading} onPress={onVerifyCode} styles={styles} colors={colors} />

									<Pressable hitSlop={10} style={[styles.linkWrap, { marginTop: 14 }]} onPress={() => { setError(null); setView('LOGIN'); }}>
										<Text style={styles.linkText}>← Cancelar</Text>
									</Pressable>
								</>
							)}

							{/* ── FORGOT: PASO 3 ── */}
							{view === 'FORGOT_3' && (
								<>
									<Field label="Nueva Contraseña" focused={focusedField === 'fg3'} styles={styles}>
										<View style={styles.pwdRow}>
											<TextInput
												style={[styles.input, styles.pwdInput]}
												placeholder="Nueva contraseña"
												placeholderTextColor={colors.textMuted}
												secureTextEntry={!showNewPwd}
												autoCapitalize="none"
												autoCorrect={false}
												value={newPassword}
												onChangeText={setNewPassword}
												editable={!loading}
												onSubmitEditing={onResetPassword}
												returnKeyType="go"
												onFocus={() => setFocusedField('fg3')}
												onBlur={() => setFocusedField(null)}
											/>
											<Pressable onPress={() => setShowNewPwd(v => !v)} hitSlop={10} style={styles.eyeBtn}>
												<Text style={styles.eyeIcon}>{showNewPwd ? '🙈' : '👁'}</Text>
											</Pressable>
										</View>
									</Field>

									<ActionBtn label="Guardar y Entrar" loading={loading} onPress={onResetPassword} styles={styles} colors={colors} />
								</>
							)}
						</View>

						<Text style={styles.version}>SIGA Móvil v1.0.0  ·  © 2026 ISSABCS</Text>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</LinearGradient>
	);
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

function ActionBtn({
	label,
	loading,
	onPress,
	styles,
	colors,
}: {
	label: string;
	loading: boolean;
	onPress: () => void;
	styles: ReturnType<typeof createStyles>;
	colors: ReturnType<typeof useTheme>['colors'];
}) {
	return (
		<Pressable
			onPress={onPress}
			disabled={loading}
			style={({ pressed }) => [
				styles.btn,
				pressed && styles.btnPressed,
				loading && styles.btnDisabled,
			]}
		>
			{loading
				? <ActivityIndicator color={colors.textOnPrimary} size="small" />
				: <Text style={styles.btnText}>{label}</Text>
			}
		</Pressable>
	);
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
		logo: { width: 80, height: 80, marginBottom: 16 },
		brandTitle: { color: c.text, fontSize: 26, fontWeight: '800', letterSpacing: 0.3 },
		brandInstitute: { color: c.textSub, fontSize: 12, marginTop: 5, textAlign: 'center', letterSpacing: 0.1 },
		brandDivider: { width: 40, height: 2, backgroundColor: c.primary, borderRadius: 1, marginVertical: 12 },
		brandTagline: { color: c.textMuted, fontSize: 11, letterSpacing: 0.4, textAlign: 'center' },

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
		cardAccent: { width: 3, height: 22, borderRadius: 2, backgroundColor: c.primary },
		cardTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
		cardSub: { color: c.textSub, fontSize: 13, marginBottom: 20 },

		field: { marginBottom: 14 },
		fieldLabel: { color: c.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 6 },
		fieldLabelFocused: { color: c.inputFocusBorder },
		inputBox: { backgroundColor: c.bgInput, borderRadius: 12, borderWidth: 1, borderColor: c.inputBorder, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
		inputBoxFocused: { borderColor: c.inputFocusBorder, backgroundColor: c.inputFocusBg },
		input: { flex: 1, paddingVertical: 13, fontSize: 15, color: c.text },
		pwdRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
		pwdInput: { flex: 1 },
		eyeBtn: { paddingHorizontal: 4, paddingVertical: 4 },
		eyeIcon: { fontSize: 16 },

		errorBox: {
			flexDirection: 'row', alignItems: 'center',
			backgroundColor: c.dangerBg, borderColor: c.dangerBorder,
			borderWidth: 1, borderRadius: 10,
			paddingVertical: 10, paddingHorizontal: 12,
			marginBottom: 14, gap: 8,
		},
		errorIcon: { fontSize: 14 },
		errorText: { color: c.danger, fontSize: 13, flex: 1 },

		btn: {
			backgroundColor: c.primary, borderRadius: 14,
			paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
			marginTop: 4,
			shadowColor: c.primary, shadowOpacity: 0.4, shadowRadius: 10,
			shadowOffset: { width: 0, height: 5 }, elevation: 5,
		},
		btnPressed: { backgroundColor: c.primaryPressed, transform: [{ scale: 0.98 }] },
		btnDisabled: { opacity: 0.6 },
		btnText: { color: c.textOnPrimary, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

		divRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
		divider: { flex: 1, height: 1, backgroundColor: c.divider },
		divText: { color: c.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },

		linkWrap: { alignItems: 'center' },
		linkText: { color: c.primarySoft, fontSize: 13, fontWeight: '600' },
		linkBold: { fontWeight: '800', color: c.primary },

		version: { textAlign: 'center', color: c.textMuted, fontSize: 11, marginTop: 24, letterSpacing: 0.3 },
	});
