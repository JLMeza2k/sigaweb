import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from "../../utils/useAuth";
import { API_BASE } from "../../utils/api";

interface Empleado {
  RFC: string;
  Nombre: string;
  CLUES: string;
  Unidad: string;
}

interface Entidad {
  Id: number;
  Estado: string;
}

interface Localidad {
  idEdo: number;
  idLocalidad: number;
  Municipio: string;
  Localidad: string;
}

interface NuevaComisionProps {
  onSuccess?: () => void;
}

const STEP = {
  EMPLEADO: 1,
  FECHAS: 2,
  DESTINO: 3,
  DETALLE: 4,
  CONFIRMAR: 5,
};

export default function NuevaComision({ onSuccess }: NuevaComisionProps) {
  const { token } = useAuth();
  const [step, setStep] = useState(STEP.EMPLEADO);

  // Employee search
  const [searchInput, setSearchInput] = useState('');
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [resultados, setResultados] = useState<Empleado[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [fetchingEmp, setFetchingEmp] = useState(false);

  // Dates
  const [fechaSalida, setFechaSalida] = useState('');
  const [fechaRegreso, setFechaRegreso] = useState('');

  // Destination
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [entidadSel, setEntidadSel] = useState<number>(3);
  const [localidadSel, setLocalidadSel] = useState<number | null>(null);
  const [localidadNombre, setLocalidadNombre] = useState('');
  const [fetchingLoc, setFetchingLoc] = useState(false);

  // Detail
  const [destinosEspecif, setDestinosEspecif] = useState('');
  const [motivo, setMotivo] = useState('');
  const [pasajes, setPasajes] = useState<number | ''>('');

  // Submit
  const [submitting, setSubmitting] = useState(false);

  const fuera_bcs = entidadSel !== 3;



  // ── Catalogs ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/catalogos/entidades`)
      .then(r => r.json())
      .then(d => setEntidades(Array.isArray(d?.recordset) ? d.recordset : []));
  }, []);

  useEffect(() => {
    setLocalidades([]);
    setLocalidadSel(null);
    setLocalidadNombre('');
    if (!entidadSel) return;
    setFetchingLoc(true);
    fetch(`${API_BASE}/catalogos/localidades`)
      .then(r => r.json())
      .then(d => {
        const all: Localidad[] = Array.isArray(d?.recordset) ? d.recordset : [];
        setLocalidades(all.filter(l => l.idEdo === entidadSel));
      })
      .finally(() => setFetchingLoc(false));
  }, [entidadSel]);

  // ── Employee search ──────────────────────────────────────────────────────
  const buscarEmpleados = async () => {
    if (!searchInput.trim()) return;
    setFetchingEmp(true);
    setResultados([]);
    setEmpleado(null);
    setShowResults(false);
    try {
      const r = await fetch(`${API_BASE}/catalogos/buscar-empleados?searchPattern=${encodeURIComponent(searchInput.trim())}`);
      const d = await r.json();
      const rows: Empleado[] = d?.recordset ?? [];
      if (rows.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Sin resultados', text: 'No se encontraron empleados con ese criterio.', confirmButtonColor: '#3085d6' });
      } else if (rows.length === 1) {
        setEmpleado(rows[0]);
        setSearchInput(rows[0].RFC);
      } else {
        setResultados(rows);
        setShowResults(true);
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar al servidor.', confirmButtonColor: '#d33' });
    } finally {
      setFetchingEmp(false);
    }
  };

  const seleccionarEmpleado = (emp: Empleado) => {
    setEmpleado(emp);
    setSearchInput(emp.RFC);
    setShowResults(false);
    setResultados([]);
  };

  // ── Submission ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!empleado || !fechaSalida || !fechaRegreso || !localidadSel || !motivo) return;
    setSubmitting(true);
    try {
      const body = {
        RFC: empleado.RFC,
        CLUES: empleado.CLUES,
        FechaSalida: fechaSalida,
        FechaRegreso: fechaRegreso,
        DestinoPpal: localidadSel,
        DestinosEspecif: destinosEspecif || null,
        Motivo: motivo,
        Pasajes: fuera_bcs && pasajes !== '' ? Number(pasajes) : 0,
      };
      const r = await fetch(`${API_BASE}/comision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.ok) {
        Swal.fire({ icon: 'success', title: '¡Comisión registrada!', text: d.message, confirmButtonColor: '#3085d6' });
        onSuccess?.();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: d.message || 'No se pudo registrar la comisión.', confirmButtonColor: '#d33' });
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar con el servidor.', confirmButtonColor: '#d33' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Validation per step ──────────────────────────────────────────────────
  const canNext = () => {
    if (step === STEP.EMPLEADO) return !!empleado;
    if (step === STEP.FECHAS) return !!fechaSalida && !!fechaRegreso && fechaRegreso >= fechaSalida;
    if (step === STEP.DESTINO) return !!localidadSel;
    if (step === STEP.DETALLE) return !!motivo.trim();
    return true;
  };

  // ── Styles ───────────────────────────────────────────────────────────────
  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium placeholder:text-slate-400";
  const labelCls = "block text-xs font-black text-slate-500 uppercase tracking-widest mb-2";
  const btnPrimary = "flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const btnSecondary = "flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all active:scale-95";

  const steps = ['Empleado', 'Fechas', 'Destino', 'Detalle', 'Confirmar'];

  const daysDiff = fechaSalida && fechaRegreso && fechaRegreso >= fechaSalida
    ? Math.ceil((new Date(fechaRegreso).getTime() - new Date(fechaSalida).getTime()) / 86400000) + 1
    : 0;

  return (
    <div className="space-y-8">
      {/* Progress tracker */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-md' : done ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${active ? 'bg-white text-blue-600' : done ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>{done ? '✓' : n}</span>
                <span className="hidden sm:block text-xs font-black uppercase tracking-widest whitespace-nowrap">{s}</span>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-300 ${done ? 'bg-slate-800' : 'bg-slate-200'}`}></div>}
            </div>
          );
        })}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8">

          {/* ── Step 1: Employee ─────────────────────────────────── */}
          {step === STEP.EMPLEADO && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Identificación del Empleado</h2>
                <p className="text-slate-400 mt-1 font-medium">Ingresa RFC o parte del nombre para buscar al empleado.</p>
              </div>

              <div className="space-y-4">
                <label className={labelCls}>RFC o Nombre del Empleado</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchInput}
                      onChange={e => { setSearchInput(e.target.value.toUpperCase()); setEmpleado(null); setShowResults(false); }}
                      onKeyDown={e => e.key === 'Enter' && buscarEmpleados()}
                      className={inputCls}
                      placeholder="Ej: GOMA810101, GONZALEZ MARTINEZ..."
                    />
                    {empleado && (
                      <span className="absolute right-3 top-3.5 text-green-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      </span>
                    )}
                  </div>
                  <button onClick={buscarEmpleados} disabled={fetchingEmp || !searchInput.trim()} className={btnPrimary}>
                    {fetchingEmp
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    }
                    Buscar
                  </button>
                </div>

                {/* Inline results panel — expands in flow, no height cap */}
                {showResults && resultados.length > 0 && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-lg animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-800 sticky top-0">
                      <span className="text-xs font-black text-slate-300 uppercase tracking-widest">
                        {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} — selecciona uno
                      </span>
                      <button
                        type="button"
                        onClick={() => { setShowResults(false); setResultados([]); }}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {resultados.map((emp, idx) => (
                        <button
                          key={emp.RFC}
                          type="button"
                          onClick={() => seleccionarEmpleado(emp)}
                          className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-blue-50 transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-white font-black text-sm shrink-0 group-hover:from-blue-600 group-hover:to-sky-500 transition-all uppercase shadow-sm">
                            {emp.Nombre.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-800 font-bold text-sm group-hover:text-blue-700 transition-colors">{emp.Nombre}</p>
                            <p className="text-slate-400 font-mono text-xs mt-0.5">{emp.RFC}</p>
                            <p className="text-slate-400 text-xs mt-0.5 truncate">{emp.Unidad}</p>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            <span className="hidden sm:block text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border">{emp.CLUES}</span>
                            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected employee card */}
              {empleado && (
                <div className="flex items-start gap-5 p-6 bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl border border-slate-700 animate-in slide-in-from-bottom-2 duration-300 shadow-xl">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-600/30 uppercase shrink-0">
                    {empleado.Nombre.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-lg tracking-tight leading-tight">{empleado.Nombre}</p>
                    <p className="text-slate-400 font-mono text-sm mt-0.5">{empleado.RFC}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-blue-900/50 text-blue-300 text-xs font-bold rounded-full border border-blue-800">{empleado.CLUES}</span>
                      <span className="px-3 py-1 bg-slate-700 text-slate-300 text-xs font-medium rounded-full border border-slate-600 truncate max-w-[280px]">{empleado.Unidad}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Cambiar empleado"
                    onClick={() => { setEmpleado(null); setSearchInput(''); setResultados([]); }}
                    className="shrink-0 w-8 h-8 bg-slate-700 hover:bg-red-800 rounded-full flex items-center justify-center transition-colors text-slate-400 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Dates ─────────────────────────────────────── */}
          {step === STEP.FECHAS && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Periodo de la Comisión</h2>
                <p className="text-slate-400 mt-1 font-medium">Define las fechas de salida y regreso.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Fecha de Salida</label>
                  <input type="date" value={fechaSalida} onChange={e => setFechaSalida(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fecha de Regreso</label>
                  <input type="date" value={fechaRegreso} min={fechaSalida} onChange={e => setFechaRegreso(e.target.value)} className={inputCls} />
                </div>
              </div>
              {daysDiff > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm font-semibold text-blue-700 flex items-center gap-3 animate-in fade-in">
                  <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  Comisión de <strong>{daysDiff}</strong> {daysDiff === 1 ? 'día' : 'días'}
                </div>
              )}
              {fechaSalida && fechaRegreso && fechaRegreso < fechaSalida && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm font-bold text-red-600 flex items-center gap-3">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  La fecha de regreso debe ser posterior o igual a la de salida.
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Destination ────────────────────────────────── */}
          {step === STEP.DESTINO && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Destino Principal</h2>
                <p className="text-slate-400 mt-1 font-medium">Selecciona la entidad y localidad a donde se comisiona.</p>
              </div>
              <div>
                <label className={labelCls}>Entidad Federativa</label>
                <select value={entidadSel} onChange={e => setEntidadSel(Number(e.target.value))} className={inputCls}>
                  {entidades.map(e => (
                    <option key={e.Id} value={e.Id}>{e.Estado}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>
                  Localidad {fetchingLoc && <span className="text-blue-500 animate-pulse">(Cargando…)</span>}
                </label>
                <select
                  value={localidadSel ?? ''}
                  onChange={e => {
                    const id = Number(e.target.value);
                    setLocalidadSel(id);
                    const found = localidades.find(l => l.idLocalidad === id);
                    setLocalidadNombre(found ? `${found.Municipio} – ${found.Localidad}` : '');
                  }}
                  className={inputCls}
                  disabled={fetchingLoc || localidades.length === 0}
                >
                  <option value="">-- Selecciona una localidad --</option>
                  {localidades.map(l => (
                    <option key={l.idLocalidad} value={l.idLocalidad}>{l.Municipio} – {l.Localidad}</option>
                  ))}
                </select>
              </div>
              {localidadSel && (
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700 text-slate-300 flex items-center gap-3 text-sm font-semibold animate-in fade-in">
                  <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  Destino: <span className="text-white font-black">{localidadNombre}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Detail ───────────────────────────────────── */}
          {step === STEP.DETALLE && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Detalles de la Comisión</h2>
                <p className="text-slate-400 mt-1 font-medium">Describe el objeto de la comisión y datos adicionales.</p>
              </div>
              <div>
                <label className={labelCls}>Motivo de la Comisión <span className="text-red-400">*</span></label>
                <textarea value={motivo} onChange={e => setMotivo(e.target.value)} className={inputCls + ' resize-none h-28'} placeholder="Describe brevemente el objetivo de esta comisión..." />
              </div>
              <div>
                <label className={labelCls}>Destinos Específicos <span className="text-slate-400 font-normal normal-case">(opcional)</span></label>
                <input type="text" value={destinosEspecif} onChange={e => setDestinosEspecif(e.target.value)} className={inputCls} placeholder="Ej: Hospital General, Clínica Conchita..." />
              </div>
              {fuera_bcs && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <label className={labelCls}>Pasajes (fuera de BCS) <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-500 font-black text-sm">$</span>
                    <input type="number" min={0} step="0.01" value={pasajes} onChange={e => setPasajes(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls + ' pl-8'} placeholder="0.00" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 5: Confirm ─────────────────────────────────── */}
          {step === STEP.CONFIRMAR && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Confirmar y Registrar</h2>
                <p className="text-slate-400 mt-1 font-medium">Verifica los datos antes de enviar la solicitud.</p>
              </div>
              <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden divide-y divide-slate-800">
                {[
                  { label: 'Empleado', value: empleado?.Nombre },
                  { label: 'RFC', value: empleado?.RFC },
                  { label: 'Unidad', value: empleado?.Unidad },
                  { label: 'Salida', value: fechaSalida },
                  { label: 'Regreso', value: fechaRegreso },
                  { label: 'Días', value: daysDiff ? `${daysDiff} día(s)` : '—' },
                  { label: 'Destino', value: localidadNombre },
                  ...(destinosEspecif ? [{ label: 'Destinos específicos', value: destinosEspecif }] : []),
                  { label: 'Motivo', value: motivo },
                  ...(fuera_bcs && pasajes !== '' ? [{ label: 'Pasajes', value: `$${Number(pasajes).toFixed(2)}` }] : []),
                ].map((row, i) => (
                  <div key={i} className={`flex gap-4 px-6 py-3.5 ${i % 2 === 0 ? 'bg-white/5' : ''}`}>
                    <span className="text-slate-500 text-sm font-black uppercase tracking-wider min-w-[140px]">{row.label}</span>
                    <span className="text-white text-sm font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex justify-between items-center px-8 py-5 border-t border-slate-100 bg-slate-50/80">
          <button onClick={() => step > STEP.EMPLEADO && setStep(s => s - 1)} disabled={step === STEP.EMPLEADO} className={btnSecondary + (step === STEP.EMPLEADO ? ' invisible' : '')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
            Anterior
          </button>
          {step < STEP.CONFIRMAR ? (
            <button onClick={() => canNext() && setStep(s => s + 1)} disabled={!canNext()} className={btnPrimary}>
              Siguiente
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className={btnPrimary + ' !bg-green-600 hover:!bg-green-500 shadow-green-500/20'}>
              {submitting
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Registrando...</>
                : <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg> Registrar Comisión</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
