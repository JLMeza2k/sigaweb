import { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Header from './components/Header';
import Sidebar from './components/sidebar/Sidebar';
import type { ActiveView } from './components/sidebar/Sidebar';
import NuevaComision from './components/viaticos/NuevaComision';
import MisViaticos from './components/viaticos/MisViaticos';
import FinancierosDashboard from './components/archivo-electronico/FinancierosDashboard';
import EstadoPresupuesto from './components/presupuesto/EstadoPresupuesto';
import CfdiModule from './components/cfdirepo/CfdiModule';
import ResumenBienesMuebles from './components/bienes-muebles/ResumenBienesMuebles';
import BienesSinRegistro from './components/bienes-muebles/BienesSinRegistro';
import DetalleBienesMuebles from './components/bienes-muebles/DetalleBienesMuebles';
import BuscarBienesMuebles from './components/bienes-muebles/BuscarBienesMuebles';
import DetalleBienMueble from './components/bienes-muebles/DetalleBienMueble';
import type { ResumenFila } from './components/bienes-muebles/useResumenBM';

interface CentroSeleccionado {
  ua: number;
  ct: number;
  descripcion: string;
}

interface AreaSeleccionada {
  ua: number;
  ct: number;
  area: string;
  nameArea: string;
}

function App() {
    const { user, token, logout, isLoading } = useAuth();
    const [activeView, setActiveView] = useState<ActiveView>({ group: 'home', view: 'inicio' });
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [centroSeleccionado, setCentroSeleccionado] = useState<CentroSeleccionado | null>(null);
    const [areaSeleccionada, setAreaSeleccionada] = useState<AreaSeleccionada | null>(null);
    const [bienSeleccionado, setBienSeleccionado] = useState<string | null>(null);

    useEffect(() => {
       if (!mobileMenuOpen) return;

       const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') setMobileMenuOpen(false);
       };

       window.addEventListener('keydown', handleKeyDown);
       return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mobileMenuOpen]);

    const navigate = (group: string, view: string) => {
       setActiveView({ group, view });
       setMobileMenuOpen(false);
    };

    const handleRowClick = (fila: ResumenFila) => {
       setCentroSeleccionado({
          ua: fila.unidad,
          ct: fila.centro,
          descripcion: fila.descripcion,
       });
       setActiveView({ group: 'bienes-muebles', view: 'por-area' });
    };

    const handleAreaClick = (fila: ResumenFila) => {
       setAreaSeleccionada({
          ua: fila.unidad,
          ct: fila.centro,
          area: fila.area,
          nameArea: fila.descripcion,
       });
       setActiveView({ group: 'bienes-muebles', view: 'detalle-area' });
    };

    const handleBienClick = (nuibm: string) => {
       setBienSeleccionado(nuibm);
       setActiveView({ group: 'bienes-muebles', view: 'detalle-bien' });
       setMobileMenuOpen(false);
    };

   // ── Loading splash ────────────────────────────────────────
   if (isLoading && user.IdUser === -1) {
      return (
         <div className="min-h-screen bg-app flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent"></div>
            <div className="absolute inset-0 bg-app/40 backdrop-blur-sm flex items-center justify-center">
                <img src={`${import.meta.env.BASE_URL}logo_issbcs.png`} alt="Loading" className="w-8 h-8 animate-pulse" />
            </div>
         </div>
      );
   }

   // ── Not logged in ─────────────────────────────────────────
   if (!token) {
      return <Login onLoginSuccess={() => { }} />;
   }

   // ── Logged in, profile not yet loaded ─────────────────────
   if (user.IdUser === -1) {
      return (
         <div className="min-h-screen bg-app flex items-center justify-center flex-col gap-6">
            <div className="relative">
               <div className="animate-spin rounded-full h-20 w-20 border-4 border-accent border-t-transparent shadow-xl"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                   <img src={`${import.meta.env.BASE_URL}logo_issbcs.png`} alt="Logo" className="w-10 h-10 object-contain" />
               </div>
            </div>
            <div className="text-center">
               <p className="text-fg-primary font-bold text-lg tracking-tight uppercase">Cargando Perfil</p>
               <p className="text-fg-muted text-sm mt-1">Conectando con la Secretaría de Salud...</p>
            </div>
            <button onClick={logout} className="mt-4 px-6 py-2 bg-panel text-fg-secondary rounded-xl font-bold text-sm border border-border-strong hover:bg-hover hover:text-fg-primary transition-all shadow-lg active:scale-95">
               Cerrar sesión
            </button>
         </div>
      );
   }

   // ── Logged in, not activated ──────────────────────────────
   if (!user.Activo) {
      return (
         <Login
            initialView="ACTIVATE"
            onLoginSuccess={() => { }}
            onActivationSuccess={() => { }}
         />
      );
   }

   // ── View title helper ─────────────────────────────────────
    const getViewTitle = (): string => {
       const { group, view } = activeView;
       if (group === 'home') return 'Panel de Inicio';
       if (group === 'viaticos') {
          if (view === 'comisiones') return 'Nueva Comisión';
          if (view === 'consulta') return 'Consulta de Viáticos';
       }
       if (group === 'system' && view === 'configuracion') return 'Configuración de Perfil';
       if (group === 'presupuesto' && view === 'estado-presupuesto') return 'Estado del Presupuesto';
       if (group === 'archivo-electronico') {
          if (view === 'financieros') return 'Dashboard Financiero';
          if (view === 'materiales') return 'Materiales';
       }
       if (group === 'contabilidad' && view === 'cfdis') return 'CFDIs';
         if (group === 'bienes-muebles' && view === 'resumen') return 'Resumen de Bienes Muebles';
         if (group === 'bienes-muebles' && view === 'buscar') return 'Buscar Bienes Muebles';
         if (group === 'bienes-muebles' && view === 'detalle-bien') return `Detalle NUIBM ${bienSeleccionado ?? ''}`;
        if (group === 'bienes-muebles' && view === 'por-area') return centroSeleccionado?.descripcion ?? 'Detalle por Centro';
        if (group === 'bienes-muebles' && view === 'detalle-area') return areaSeleccionada?.nameArea ?? 'Detalle de Área';
        return 'Portal ISSBCS';
    };

   // ── Render helpers ────────────────────────────────────────
   const is = (group: string, view: string) =>
      activeView.group === group && activeView.view === view;

   const isHome = activeView.group === 'home';
    const isUnknown = !isHome
      && !is('viaticos', 'comisiones')
      && !is('viaticos', 'consulta')
      && !is('system', 'configuracion')
      && !is('archivo-electronico', 'financieros')
      && !is('archivo-electronico', 'materiales')
      && !is('presupuesto', 'estado-presupuesto')
      && !is('contabilidad', 'cfdis')
       && !is('bienes-muebles', 'resumen')
       && !is('bienes-muebles', 'buscar')
       && !is('bienes-muebles', 'detalle-bien')
       && !is('bienes-muebles', 'por-area')
       && !is('bienes-muebles', 'detalle-area');

   // ── Full-screen dashboards ───────────────────────────────
   if (is('archivo-electronico', 'financieros')) {
      return <FinancierosDashboard onBack={() => navigate('home', 'inicio')} />;
   }
if (is('presupuesto', 'estado-presupuesto')) {
       return <EstadoPresupuesto onBack={() => navigate('home', 'inicio')} />;
    }
     if (is('bienes-muebles', 'resumen')) {
        return <ResumenBienesMuebles onBack={() => navigate('home', 'inicio')} onRowClick={handleRowClick} />;
     }
     if (is('bienes-muebles', 'por-area') && centroSeleccionado) {
        return <ResumenBienesMuebles onBack={() => navigate('bienes-muebles', 'resumen')} ua={centroSeleccionado.ua} ct={centroSeleccionado.ct} descripcion={centroSeleccionado.descripcion} onAreaClick={handleAreaClick} />;
     }
     if (is('bienes-muebles', 'detalle-area') && areaSeleccionada) {
        return <DetalleBienesMuebles ua={areaSeleccionada.ua} ct={areaSeleccionada.ct} area={areaSeleccionada.area} nameArea={areaSeleccionada.nameArea} onBack={() => navigate('bienes-muebles', 'por-area')} />;
     }
     if (is('bienes-muebles', 'sin-registro')) {
        return <BienesSinRegistro onBack={() => navigate('home', 'inicio')} />;
     }

   // ── Authenticated layout ──────────────────────────────────
   return (
      <div className="min-h-screen flex bg-app font-sans selection:bg-accent-soft selection:text-accent-fg transition-all duration-700 animate-in fade-in">
          <Sidebar
             user={user}
             onLogout={logout}
             activeView={activeView}
             onNavigate={navigate}
             mobileOpen={mobileMenuOpen}
             onClose={() => setMobileMenuOpen(false)}
          />

          <div className="flex-1 flex flex-col min-w-0">
             <Header
                user={user}
                title={getViewTitle()}
                mobileMenuOpen={mobileMenuOpen}
                onMenuToggle={() => setMobileMenuOpen(open => !open)}
             />

            <main className="flex-1 p-8 overflow-y-auto bg-app/50 backdrop-blur-3xl custom-scrollbar">
               <div className="w-full mx-auto space-y-8 pb-12">

                  {/* ── Home ─────────────────────────────────── */}
                  {isHome && (
                     <div className="bg-panel p-12 rounded-[2.5rem] shadow-sm border border-border-subtle text-center">
                        <div className="w-20 h-20 bg-panel-muted rounded-3xl mx-auto mb-6 flex items-center justify-center text-accent">
                           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                           </svg>
                        </div>
                        <h2 className="text-3xl font-black text-fg-primary mb-3 tracking-tight">
                           Bienvenido, {user.Nombre.split(' ')[0]}
                        </h2>
                        <p className="text-fg-muted max-w-md mx-auto font-medium leading-relaxed">
                           Selecciona un módulo del menú lateral para comenzar.
                        </p>
                     </div>
                  )}

                  {/* ── Viaticos: Nueva Comisión ─────────────── */}
                  {is('viaticos', 'comisiones') && (
                     <NuevaComision onSuccess={() => navigate('home', 'inicio')} />
                  )}

               {/* ── Viaticos: Consulta ───────────────────── */}
               {is('viaticos', 'consulta') && (
                  <MisViaticos />
               )}

               {/* ── Contabilidad: CFDIs ──────────────────── */}
                {is('contabilidad', 'cfdis') && (
                   <CfdiModule />
                )}

                {(is('bienes-muebles', 'buscar') || is('bienes-muebles', 'detalle-bien')) && (
                   <div className={is('bienes-muebles', 'buscar') ? '' : 'hidden'}>
                      <BuscarBienesMuebles onOpenDetail={handleBienClick} />
                   </div>
                )}
                {is('bienes-muebles', 'detalle-bien') && bienSeleccionado && (
                   <DetalleBienMueble nuibm={bienSeleccionado} onBack={() => navigate('bienes-muebles', 'buscar')} />
                )}


                  {/* ── Módulo en desarrollo ─────────────────── */}
                  {isUnknown && (
                     <div className="bg-panel p-12 rounded-[2.5rem] shadow-sm border border-border-subtle text-center animate-in slide-in-from-bottom-4 duration-500">
                        <div className="w-20 h-20 bg-panel-muted rounded-3xl mx-auto mb-6 flex items-center justify-center text-fg-faint">
                           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                           </svg>
                        </div>
                        <h2 className="text-3xl font-black text-fg-primary mb-4 tracking-tight uppercase">Módulo en Desarrollo</h2>
                        <p className="text-fg-muted max-w-lg mx-auto font-medium text-lg leading-relaxed">
                           Estamos trabajando para integrar las funcionalidades de <span className="text-accent font-bold">{getViewTitle()}</span> próximamente.
                        </p>
                        <button onClick={() => navigate('home', 'inicio')} className="mt-10 px-8 py-3 bg-panel-muted hover:bg-hover text-fg-secondary font-bold rounded-xl transition-all active:scale-95">
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
