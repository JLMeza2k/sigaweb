import { useState, useEffect } from 'react';
import { API_BASE } from '../../utils/api';

export interface CLCData {
  FF: string;
  Pendiente: number;
  Completo: number;
}

export interface CLCRelRow {
  Numero: number;
  Año: number;
  Beneficiario: string;
  FechaPago: string;
  Pago: string;
  Importe: number;
}

export interface ConciliaRow {
  Descripcion: string;
  fechaApertura: string;
  fechaCancelacion: string;
  [month: string]: string | number | null;
}

export interface StatusEntry {
  Pendiente: number;
  Completo: number;
}

export interface SufRelRow {
  Numero: number;
  Fecha: string;
  FF: string;
  Rbr: string;
  Observaciones: string;
  Solicito: string;
  Otorgado: number;
  Contratado: number;
  Recibido: number;
  Pagado: number;
  eArch_Suf: number;
}

interface DashboardDataResult {
  clcData: CLCData[];
  conciliaData: ConciliaRow[];
  clcLoading: boolean;
  conciliaLoading: boolean;
  clcError: string | null;
  conciliaError: string | null;
  viaticosData: StatusEntry[];
  viaticosLoading: boolean;
  viaticosError: string | null;
  suficienciasData: StatusEntry[];
  suficienciasLoading: boolean;
  suficienciasError: string | null;
  refetch: () => void;
}

export function useDashboardData(
  ejercicio: number,
  añoRecurso: number,
  añoConcilia: number,
  ubicacion: number,
  añoViaticos: number,
  añoSuficiencias: number
): DashboardDataResult {
  const [clcData, setClcData] = useState<CLCData[]>([]);
  const [conciliaData, setConciliaData] = useState<ConciliaRow[]>([]);
  const [clcLoading, setClcLoading] = useState(true);
  const [conciliaLoading, setConciliaLoading] = useState(true);
  const [clcError, setClcError] = useState<string | null>(null);
  const [conciliaError, setConciliaError] = useState<string | null>(null);
  const [viaticosData, setViaticosData] = useState<StatusEntry[]>([]);
  const [viaticosLoading, setViaticosLoading] = useState(true);
  const [viaticosError, setViaticosError] = useState<string | null>(null);
  const [suficienciasData, setSuficienciasData] = useState<StatusEntry[]>([]);
  const [suficienciasLoading, setSuficienciasLoading] = useState(true);
  const [suficienciasError, setSuficienciasError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setClcLoading(true);
    setClcError(null);
    fetch(`${API_BASE}/dashboard/earch/clc/${ejercicio}`)
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data: CLCData[]) => setClcData(data))
      .catch(err => setClcError(String(err.message ?? err)))
      .finally(() => setClcLoading(false));
  }, [ejercicio, tick]);

  useEffect(() => {
    setConciliaLoading(true);
    setConciliaError(null);
    fetch(`${API_BASE}/dashboard/earch/conciliaciones/${añoRecurso}/${añoConcilia}/${ubicacion}`)
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data: ConciliaRow[]) => setConciliaData(data))
      .catch(err => setConciliaError(String(err.message ?? err)))
      .finally(() => setConciliaLoading(false));
  }, [añoRecurso, añoConcilia, ubicacion, tick]);

  useEffect(() => {
    setViaticosLoading(true);
    setViaticosError(null);
    fetch(`${API_BASE}/dashboard/earch/viaticos/${añoViaticos}/${ubicacion}`)
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data: StatusEntry[]) => setViaticosData(data))
      .catch(err => setViaticosError(String(err.message ?? err)))
      .finally(() => setViaticosLoading(false));
  }, [añoViaticos, ubicacion, tick]);

  useEffect(() => {
    setSuficienciasLoading(true);
    setSuficienciasError(null);
    fetch(`${API_BASE}/dashboard/earch/suficiencias/${añoSuficiencias}`)
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data: StatusEntry[]) => setSuficienciasData(data))
      .catch(err => setSuficienciasError(String(err.message ?? err)))
      .finally(() => setSuficienciasLoading(false));
  }, [añoSuficiencias, tick]);

  return {
    clcData,
    conciliaData,
    clcLoading,
    conciliaLoading,
    clcError,
    conciliaError,
    viaticosData,
    viaticosLoading,
    viaticosError,
    suficienciasData,
    suficienciasLoading,
    suficienciasError,
    refetch: () => setTick(t => t + 1),
  };
}
