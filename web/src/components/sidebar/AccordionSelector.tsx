import { useState } from 'react';

type AccordionItem = {
   id: string | number;
   Description: string;
   icon?: string;
   children?: AccordionItem[];
};

type AddButtonConfig = {
   title: string;
   disabled: boolean;
   onClick: () => void;
};

type AccordionSelectorProps = {
   label: string;
   icon?: string;
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
   const initialParent = items.find(i => i.children?.some(c => c.id === selectedId));
   const [openChildren, setOpenChildren] = useState<(string | number)[]>(
      initialParent ? [initialParent.id] : []
   );
   const [prevSelectedId, setPrevSelectedId] = useState(selectedId);

   if (selectedId !== prevSelectedId) {
      setPrevSelectedId(selectedId);
      const parentOfSelected = items.find(i =>
         i.children?.some(c => c.id === selectedId)
      );
      setOpenChildren(prev => {
         const stillValid = prev.filter(pid => {
            const parent = items.find(i => i.id === pid);
            return parent?.children?.some(c => c.id === selectedId);
         });
         if (parentOfSelected && !stillValid.includes(parentOfSelected.id)) {
            return [...stillValid, parentOfSelected.id];
         }
         return stillValid;
      });
   }

   const toggleChild = (id: string | number) => {
      setOpenChildren(prev =>
         prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
   };

   const isChildActive = (item: AccordionItem) =>
      !!item.children?.some(c => c.id === selectedId);

   const isGroupActive =
      items.some(i => i.id === selectedId) ||
      items.some(i => isChildActive(i));

   return (
      <div className='rounded-xl overflow-hidden'>
         <div
            role='button'
            tabIndex={0}
            onClick={onToggle}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
            className={`w-full flex items-center justify-between px-4 py-3 transition-all duration-200 cursor-pointer select-none rounded-xl ${
               isGroupActive && !isOpen
                  ? 'bg-accent-soft text-accent-fg border border-accent-border'
                  : 'text-fg-muted hover:bg-hover hover:text-fg-primary'
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
                     className='bg-accent text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
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
            <div className='mt-1 ml-4 pl-4 border-l border-border-strong space-y-1'>
               {items.map(item => {
                  if (item.children && item.children.length > 0) {
                     const childOpen = openChildren.includes(item.id);
                     return (
                        <div key={item.id} className='space-y-1'>
                           <button
                              type='button'
                              onClick={() => toggleChild(item.id)}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                                 isChildActive(item)
                                    ? 'text-accent-fg font-semibold'
                                    : 'text-fg-muted hover:bg-hover hover:text-fg-primary'
                              }`}
                           >
                              <span className='flex items-center gap-2.5'>
                                 {item.icon && (
                                    <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                       <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d={item.icon} />
                                    </svg>
                                 )}
                                 {item.Description}
                              </span>
                              <svg
                                 className={`w-3.5 h-3.5 transition-transform duration-200 ${childOpen ? 'rotate-180' : ''}`}
                                 fill='none' stroke='currentColor' viewBox='0 0 24 24'
                              >
                                 <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 9l-7 7-7-7' />
                              </svg>
                           </button>
                           {childOpen && (
                              <div className='ml-4 pl-4 border-l border-border-strong/60 space-y-1'>
                                 {item.children.map(child => (
                                    <button
                                       key={child.id}
                                       onClick={() => onSelect(child.id)}
                                       className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                                          selectedId === child.id
                                             ? 'bg-accent text-white font-semibold shadow-lg shadow-accent/40'
                                             : 'text-fg-muted hover:bg-hover hover:text-fg-primary'
                                       }`}
                                    >
                                       {item.icon && (
                                          <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                             <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d={item.icon} />
                                          </svg>
                                       )}
                                       {child.Description}
                                    </button>
                                 ))}
                              </div>
                           )}
                        </div>
                     );
                  }
                  return (
                     <button
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                           selectedId === item.id
                              ? 'bg-accent text-white font-semibold shadow-lg shadow-accent/40'
                              : 'text-fg-muted hover:bg-hover hover:text-fg-primary'
                        }`}
                     >
                        {item.icon && (
                           <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d={item.icon} />
                           </svg>
                        )}
                        {item.Description}
                     </button>
                  );
               })}
            </div>
         )}
      </div>
   );
};

export default AccordionSelector;
