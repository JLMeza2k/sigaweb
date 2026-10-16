import type { UserType } from '../utils/types';
import ThemeToggle from './shared/ThemeToggle';

interface HeaderProps {
  user: UserType;
  title: string;
}

export default function Header({ user, title }: HeaderProps) {
  return (
    <header className="bg-surface/80 backdrop-blur-md border-b border-border-subtle px-8 py-4 flex justify-between items-center sticky top-0 z-40 lg:ml-0 transition-all duration-300">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-extrabold text-fg-primary tracking-tight flex items-center gap-3">
          <span className="w-1.5 h-6 bg-accent rounded-full"></span>
          {title}
        </h1>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-panel-muted border border-border-subtle rounded-full">
           <span className="text-[10px] font-black text-fg-muted uppercase tracking-widest">Secretaría de Salud BCS</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col items-end">
           <span className="text-xs font-bold text-fg-muted uppercase tracking-tighter">Bienvenido</span>
           <span className="text-sm font-black text-accent-fg uppercase tracking-tight">{user.Nombre.split(' ').slice(0, 2).join(' ')}</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
