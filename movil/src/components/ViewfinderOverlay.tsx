import { StyleSheet, View } from 'react-native';

const FRAME_SIZE = 240;
const CORNER_LENGTH = 28;
const CORNER_THICKNESS = 4;
const CORNER_COLOR = '#ffffff';
const CORNER_RADIUS = 4;

export function ViewfinderOverlay() {
	return (
		<View pointerEvents="none" style={styles.overlay}>
			<View style={styles.frame}>
				<Corner pos="tl" />
				<Corner pos="tr" />
				<Corner pos="bl" />
				<Corner pos="br" />
			</View>
		</View>
	);
}

type CornerPos = 'tl' | 'tr' | 'bl' | 'br';

function Corner({ pos }: { pos: CornerPos }) {
	const isTop = pos === 'tl' || pos === 'tr';
	const isLeft = pos === 'tl' || pos === 'bl';

	const horizontalStyle = {
		top: isTop ? 0 : undefined,
		bottom: !isTop ? 0 : undefined,
		left: isLeft ? 0 : undefined,
		right: !isLeft ? 0 : undefined,
		width: CORNER_LENGTH,
		height: CORNER_THICKNESS,
		borderTopLeftRadius: isTop && isLeft ? CORNER_RADIUS : 0,
		borderTopRightRadius: isTop && !isLeft ? CORNER_RADIUS : 0,
		borderBottomLeftRadius: !isTop && isLeft ? CORNER_RADIUS : 0,
		borderBottomRightRadius: !isTop && !isLeft ? CORNER_RADIUS : 0,
	} as const;

	const verticalStyle = {
		top: isTop ? 0 : undefined,
		bottom: !isTop ? 0 : undefined,
		left: isLeft ? 0 : undefined,
		right: !isLeft ? 0 : undefined,
		width: CORNER_THICKNESS,
		height: CORNER_LENGTH,
		borderTopLeftRadius: isTop && isLeft ? CORNER_RADIUS : 0,
		borderTopRightRadius: isTop && !isLeft ? CORNER_RADIUS : 0,
		borderBottomLeftRadius: !isTop && isLeft ? CORNER_RADIUS : 0,
		borderBottomRightRadius: !isTop && !isLeft ? CORNER_RADIUS : 0,
	} as const;

	return (
		<>
			<View style={[styles.corner, horizontalStyle]} />
			<View style={[styles.corner, verticalStyle]} />
		</>
	);
}

const styles = StyleSheet.create({
	overlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: 'center',
		justifyContent: 'center',
	},
	frame: {
		width: FRAME_SIZE,
		height: FRAME_SIZE,
	},
	corner: {
		position: 'absolute',
		backgroundColor: CORNER_COLOR,
	},
});
