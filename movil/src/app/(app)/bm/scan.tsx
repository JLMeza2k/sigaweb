import { useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Linking,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ViewfinderOverlay } from '../../../components/ViewfinderOverlay';
import { extractNuibmFromQr } from '../../../utils/format';

export default function BmScan() {
	const [permission, requestPermission] = useCameraPermissions();
	const [error, setError] = useState<string | null>(null);
	const navigatingRef = useRef(false);

	useEffect(() => {
		if (permission && !permission.granted && permission.canAskAgain) {
			void requestPermission();
		}
	}, [permission, requestPermission]);

	if (!permission) {
		return (
			<View style={styles.center}>
				<ActivityIndicator color="#ffffff" />
			</View>
		);
	}

	if (!permission.granted) {
		return (
			<>
				<Stack.Screen options={{ headerShown: false }} />
				<View style={styles.permissionScreen}>
					<View style={styles.permissionBox}>
						<Text style={styles.permissionEmoji}>📷</Text>
						<Text style={styles.permissionTitle}>Cámara bloqueada</Text>
						<Text style={styles.permissionBody}>
							SIGA Movil necesita acceso a la cámara para escanear los códigos QR
							de los bienes muebles.
						</Text>
						{permission.canAskAgain ? (
							<Pressable
								onPress={() => void requestPermission()}
								style={({ pressed }) => [
									styles.permissionBtn,
									pressed && styles.permissionBtnPressed,
								]}
							>
								<Text style={styles.permissionBtnText}>Conceder permiso</Text>
							</Pressable>
						) : (
							<Pressable
								onPress={() => void Linking.openSettings()}
								style={({ pressed }) => [
									styles.permissionBtn,
									pressed && styles.permissionBtnPressed,
								]}
							>
								<Text style={styles.permissionBtnText}>Ir a Ajustes</Text>
							</Pressable>
						)}
						<Pressable
							onPress={() => router.back()}
							style={styles.permissionCancel}
						>
							<Text style={styles.permissionCancelText}>Cancelar</Text>
						</Pressable>
					</View>
				</View>
			</>
		);
	}

	const handleBarcode = (result: { data: string }) => {
		if (navigatingRef.current) return;
		const nuibm = extractNuibmFromQr(result.data);
		if (!nuibm) {
			setError('QR no contiene un NUIBM válido');
			return;
		}
		navigatingRef.current = true;
		router.replace(`/bm/${nuibm}`);
	};

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<View style={styles.root}>
				<CameraView
					style={StyleSheet.absoluteFill}
					facing="back"
					onBarcodeScanned={handleBarcode}
					barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
				/>

				<ViewfinderOverlay />

				<View style={styles.topBar} pointerEvents="box-none">
					<Pressable
						onPress={() => router.back()}
						hitSlop={12}
						style={({ pressed }) => [
							styles.closeBtn,
							pressed && styles.closeBtnPressed,
						]}
					>
						<Text style={styles.closeIcon}>✕</Text>
					</Pressable>
					<View style={styles.titlePill}>
						<Text style={styles.titleText}>Escanear código QR</Text>
					</View>
					<View style={styles.closeBtn} />
				</View>

				<View style={styles.bottomBar} pointerEvents="box-none">
					{error ? (
						<View style={styles.errorPill}>
							<Text style={styles.errorText}>{error}</Text>
						</View>
					) : (
						<View style={styles.hintPill}>
							<Text style={styles.hintText}>
								Apunta al QR de la etiqueta del bien
							</Text>
						</View>
					)}
				</View>
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: '#000000',
	},
	center: {
		flex: 1,
		backgroundColor: '#000000',
		alignItems: 'center',
		justifyContent: 'center',
	},
	topBar: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		paddingTop: 56,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	closeBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(0,0,0,0.55)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	closeBtnPressed: {
		backgroundColor: 'rgba(0,0,0,0.75)',
	},
	closeIcon: {
		color: '#ffffff',
		fontSize: 18,
		fontWeight: '700',
	},
	titlePill: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 999,
		backgroundColor: 'rgba(0,0,0,0.55)',
	},
	titleText: {
		color: '#ffffff',
		fontSize: 13,
		fontWeight: '700',
		letterSpacing: 0.3,
	},
	bottomBar: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		paddingBottom: 40,
		paddingHorizontal: 16,
		alignItems: 'center',
	},
	hintPill: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 999,
		backgroundColor: 'rgba(0,0,0,0.55)',
	},
	hintText: {
		color: '#ffffff',
		fontSize: 13,
		fontWeight: '500',
	},
	errorPill: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 12,
		backgroundColor: 'rgba(220,38,38,0.92)',
	},
	errorText: {
		color: '#ffffff',
		fontSize: 13,
		fontWeight: '600',
	},
	permissionScreen: {
		flex: 1,
		backgroundColor: '#0b1220',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
	},
	permissionBox: {
		backgroundColor: '#ffffff',
		borderRadius: 20,
		padding: 24,
		alignItems: 'center',
		width: '100%',
		maxWidth: 360,
	},
	permissionEmoji: {
		fontSize: 48,
		marginBottom: 12,
	},
	permissionTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#0f172a',
		marginBottom: 8,
	},
	permissionBody: {
		fontSize: 14,
		color: '#475569',
		textAlign: 'center',
		marginBottom: 20,
		lineHeight: 20,
	},
	permissionBtn: {
		backgroundColor: '#1d4ed8',
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 24,
		alignItems: 'center',
		width: '100%',
	},
	permissionBtnPressed: {
		backgroundColor: '#1e40af',
	},
	permissionBtnText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '700',
	},
	permissionCancel: {
		marginTop: 12,
		paddingVertical: 8,
	},
	permissionCancelText: {
		color: '#64748b',
		fontSize: 13,
		fontWeight: '600',
	},
});
