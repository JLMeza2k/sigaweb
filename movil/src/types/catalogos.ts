export interface Unidad {
	Unidad: number;
	ShortName: string;
}

export interface Centro {
	Unidad: number;
	Centro: number;
	ShortName: string;
}

export interface Area {
	Unidad: number;
	Centro: number;
	Area: string;
	Descripcion: string;
}

export interface Empleado {
	RFC: string;
	Nombre: string;
	CLUES: string;
	Unidad: string;
}
