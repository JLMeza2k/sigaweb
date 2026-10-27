import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import HttpClient from "../utils/HttpClient.ts";
import type { UserType } from "../utils/types.ts";
import { API_BASE } from "../utils/api.ts";
import { clearStoredToken, getStoredToken, onSessionExpired, storeToken } from "../utils/tokenStorage.ts";
import Swal from 'sweetalert2'

function getErrorMessage(error: unknown): string {
   if (error instanceof Error) return error.message;
   return String(error);
}

const NoUser: UserType = {
   IdUser: -1,
   RFC: '',
   Nombre: '',
   eMail: '',
   Profile: 0,
   Activo: false,
   sideBarOpcs: null,
   Viaticos: null,
   BienesMuebles: null,
   Adquisiciones: null,
   Almacen: null,
   Presupuesto: null,
   Contabilidad: null,
   eArch: null,
}

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
   const [token, setToken] = useState<string>(getStoredToken);
   const [isLoading, setIsLoading] = useState(false);

   const httpClient = useMemo(() => new HttpClient(API_BASE), []);

   const logout = useCallback(() => {
      setToken('');
      setUser(NoUser);
      clearStoredToken();
   }, []);

   useEffect(() => {
      return onSessionExpired(() => {
         logout();
         Swal.fire({
            icon: 'warning',
            title: 'Sesión expirada',
            text: 'Tu sesión expiró. Por favor inicia sesión nuevamente.',
            confirmButtonText: 'Iniciar sesión',
         });
      });
   }, [logout]);

   const dbGetUserData = async (currentToken?: string) => {
      const authHeader = currentToken || token;
      if (!authHeader) return;

      try {
         const response = await httpClient.get('users/user', authHeader);
         const data = await response.json();
         if (response.ok) {
            const userData = Array.isArray(data) ? data[0] : (data.userRow ? data.userRow[0] : data);
            setUser(userData);
            return userData;
         } else {
            setUser(NoUser);
            if (response.status === 403) {
               setToken('');
               clearStoredToken();
            }
         }
      } catch {
         setUser(NoUser);
      }
   }

   // Initialize user data if token exists
   useEffect(() => {
      if (token && user.IdUser === -1) {
         dbGetUserData(token);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [token]);

   const dbLogin = async (identifier: string, password: string) => {
      setIsLoading(true);
      try {
         const response = await httpClient.post('users/login', { identifier, password });
         const data = await response.json();
         if (response.ok && 'token' in data) {
            setToken(data.token);
            storeToken(data.token);
            await dbGetUserData(data.token);
            return { success: true, token: data.token };
         } else {
            return { success: false, message: data.message || 'Error de autenticación' };
         }
      } catch (error: unknown) {
         return { success: false, message: getErrorMessage(error) };
      } finally {
         setIsLoading(false);
      }
   }

   const dbVerifyActivation = async (code: string) => {
      setIsLoading(true);
      try {
         const response = await httpClient.post('users/verify-activation-code', { code }, token);
         if (response.ok) {
            Swal.fire({ icon: 'success', title: 'Éxito', text: 'Cuenta activada correctamente', timer: 2000, showConfirmButton: false });
            await dbGetUserData();
            return true;
         } else {
            const data = await response.json();
            Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Código inválido' });
            return false;
         }
      } catch (error: unknown) {
         Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(error) });
         return false;
      } finally {
         setIsLoading(false);
      }
   }

   const value = { user, token, isLoading, dbLogin, dbGetUserData, dbVerifyActivation, logout };

   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
   const context = useContext(AuthContext);
   if (context === undefined) {
      throw new Error('useAuth must be used within an AuthProvider');
   }
   return context;
};
