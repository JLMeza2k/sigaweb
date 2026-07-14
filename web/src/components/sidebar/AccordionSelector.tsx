type AccordionItem = {
   id: string | number;
   Description: string;
   icon?: string; // SVG path opcional para íconos
};

type AddButtonConfig = {
   title: string;
   disabled: boolean;
   onClick: () => void;
};

type AccordionSelectorProps = {
   label: string;
   icon?: string; // Ícono SVG del grupo
   items: AccordionItem[];
   selectedId: string | number | null;
   isOpen: boolean;
   onToggle: () => void;
   onSelect: (id: string | number) => void;
   addButton?: AddButtonConfig;
};

const AccordionSelector = ({
   label,
   icon,
   items,
   selectedId,
   isOpen,
   onToggle,
   onSelect,
   addButton,
}: AccordionSelectorProps) => {
   const isGroupActive = items.some(i => i.id === selectedId);

   return (
      <div className='rounded-xl overflow-hidden'>
         <div
            role='button'
            tabIndex={0}
            onClick={onToggle}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
            className={`w-full flex items-center justify-between px-4 py-3 transition-all duration-200 cursor-pointer select-none rounded-xl ${
               isGroupActive && !isOpen
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
         >
            <span className='flex items-center gap-3'>
               {icon && (
                  <svg className='w-5 h-5 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                     <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d={icon} />
                  </svg>
               )}
               <span className='text-sm font-semibold'>{label}</span>
            </span>
            <div className='flex items-center gap-2'>
               {addButton && (
                  <button
                     title={addButton.title}
                     disabled={addButton.disabled}
                     onClick={(e) => { e.stopPropagation(); addButton.onClick(); }}
                     className='bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                  >+</button>
               )}
               <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill='none' stroke='currentColor' viewBox='0 0 24 24'
               >
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 9l-7 7-7-7' />
               </svg>
            </div>
         </div>
         {isOpen && (
            <div className='mt-1 ml-4 pl-4 border-l border-slate-700 space-y-1'>
               {items.map(item => (
                  <button
                     key={item.id}
                     onClick={() => onSelect(item.id)}
                     className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                        selectedId === item.id
                           ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-900/40'
                           : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                     }`}
                  >
                     {item.icon && (
                        <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                           <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d={item.icon} />
                        </svg>
                     )}
                     {item.Description}
                  </button>
               ))}
            </div>
         )}
      </div>
   );
};

export default AccordionSelector;
