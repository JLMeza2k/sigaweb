import { useState } from 'react';
import type { UserType } from '../../utils/types';
import AccordionSelector from './AccordionSelector';

// ─── Types ────────────────────────────────────────────────
export type ActiveView = {
   group: string;
   view: string;
};

interface NavItem {
   id: string;
   Description: string;
   icon?: string;
}

interface NavGroup {
   id: string;
   label: string;
   icon: string;
   items: NavItem[];
}

interface SidebarProps {
   user: UserType;
   onLogout: () => void;
   activeView: ActiveView;
   onNavigate: (group: string, view: string) => void;
}

// ─── Navigation config (extensible) ──────────────────────
const NAV_GROUPS: NavGroup[] = [
   {
      id: 'viaticos',
      label: 'Viáticos',
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
   // Aquí se agregarán más grupos a futuro
];

// ─── Component ────────────────────────────────────────────
export default function Sidebar({ user, onLogout, activeView, onNavigate }: SidebarProps) {
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

   return (
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800 shadow-xl overflow-hidden">
         {/* Brand */}
         <div className="p-6 flex items-center gap-3 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm shrink-0">
            <div className="w-10 h-10 bg-white rounded-xl p-1 shadow-inner flex items-center justify-center overflow-hidden">
               <img src="/logo_issbcs.png" alt="Logo ISSBCS" className="object-contain" />
            </div>
            <div className="flex flex-col">
               <span className="text-sm font-bold text-white tracking-tight leading-none">ISSBCS</span>
               <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">Portal Web</span>
            </div>
         </div>

         {/* Navigation */}
         <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
            {/* Inicio — siempre visible fuera de grupos */}
            <button
               onClick={() => onNavigate('home', 'dashboard')}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isHome
                     ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                     : 'text-slate-400 hover:bg-slate-800 hover:text-white'
               }`}
            >
               <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
               </svg>
               Inicio
            </button>

            {/* Divider */}
            <div className="pt-2 pb-1 px-2">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Módulos</p>
            </div>

            {/* Module groups */}
            {NAV_GROUPS.map(group => (
               <AccordionSelector
                  key={group.id}
                  label={group.label}
                  icon={group.icon}
                  items={group.items}
                  selectedId={activeView.group === group.id ? activeView.view : null}
                  isOpen={openGroups.includes(group.id)}
                  onToggle={() => toggleGroup(group.id)}
                  onSelect={(viewId) => {
                     onNavigate(group.id, viewId as string);
                  }}
               />
            ))}

            {/* Divider */}
            <div className="pt-2 pb-1 px-2">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Sistema</p>
            </div>

            {/* Configuración — fuera de grupos */}
            <button
               onClick={() => onNavigate('system', 'configuracion')}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeView.group === 'system' && activeView.view === 'configuracion'
                     ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                     : 'text-slate-400 hover:bg-slate-800 hover:text-white'
               }`}
            >
               <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
               </svg>
               Configuración
            </button>
         </nav>

         {/* User Footer */}
         <div className="p-4 border-t border-slate-800 bg-slate-900/80 shrink-0">
            <div className="flex items-center gap-3 mb-4 p-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
               <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white font-bold text-lg shadow-md uppercase shrink-0">
                  {user.Nombre.charAt(0)}
               </div>
               <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold text-white truncate">{user.Nombre}</span>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5">{user.RFC}</span>
               </div>
            </div>

            <button
               onClick={onLogout}
               className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-red-400 bg-red-900/20 hover:bg-red-900/30 border border-red-900/30 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-red-900/20"
            >
               <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
               </svg>
               Cerrar Sesión
            </button>
         </div>
      </aside>
   );
}
