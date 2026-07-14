import { useState } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../utils/useAuth';
import { API_BASE } from '../utils/api';

type ViewState = 'LOGIN' | 'REGISTER' | 'FORGOT_PASS_1' | 'FORGOT_PASS_2' | 'FORGOT_PASS_3' | 'ACTIVATE';

interface LoginProps {
  onLoginSuccess?: (token: string) => void;
  initialView?: ViewState;
  onActivationSuccess?: () => void;
}

export default function Login({ initialView = 'LOGIN', onActivationSuccess }: LoginProps) {
  const [view, setView] = useState<ViewState>(initialView);
  const { dbLogin, dbVerifyActivation, isLoading: authLoading } = useAuth();

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rfc, setRfc] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState('');

  const isLoading = loading || authLoading;

  const renderIcon = (path: string) => (
    <span className="absolute left-3 top-[14px] text-blue-200">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={path} />
      </svg>
    </span>
  );

  const buttonClass = "w-full flex items-center justify-center py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/30 transform transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100";
  const inputClass = "w-full pl-10 pr-4 py-3 bg-blue-950/30 border border-blue-300/30 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-300";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Ingresa tu RFC/Correo y contraseña.', confirmButtonColor: '#3085d6' });
      return;
    }
    const result = await dbLogin(identifier, password);
    if (!result.success) {
      Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'Credenciales incorrectas.', confirmButtonColor: '#d33' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfc || !email || !password) {
      Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Llena todos los campos.', confirmButtonColor: '#3085d6' });
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/user`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfc, email, password }),
      });
      const data = await resp.json();
      if (resp.ok) {
        Swal.fire({ icon: 'success', title: 'Registro exitoso', text: 'Ahora puedes iniciar sesión.', confirmButtonColor: '#3085d6' });
        setView('LOGIN');
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'No se pudo registrar.', confirmButtonColor: '#d33' });
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar al servidor.', confirmButtonColor: '#d33' });
    } finally { setLoading(false); }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      Swal.fire({ icon: 'warning', title: 'Requerido', text: 'Ingresa tu RFC o Correo.', confirmButtonColor: '#3085d6' });
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/send-reset-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await resp.json();
      if (resp.ok) {
        Swal.fire({ icon: 'success', title: 'Código enviado', text: data.message, confirmButtonColor: '#3085d6' });
        setView('FORGOT_PASS_2');
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'No se pudo enviar el código.', confirmButtonColor: '#d33' });
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar al servidor.', confirmButtonColor: '#d33' });
    } finally { setLoading(false); }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      Swal.fire({ icon: 'warning', title: 'Requerido', text: 'Ingresa el código.', confirmButtonColor: '#3085d6' });
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/verify-reset-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, code }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setRecoveryToken(data.token);
        setView('FORGOT_PASS_3');
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Código incorrecto.', confirmButtonColor: '#d33' });
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar al servidor.', confirmButtonColor: '#d33' });
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      Swal.fire({ icon: 'warning', title: 'Requerido', text: 'Ingresa una nueva contraseña.', confirmButtonColor: '#3085d6' });
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': recoveryToken },
        body: JSON.stringify({ newPassword }),
      });
      if (resp.ok) {
        Swal.fire({ icon: 'success', title: 'Contraseña actualizada', text: 'Tu contraseña se cambió con éxito.', confirmButtonColor: '#3085d6' });
        setView('LOGIN');
      } else {
        const data = await resp.json();
        Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'No se pudo cambiar la contraseña.', confirmButtonColor: '#d33' });
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar al servidor.', confirmButtonColor: '#d33' });
    } finally { setLoading(false); }
  };

  const handleVerifyActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      Swal.fire({ icon: 'warning', title: 'Requerido', text: 'Ingresa el código de activación.', confirmButtonColor: '#3085d6' });
      return;
    }
    const success = await dbVerifyActivation(code);
    if (success) {
      onActivationSuccess?.();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-sky-800 to-cyan-700 relative overflow-hidden">
      <div className="absolute top-0 -left-48 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-[blob_7s_infinite]"></div>
      <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-[blob_7s_infinite_2s]"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-sky-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-[blob_7s_infinite_4s]"></div>

      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-white/10 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-4 shadow-inner">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {view === 'LOGIN' && 'Iniciar Sesión'}
            {view === 'REGISTER' && 'Registro'}
            {view.startsWith('FORGOT') && 'Recuperar Acceso'}
            {view === 'ACTIVATE' && 'Activa tu Cuenta'}
          </h1>
          <p className="text-blue-200 mt-2 text-sm">Gestor de Comisiones de Trabajo</p>
        </div>

        {view === 'LOGIN' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <label className="text-sm font-medium text-blue-100 block mb-2">RFC o Correo</label>
              <div className="relative">
                {renderIcon("M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z")}
                <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className={inputClass} placeholder="Ingresa RFC o correo" />
              </div>
            </div>
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-blue-100">Contraseña</label>
                <button type="button" onClick={() => setView('FORGOT_PASS_1')} className="text-xs text-sky-300 hover:text-white transition-colors">¿Olvidaste tu contraseña?</button>
              </div>
              <div className="relative">
                {renderIcon("M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z")}
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className={buttonClass}>{isLoading ? 'Cargando...' : 'Entrar'}</button>
            <div className="text-center mt-4 text-sm text-blue-100">
              ¿No tienes cuenta? <button type="button" onClick={() => setView('REGISTER')} className="text-white hover:underline font-semibold border-none bg-transparent">Regístrate</button>
            </div>
          </form>
        )}

        {view === 'REGISTER' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="relative">
              <label className="text-sm font-medium text-blue-100 block mb-1">RFC</label>
              <div className="relative">
                <input type="text" value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} className={inputClass} placeholder="Tu RFC" maxLength={13} />
              </div>
            </div>
            <div className="relative">
              <label className="text-sm font-medium text-blue-100 block mb-1">Correo Electrónico</label>
              <div className="relative">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="ejemplo@saludbcs.gob.mx" />
              </div>
            </div>
            <div className="relative">
              <label className="text-sm font-medium text-blue-100 block mb-1">Contraseña</label>
              <div className="relative">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className={buttonClass + " mt-2"}>{isLoading ? 'Registrando...' : 'Completar Registro'}</button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => setView('LOGIN')} className="text-sm text-sky-300 hover:text-white">Volver al inicio de sesión</button>
            </div>
          </form>
        )}

        {view === 'FORGOT_PASS_1' && (
          <form onSubmit={handleSendCode} className="space-y-6">
            <p className="text-blue-100 text-sm mb-4">Ingresa tu RFC o correo electrónico y te enviaremos un código de recuperación.</p>
            <div className="relative">
              <label className="text-sm font-medium text-blue-100 block mb-2">RFC o Correo</label>
              <div className="relative">
                <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className={inputClass} placeholder="Ingresa RFC o correo" />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className={buttonClass}>{isLoading ? 'Enviando...' : 'Enviar Código'}</button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => setView('LOGIN')} className="text-sm text-sky-300 hover:text-white">Cancelar</button>
            </div>
          </form>
        )}

        {view === 'FORGOT_PASS_2' && (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <p className="text-blue-100 text-sm mb-4">Ingresa el código que hemos enviado a tu correo.</p>
            <div className="relative">
              <label className="text-sm font-medium text-blue-100 block mb-2">Código de Verificación</label>
              <div className="relative">
                <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputClass} placeholder="A1B2C" maxLength={5} />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className={buttonClass}>{isLoading ? 'Verificando...' : 'Validar Código'}</button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => setView('LOGIN')} className="text-sm text-sky-300 hover:text-white">Cancelar</button>
            </div>
          </form>
        )}

        {view === 'FORGOT_PASS_3' && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <p className="text-blue-100 text-sm mb-4">Tu código ha sido verificado. Crea una nueva contraseña.</p>
            <div className="relative">
              <label className="text-sm font-medium text-blue-100 block mb-2">Nueva Contraseña</label>
              <div className="relative">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="Nueva contraseña" />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className={buttonClass}>{isLoading ? 'Guardando...' : 'Guardar y Entrar'}</button>
          </form>
        )}

        {view === 'ACTIVATE' && (
          <form onSubmit={handleVerifyActivation} className="space-y-6">
             <p className="text-blue-100 text-sm mb-4">Tu cuenta aún no está activa. Ingresa el código de activación que enviamos a tu correo al momento del registro.</p>
            <div className="relative">
              <label className="text-sm font-medium text-blue-100 block mb-2">Código de Activación</label>
              <div className="relative">
                <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputClass} placeholder="A1B2C" maxLength={5} />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className={buttonClass}>{isLoading ? 'Activando...' : 'Activar Cuenta'}</button>
            <div className="text-center mt-4 border-t border-white/10 pt-4">
              <button type="button" onClick={() => { sessionStorage.clear(); window.location.reload(); }} className="text-sm text-sky-300 hover:text-white transition-colors">
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
