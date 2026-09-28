import { useMemo, useState } from 'react';
import {
	FlatList,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	View,
	type StyleProp,
	type ViewStyle,
} from 'react-native';
import { useTheme } from '../context/ContextProvider';

export interface ComboOption<V> {
	value: V;
	label: string;
}

export interface BmComboBoxProps<V extends string | number> {
	label: string;
	value: V | null;
	options: ComboOption<V>[];
	onChange(v: V): void;
	disabled?: boolean;
	placeholder?: string;
	emptyText?: string;
	containerStyle?: StyleProp<ViewStyle>;
}

function isString(v: unknown): v is string {
	return typeof v === 'string';
}

function isNumber(v: unknown): v is number {
	return typeof v === 'number';
}

function valuesEqual<V extends string | number>(a: V | null, b: V): boolean {
	if (a === null) return false;
	if (isString(a) && isString(b)) return a === b;
	if (isNumber(a) && isNumber(b)) return a === b;
	return String(a) === String(b);
}

export function BmComboBox<V extends string | number>({
	label,
	value,
	options,
	onChange,
	disabled = false,
	placeholder = 'Selecciona…',
	emptyText = 'Sin opciones',
	containerStyle,
}: BmComboBoxProps<V>) {
	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [open, setOpen] = useState(false);

	const selected = options.find((o) => valuesEqual(value, o.value));

	const handleSelect = (v: V) => {
		onChange(v);
		setOpen(false);
	};

	return (
		<View style={[styles.field, containerStyle]}>
			<Text style={styles.label}>{label}</Text>
			<Pressable
				onPress={() => !disabled && setOpen(true)}
				disabled={disabled}
				style={({ pressed }) => [
					styles.trigger,
					disabled && styles.triggerDisabled,
					pressed && !disabled && styles.triggerPressed,
				]}
			>
				<Text
					style={[
						styles.triggerText,
						!selected && styles.triggerPlaceholder,
					]}
					numberOfLines={1}
				>
					{selected ? selected.label : placeholder}
				</Text>
				<Text style={styles.chevron}>▾</Text>
			</Pressable>

			<Modal
				visible={open}
				animationType="slide"
				transparent
				onRequestClose={() => setOpen(false)}
			>
				<Pressable style={styles.overlay} onPress={() => setOpen(false)}>
					<Pressable style={styles.sheet} onPress={() => {}}>
						<View style={styles.handle} />
						<Text style={styles.sheetTitle}>{label}</Text>
						{options.length === 0 ? (
							<Text style={styles.emptyText}>{emptyText}</Text>
						) : (
							<FlatList
								data={options}
								keyExtractor={(item, idx) =>
									`${String(item.value)}-${idx}`
								}
								renderItem={({ item }) => {
									const isSelected = valuesEqual(value, item.value);
									return (
										<Pressable
											onPress={() => handleSelect(item.value)}
											style={({ pressed }) => [
												styles.option,
												isSelected && styles.optionSelected,
												pressed && styles.optionPressed,
											]}
										>
											<Text
												style={[
													styles.optionText,
													isSelected && styles.optionTextSelected,
												]}
											>
												{item.label}
											</Text>
											{isSelected ? (
												<Text style={styles.check}>✓</Text>
											) : null}
										</Pressable>
									);
								}}
							/>
						)}
					</Pressable>
				</Pressable>
			</Modal>
		</View>
	);
}

const createStyles = (c: ReturnType<typeof useTheme>['colors']) =>
	StyleSheet.create({
		field: {
			marginBottom: 12,
		},
		label: {
			fontSize: 12,
			fontWeight: '700',
			color: c.textMuted,
			textTransform: 'uppercase',
			letterSpacing: 0.6,
			marginBottom: 6,
		},
		trigger: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			backgroundColor: c.bgInput,
			borderWidth: 1,
			borderColor: c.inputBorder,
			borderRadius: 12,
			paddingHorizontal: 14,
			paddingVertical: 12,
			minHeight: 48,
		},
		triggerDisabled: {
			opacity: 0.5,
		},
		triggerPressed: {
			backgroundColor: c.inputFocusBg,
		},
		triggerText: {
			flex: 1,
			fontSize: 15,
			color: c.text,
		},
		triggerPlaceholder: {
			color: c.textMuted,
		},
		chevron: {
			fontSize: 14,
			color: c.textMuted,
			marginLeft: 8,
		},
		overlay: {
			flex: 1,
			backgroundColor: 'rgba(0,0,0,0.55)',
			justifyContent: 'flex-end',
		},
		sheet: {
			backgroundColor: c.bg,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			padding: 20,
			paddingBottom: 32,
			maxHeight: '70%',
			shadowColor: c.shadow,
			shadowOpacity: 0.2,
			shadowRadius: 16,
			shadowOffset: { width: 0, height: -4 },
			elevation: 12,
		},
		handle: {
			alignSelf: 'center',
			width: 44,
			height: 5,
			borderRadius: 3,
			backgroundColor: c.divider,
			marginBottom: 12,
		},
		sheetTitle: {
			fontSize: 14,
			fontWeight: '700',
			color: c.textMuted,
			textTransform: 'uppercase',
			letterSpacing: 0.8,
			marginBottom: 8,
		},
		emptyText: {
			fontSize: 14,
			color: c.textMuted,
			textAlign: 'center',
			paddingVertical: 24,
		},
		option: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingVertical: 12,
			paddingHorizontal: 12,
			borderRadius: 10,
			marginBottom: 4,
		},
		optionSelected: {
			backgroundColor: c.inputFocusBg,
		},
		optionPressed: {
			backgroundColor: c.bgInput,
		},
		optionText: {
			flex: 1,
			fontSize: 15,
			color: c.text,
		},
		optionTextSelected: {
			fontWeight: '700',
			color: c.primary,
		},
		check: {
			fontSize: 16,
			color: c.primary,
			fontWeight: '700',
			marginLeft: 8,
		},
	});
