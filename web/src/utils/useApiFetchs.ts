import { useMemo, useState } from "react";
import HttpClient from "../utils/HttpClient.ts";
import type { UserType } from "./types";
import Swal from 'sweetalert2'

const NoUser:UserType = {id: -1, first_name: '', last_name:'', email:'', username:'', profile_image: null, isAdmin: false}

const useApiFetchs = () => {
   const [user, setUser] = useState<UserType>()

   const { setEducationalData, setToken, state } = useEducationStore()

   const httpClient = useMemo(() => {
      return new HttpClient(sessionStorage.getItem('apiURL') || '');
   }, []);


   const dbLogin = async (identifier: string, password: string) => {
      showToast( 'Login', 'Verificando credenciales', 'info', 1500 )
      await httpClient.post('login', {identifier, password})
         .then(response =>  response.json())
         .then(data => { 
            if('token' in data) setToken(data.token);
            else if ( 'message' in data) {
               setToken('')
               throw new Error(data.message);
            }
         })
         .catch(error => {
            showToast( 'Login error', error.message, 'error' )
         });
   }

   const dbGetUserData = async () => {
      if (!state.token) {
         setUser(NoUser)
         return
      }
      await httpClient.get('user', state.token)
         .then(response => response.json())
         .then(data => {
            if('message' in data) {
               setUser(NoUser);
               throw new Error(data.message);
            }
            else 
               setUser(data.userRow[0]);
         })
         .catch(error => {
            showToast( 'Get user Error', error.message, 'error' )
         });
   }

   const dbGetEducationData = async () => {
      await httpClient.get('sync/education')
         .then(response => response.json())
         .then(data => setEducationalData(data))
         .catch(error => { showToast( 'Get Education data error', error.message, 'error' ) });
   }

   const dbNewEducationData = async (eduDataRow: EduData ) => {
      let idInserted = state.eduDatas.length + 1;
      await httpClient.post('education', eduDataRow, state.token)
         .then(response => response.json())
         .then(data => {
            if('id' in data) idInserted = data.id;
            showToast( 'Nuevo registro', 'Datos educativos insertados correctamente', 'success' )
            //Swal.fire({title: 'Nuevo registro', text: 'Datos educativos insertados correctamente', icon: 'success', confirmButtonText: 'OK'})
         })
         .catch(error => {
            showToast( 'Insert Education Data error', error.message, 'error' )
            //Swal.fire({title: 'Insert Education Data error', text: error.message, icon: 'error', confirmButtonText: 'OK'})
         });
      return idInserted;
   }

   const dbEditEducationData = async (eduDataRow: EduData ) => {
      await httpClient.put('education', eduDataRow, state.token)
         .then(response => response.json())
         .then(data => showToast( 'Edición correcta', data.message, 'success' ))
         .catch(error => {
            showToast( 'Edit Education Data error', error.message, 'error' )
         });
   }   

   const dbDeleteEducationData = async (id: number ) => {
   await httpClient.delete(`education/${id}`, state.token)
      .then(response => response.json())
      .then(data => showToast( 'Eliminación correcta', data.message, 'success' ))
      .catch(error => {
         showToast( 'Delete Education Data error', error.message, 'error' )
      });
   } 

   const showToast = ( title: string, text: string, icon: 'success' | 'error' | 'warning' | 'info' | 'question', duration: number = 3000 ) => {
      Swal.fire({
         title: title,
         text: text,
         icon: icon,
         toast: true,
         position: 'top-end',
         timer: duration,
         timerProgressBar: true,
         showConfirmButton: false,
      });
   }

   return ( { user, dbLogin, dbGetUserData, dbGetEducationData, dbNewEducationData, dbEditEducationData, dbDeleteEducationData } );

}

export default useApiFetchs;