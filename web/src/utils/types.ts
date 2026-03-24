export type UserType = {
   id: number;
   username: string;
   first_name: string;
   last_name: string;
   email: string;
   profile_image: string | null,  
   isAdmin: boolean
}

export type LoginType = {
   identifier: string;
   password: string;
}
