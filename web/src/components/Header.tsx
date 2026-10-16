import type { UserType } from '../utils/types';
import ThemeToggle from './shared/ThemeToggle';

interface HeaderProps {
  user: UserType;
  title: string;
  mobileMenuOpen: boolean;
  onMenuToggle: () => void;
}

export default function Header({ user, title, mobileMenuOpen, onMenuToggle }: HeaderProps) {
  return (
    <header className="bg-surface/80 backdrop-blur-md border-b border-border-subtle px-4 sm:px-8 py-4 flex justify-between items-center sticky top-0 z-30 transition-all duration-300">
      <div className="flex items-center gap-3 sm:gap-6 min-w-0">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileMenuOpen}
          aria-controls="main-navigation"
          className="lg:hidden shrink-0 p-2 -ml-2 rounded-lg text-fg-secondary hover:bg-hover hover:text-fg-primary focus-visible:outline-2 focus-visible:outline-accent"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            {mobileMenuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
        <h1 className="text-lg sm:text-xl font-extrabold text-fg-primary tracking-tight flex items-center gap-3 min-w-0">
          <span className="w-1.5 h-6 bg-accent rounded-full"></span>
          <span className="truncate">{title}</span>
        </h1>
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-panel-muted border border-border-subtle rounded-full">
           <span className="text-[10px] font-black text-fg-muted uppercase tracking-widest">Secretaría de Salud BCS</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="hidden md:flex flex-col items-end">
           <span className="text-xs font-bold text-fg-muted uppercase tracking-tighter">Bienvenido</span>
           <span className="text-sm font-black text-accent-fg uppercase tracking-tight">{user.Nombre.split(' ').slice(0, 2).join(' ')}</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
