export type UserType = {
   IdUser: number;
   RFC: string;
   Nombre: string;
   eMail: string;
   Profile: number,
   Activo: boolean
}

export type LoginType = {
   identifier: string;
   password: string;
}
