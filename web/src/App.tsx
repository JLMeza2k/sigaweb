import { useState } from 'react';
import { useAuth } from './utils/useAuth';
import Login from './components/Login';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import NuevaComision from './components/NuevaComision';
import MisViaticos from './components/MisViaticos';

function App() {
  const { user, token, logout, isLoading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  
  if (isLoading && user.IdUser === -1) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
           <img src="/logo_issbcs.png" alt="Loading" className="w-8 h-8 animate-pulse" />
        </div>
      </div>
    );
  }

  // Case 1: Not logged in
  if (!token) {
    return <Login onLoginSuccess={() => {}} />;
  }

  // Case 2: Logged in but user data not yet loaded or fetching failed
  if (user.IdUser === -1) {
     return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center flex-col gap-6">
           <div className="relative">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-500 border-t-transparent shadow-xl"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <img src="/logo_issbcs.png" alt="Logo" className="w-10 h-10 object-contain" />
              </div>
           </div>
           <div className="text-center">
              <p className="text-white font-bold text-lg tracking-tight uppercase">Cargando Perfil</p>
              <p className="text-slate-400 text-sm mt-1">Conectando con la Secretaría de Salud...</p>
           </div>
           <button onClick={logout} className="mt-4 px-6 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm border border-slate-700 hover:bg-slate-700 hover:text-white transition-all shadow-lg active:scale-95">
              Cerrar sesión
           </button>
        </div>
     );
  }

  // Case 3: Logged in but not active
  if (!user.Activo) {
    return (
      <Login 
        initialView="ACTIVATE" 
        onLoginSuccess={() => {}} 
        onActivationSuccess={() => {}}
      />
    );
  }

  // Case 4: Logged in and active
  const getViewTitle = () => {
     switch(activeView) {
        case 'dashboard': return 'Panel de Inicio';
        case 'comisiones': return 'Gestionar Comisiones';
        case 'viaticos': return 'Mis Viáticos';
        case 'configuracion': return 'Configuración de Perfil';
        default: return 'Gestor de Comisiones';
     }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 transition-all duration-700 animate-in fade-in">
      <Sidebar 
        user={user} 
        onLogout={logout} 
        activeView={activeView} 
        onNavigate={setActiveView} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} title={getViewTitle()} />
        
        <main className="flex-1 p-8 overflow-y-auto bg-slate-50/50 backdrop-blur-3xl custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-8 pb-12">
            
            {activeView === 'dashboard' && (
               <>
                  <section className="bg-gradient-to-r from-slate-900 to-slate-800 p-10 rounded-[2.5rem] shadow-2xl border border-white/5 flex justify-between items-center group overflow-hidden relative">
                    {/* Decorative blobs */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover:bg-blue-500/20"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl -ml-16 -mb-16"></div>
                    
                    <div className="relative z-10 w-full md:w-2/3">
                      <div className="inline-block px-4 py-1.5 bg-blue-500/20 rounded-full border border-blue-500/30 text-blue-400 text-xs font-black uppercase tracking-widest mb-4">Módulo de Viáticos</div>
                      <h2 className="text-4xl font-black text-white mb-4 leading-tight">Bienvenido, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">{user.Nombre.split(' ')[0]}</span></h2>
                      <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-xl">
                         Gestione sus órdenes de comisión, verifique sus saldos de viáticos y consulte su historial laboral de manera eficiente.
                      </p>
                      <button onClick={() => setActiveView('comisiones')} className="mt-8 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-3">
                         Solicitar Comisión
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </button>
                    </div>
                    <div className="hidden lg:flex relative z-10 p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                       <img src="/logo_issbcs.png" alt="Institutional" className="w-32 h-32 object-contain" />
                    </div>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                      { id: 'comisiones', title: 'Nueva Comisión', desc: 'Genere una orden de comisión oficial para registro.', color: 'bg-blue-600', text: 'text-blue-600', icon: 'M12 4v16m8-8H4' },
                      { id: 'viaticos', title: 'Mis Viáticos', desc: 'Verifique depósitos y comprobación de gastos.', color: 'bg-slate-700', text: 'text-slate-700', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                      { id: 'configuracion', title: 'Preferencias', desc: 'Ajuste los parámetros de su perfil de usuario.', color: 'bg-slate-400', text: 'text-slate-600', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
                    ].map((card, i) => (
                      <div key={i} onClick={() => setActiveView(card.id)} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 hover:shadow-2xl hover:border-blue-200 transition-all duration-500 cursor-pointer group hover:-translate-y-2 flex flex-col items-center text-center">
                        <div className={`w-16 h-16 ${card.color} rounded-2xl mb-6 flex items-center justify-center text-white shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={card.icon} />
                           </svg>
                        </div>
                        <h3 className={`text-xl font-black text-slate-800 tracking-tight uppercase transition-colors group-hover:text-blue-600`}>{card.title}</h3>
                        <p className="text-slate-500 mt-3 font-medium leading-relaxed">{card.desc}</p>
                        <div className="mt-8 flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                           Acceder Ahora
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </div>
                      </div>
                    ))}
                  </div>
               </>
            )}

            {activeView === 'comisiones' && (
               <NuevaComision onSuccess={() => setActiveView('dashboard')} />
            )}

            {activeView === 'viaticos' && (
               <MisViaticos />
            )}

            {activeView !== 'dashboard' && activeView !== 'comisiones' && activeView !== 'viaticos' && (
               <div className="bg-white p-12 rounded-[2.5rem] shadow-sm border border-slate-200 text-center animate-in slide-in-from-bottom-4 duration-500">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl mx-auto mb-6 flex items-center justify-center text-slate-400">
                     <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                     </svg>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight uppercase">Módulo en Desarrollo</h2>
                  <p className="text-slate-500 max-w-lg mx-auto font-medium text-lg leading-relaxed">
                     Estamos trabajando para integrar las funcionalidades de <span className="text-blue-600 font-bold">{getViewTitle()}</span> próximamente.
                  </p>
                  <button onClick={() => setActiveView('dashboard')} className="mt-10 px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all active:scale-95">
                     Volver al Inicio
                  </button>
               </div>
            )}
            
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
