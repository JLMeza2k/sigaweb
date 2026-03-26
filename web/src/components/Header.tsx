import type { UserType } from '../utils/types';

interface HeaderProps {
  user: UserType;
  title: string;
}

export default function Header({ user, title }: HeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 py-4 flex justify-between items-center sticky top-0 z-40 lg:ml-0 transition-all duration-300">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
          {title}
        </h1>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secretaría de Salud BCS</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Branding placeholder for larger view or contextual info */}
        <div className="flex flex-col items-end">
           <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Bienvenido</span>
           <span className="text-sm font-black text-blue-600 uppercase tracking-tight">{user.Nombre.split(' ').slice(0, 2).join(' ')}</span>
        </div>
      </div>
    </header>
  );
}
