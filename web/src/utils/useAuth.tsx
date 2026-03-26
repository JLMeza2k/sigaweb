import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import HttpClient from "../utils/HttpClient.ts";
import type { UserType } from "./types";
import Swal from 'sweetalert2'

const NoUser: UserType = { IdUser: -1, RFC: '', Nombre: '', eMail: '', Profile: 0, Activo: false }

interface AuthContextType {
   user: UserType;
   token: string;
   isLoading: boolean;
   dbLogin: (identifier: string, password: string) => Promise<{ success: boolean; token?: string; message?: string }>;
   dbGetUserData: (currentToken?: string) => Promise<UserType | undefined>;
   dbVerifyActivation: (code: string) => Promise<boolean>;
   logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const [user, setUser] = useState<UserType>(NoUser)
   const [token, setToken] = useState<string>(sessionStorage.getItem('token') || '');
   const [isLoading, setIsLoading] = useState(false);

   const httpClient = useMemo(() => new HttpClient('/api'), []);

   const dbGetUserData = async (currentToken?: string) => {
      const authHeader = currentToken || token;
      if (!authHeader) return;

      try {
         const response = await httpClient.get('user', authHeader);
         const data = await response.json();
         if (response.ok) {
            const userData = Array.isArray(data) ? data[0] : (data.userRow ? data.userRow[0] : data);
            setUser(userData);
            return userData;
         } else {
            setUser(NoUser);
            if (response.status === 403) {
               setToken('');
               sessionStorage.removeItem('token');
            }
         }
      } catch (error) {
         setUser(NoUser);
      }
   }

   // Initialize user data if token exists
   useEffect(() => {
      if (token && user.IdUser === -1) {
         dbGetUserData(token);
      }
   }, [token]);

   const dbLogin = async (identifier: string, password: string) => {
      setIsLoading(true);
      try {
         const response = await httpClient.post('login', { identifier, password });
         const data = await response.json();
         if (response.ok && 'token' in data) {
            setToken(data.token);
            sessionStorage.setItem('token', data.token);
            await dbGetUserData(data.token);
            return { success: true, token: data.token };
         } else {
            return { success: false, message: data.message || 'Error de autenticación' };
         }
      } catch (error: any) {
         return { success: false, message: error.message };
      } finally {
         setIsLoading(false);
      }
   }

   const dbVerifyActivation = async (code: string) => {
      setIsLoading(true);
      try {
         const response = await httpClient.post('verify-activation-code', { code }, token);
         if (response.ok) {
            Swal.fire({ icon: 'success', title: 'Éxito', text: 'Cuenta activada correctamente', timer: 2000, showConfirmButton: false });
            await dbGetUserData();
            return true;
         } else {
            const data = await response.json();
            Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Código inválido' });
            return false;
         }
      } catch (error: any) {
         Swal.fire({ icon: 'error', title: 'Error', text: error.message });
         return false;
      } finally {
         setIsLoading(false);
      }
   }

   const logout = () => {
      setToken('');
      setUser(NoUser);
      sessionStorage.removeItem('token');
   }

   const value = { user, token, isLoading, dbLogin, dbGetUserData, dbVerifyActivation, logout };

   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
   const context = useContext(AuthContext);
   if (context === undefined) {
      throw new Error('useAuth must be used within an AuthProvider');
   }
   return context;
};

// Keep the default export for compatibility if needed, though useAuth is preferred
export default useAuth;
