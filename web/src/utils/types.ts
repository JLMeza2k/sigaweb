export type UserType = {
   IdUser: number;
   RFC: string;
   Nombre: string;
   eMail: string;
   Profile: number,
   Activo: boolean,
   sideBarOpcs: number | null,
   Viaticos: number | null,
   BienesMuebles: number | null,
   Adquisiciones: number | null,
   Almacen: number | null,
   Presupuesto: number | null,
   Contabilidad: number | null,
   eArch: number | null
}

export type LoginType = {
   identifier: string;
   password: string;
}
