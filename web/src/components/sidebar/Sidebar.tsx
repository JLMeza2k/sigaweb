import { useState } from 'react';
import type { UserType } from '../../utils/types';
import AccordionSelector from './AccordionSelector';
import ThemeToggle from '../shared/ThemeToggle';

// ─── Types ────────────────────────────────────────────────
export type ActiveView = {
   group: string;
   view: string;
};

interface NavItem {
   id: string;
   Description: string;
   icon?: string;
   children?: NavItem[];
}

type SubmenuPermissionField = keyof Pick<UserType,
   'Viaticos' | 'BienesMuebles' | 'Adquisiciones' | 'Almacen' | 'Presupuesto' | 'Contabilidad' | 'eArch'
>;

interface NavGroup {
   id: string;
   label: string;
   icon: string;
   permissionField: SubmenuPermissionField;
   items: NavItem[];
}

interface SidebarProps {
   user: UserType;
   onLogout: () => void;
   activeView: ActiveView;
   onNavigate: (group: string, view: string) => void;
   mobileOpen: boolean;
   onClose: () => void;
}

// ─── Sidebar option bitmap ────────────────────────────────
const SIDEBAR_OPC_BIT: Record<string, number> = {
   home: 0,
   viaticos: 1,
   'bienes-muebles': 2,
   adquisiciones: 3,
   almacen: 4,
   presupuesto: 5,
   contabilidad: 6,
   'archivo-electronico': 7,
   // bits 8..13 reservados para módulos futuros
   system: 14,
   // bit 15 reservado por si se migra a int
};
const isOptEnabled = (mask: number | null | undefined, key: string) =>
   ((mask ?? 0) & (1 << SIDEBAR_OPC_BIT[key])) !== 0;
const isSubmenuOptEnabled = (mask: number | null | undefined, optionIndex: number) =>
   ((mask ?? 0) & (1 << optionIndex)) !== 0;

// ─── Navigation config (extensible) ──────────────────────
const NAV_GROUPS: NavGroup[] = [
   {
      id: 'viaticos',
      label: 'Viáticos',
      permissionField: 'Viaticos',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      items: [
         {
            id: 'comisiones',
            Description: 'Nueva Comisión',
            icon: 'M12 4v16m8-8H4',
         },
         {
            id: 'consulta',
            Description: 'Consulta de Viáticos',
            icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
         },
      ],
   },
   {
      id: 'bienes-muebles',
      label: 'Bienes Muebles',
      permissionField: 'BienesMuebles',
      icon: 'm21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9',
      items: [
         {
            id: 'buscar',
            Description: 'Buscar bienes',
            icon: 'M21 21l-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z',
         },
         {
            id: 'sin-registro',
            Description: 'Bienes sin registro',
            icon: 'M4 5h16M4 10h16M4 15h10m-10 5h10M18 15v6m3-3h-6',
         },
         {
            id: 'resumen',
            Description: 'Resumen',
            icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
         },
      ],
    },
   {
      id: 'adquisiciones',
      label: 'Adquisiciones',
      permissionField: 'Adquisiciones',
      icon: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0Zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0Z',
      items: [],
   },
   {
      id: 'almacen',
      label: 'Almacén',
      permissionField: 'Almacen',
      icon: 'M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.413 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.413 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75Z',
      items: [],
   },
   {
      id: 'presupuesto',
      label: 'Presupuesto',
      permissionField: 'Presupuesto',
      icon: 'M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6Z M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5Z',
      items: [
         {
            id: 'estado-presupuesto',
            Description: 'Estado del Presupuesto',
            icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
         },
         {
            id: 'suficiencias-presupuestales',
            Description: 'Suficiencias Presupuestales',
            icon: 'M3 3v18h18M7 14l4-4 4 4 6-7',
         },
      ],
   },
   {
      id: 'contabilidad',
      label: 'Contabilidad',
      permissionField: 'Contabilidad',
      icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      items: [
         {
            id: 'cfdis',
            Description: 'CFDIs',
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
         },
      ],
   },
   {
      id: 'archivo-electronico',
      label: 'Archivo Electrónico',
      permissionField: 'eArch',
      icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3',
      items: [
         {
            id: 'materiales',
            Description: 'Materiales',
            icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
         },
         {
            id: 'financieros',
            Description: 'Financieros',
            icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
         },
      ],
   },
];

// ─── Component ────────────────────────────────────────────
export default function Sidebar({ user, onLogout, activeView, onNavigate, mobileOpen, onClose }: SidebarProps) {
   // Inicia con el grupo activo expandido
   const [openGroups, setOpenGroups] = useState<string[]>([activeView.group]);

   const toggleGroup = (groupId: string) => {
      setOpenGroups(prev =>
         prev.includes(groupId)
            ? prev.filter(id => id !== groupId)
            : [...prev, groupId]
      );
   };

   const isHome = activeView.group === 'home';

   const enabledGroups = NAV_GROUPS
       .filter(group => isOptEnabled(user.sideBarOpcs, group.id))
       .filter(group => group.items.length === 0 || group.items.some((_, optionIndex) =>
          isSubmenuOptEnabled(user[group.permissionField], optionIndex)
       ))
       .map(group => ({
          ...group,
          items: group.items.filter((_, optionIndex) =>
             isSubmenuOptEnabled(user[group.permissionField], optionIndex)
          ),
       }));
   const showInicio = isOptEnabled(user.sideBarOpcs, 'home');
   const showConfig = isOptEnabled(user.sideBarOpcs, 'system');

    return (
       <>
       {mobileOpen && (
          <button
             type="button"
             aria-label="Cerrar menú"
             onClick={onClose}
             className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          />
       )}
       <aside
          id="main-navigation"
          aria-label="Navegación principal"
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface text-fg-secondary flex flex-col h-screen border-r border-border-subtle shadow-xl overflow-hidden transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:bottom-auto lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:shrink-0`}
       >
         {/* Brand */}
          <div className="p-6 flex items-center justify-between gap-3 border-b border-border-subtle bg-surface/50 backdrop-blur-sm shrink-0">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-app rounded-xl p-1 shadow-inner flex items-center justify-center overflow-hidden">
                    <img src={`${import.meta.env.BASE_URL}logo_issbcs.png`} alt="Logo ISSBCS" className="object-contain" />
                </div>
                <div className="flex flex-col">
                   <span className="text-sm font-bold text-fg-primary tracking-tight leading-none">ISSBCS</span>
                   <span className="text-[10px] text-fg-faint font-medium uppercase tracking-wider mt-1">Portal Web</span>
                </div>
             </div>
             <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar menú"
                className="lg:hidden p-2 -mr-2 rounded-lg text-fg-muted hover:bg-hover hover:text-fg-primary focus-visible:outline-2 focus-visible:outline-accent"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 18 6M6 6l12 12" />
                </svg>
             </button>
          </div>

         {/* Navigation */}
         <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
            {/* Inicio — controlado por sideBarOpcs bit 0 */}
            {showInicio && (
               <button
                   onClick={() => onNavigate('home', 'inicio')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                     isHome
                        ? 'bg-accent text-white shadow-lg shadow-accent/40'
                        : 'text-fg-muted hover:bg-hover hover:text-fg-primary'
                  }`}
               >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Inicio
               </button>
            )}

            {/* Divider */}
            {enabledGroups.length > 0 && (
               <div className="pt-2 pb-1 px-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-fg-fainter">Módulos</p>
               </div>
            )}

            {/* Module groups */}
            {enabledGroups.map(group => (
               <AccordionSelector
                  key={group.id}
                  label={group.label}
                  icon={group.icon}
                  items={group.items}
                   selectedId={activeView.group === group.id ? (activeView.view === 'detalle-bien' ? 'buscar' : activeView.view) : null}
                  isOpen={openGroups.includes(group.id)}
                  onToggle={() => toggleGroup(group.id)}
                  onSelect={(viewId) => {
                     onNavigate(group.id, viewId as string);
                  }}
               />
            ))}

            {/* Divider */}
            {showConfig && (
               <div className="pt-2 pb-1 px-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-fg-fainter">Sistema</p>
               </div>
            )}

            {/* Configuración — fuera de grupos */}
            {showConfig && (
               <button
                  onClick={() => onNavigate('system', 'configuracion')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                     activeView.group === 'system' && activeView.view === 'configuracion'
                        ? 'bg-accent text-white shadow-lg shadow-accent/40'
                        : 'text-fg-muted hover:bg-hover hover:text-fg-primary'
                  }`}
               >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                  Configuración
               </button>
            )}
         </nav>

         {/* User Footer */}
         <div className="p-4 border-t border-border-subtle bg-surface/80 shrink-0 space-y-3">
            <ThemeToggle variant="sidebar" />
            <div className="flex items-center gap-3 p-2 bg-panel-muted rounded-xl border border-border-strong">
               <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-sky flex items-center justify-center text-white font-bold text-lg shadow-md uppercase shrink-0">
                  {user.Nombre.charAt(0)}
               </div>
               <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold text-fg-primary truncate">{user.Nombre}</span>
                  <span className="text-[10px] text-fg-faint font-mono mt-0.5">{user.RFC}</span>
               </div>
            </div>

            <button
               onClick={onLogout}
               className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-danger bg-danger-soft hover:bg-danger-soft/80 border border-danger-border rounded-xl transition-all duration-300 group shadow-sm"
            >
               <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
               </svg>
               Cerrar Sesión
            </button>
         </div>
       </aside>
       </>
    );
}
