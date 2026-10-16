import { useTheme } from '../../hooks/useTheme';

interface ThemeToggleProps {
   variant?: 'sidebar' | 'header';
}

export default function ThemeToggle({ variant = 'header' }: ThemeToggleProps) {
   const { theme, toggleTheme } = useTheme();
   const isDark = theme === 'dark';
   const label = isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';

   const baseClass =
      'inline-flex items-center justify-center gap-2 rounded-xl border transition-all active:scale-95';
   const variantClass =
      variant === 'sidebar'
         ? 'w-full border-border-strong bg-panel px-3 py-2 text-xs font-semibold text-fg-secondary hover:border-accent-border hover:bg-accent-soft hover:text-accent-fg'
         : 'border-border-strong bg-panel px-3 py-2 text-xs font-semibold text-fg-secondary hover:border-accent-border hover:bg-accent-soft hover:text-accent-fg';

   return (
      <button
         type="button"
         onClick={toggleTheme}
         aria-label={label}
         title={label}
         className={`${baseClass} ${variantClass}`}
      >
         {isDark ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
               />
            </svg>
         ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
               />
            </svg>
         )}
         {variant === 'sidebar' && <span>{isDark ? 'Tema claro' : 'Tema oscuro'}</span>}
      </button>
   );
}
