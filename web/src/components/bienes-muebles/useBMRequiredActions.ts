import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import HttpClient from '../../utils/HttpClient';
import { API_BASE } from '../../utils/api';

export type BMRequiredAction = { Id: number; Descripcion: string };

const http = new HttpClient(API_BASE);
let cachedToken = '';
let cachedActions: BMRequiredAction[] | null = null;
let pendingToken = '';
let pendingRequest: Promise<BMRequiredAction[]> | null = null;

function unwrap(payload: unknown): BMRequiredAction[] {
  if (Array.isArray(payload)) return payload as BMRequiredAction[];
  if (payload && typeof payload === 'object' && 'recordset' in payload) {
    const rows = (payload as { recordset?: unknown }).recordset;
    return Array.isArray(rows) ? rows as BMRequiredAction[] : [];
  }
  return [];
}

function loadActions(token: string): Promise<BMRequiredAction[]> {
  if (!token) return Promise.resolve([]);
  if (cachedToken === token && cachedActions) return Promise.resolve(cachedActions);
  if (pendingToken === token && pendingRequest) return pendingRequest;

  pendingToken = token;
  pendingRequest = http.get('catalogos/bm-verif-required-actions', token)
    .then(async (response) => {
      if (response.status === 404) return [];
      if (!response.ok) throw new Error(`No se pudo cargar el catálogo (${response.status}).`);
      return unwrap(await response.json());
    })
    .then((actions) => {
      cachedToken = token;
      cachedActions = actions;
      return actions;
    })
    .finally(() => {
      if (pendingToken === token) {
        pendingToken = '';
        pendingRequest = null;
      }
    });

  return pendingRequest;
}

export function useBMRequiredActions() {
  const { token } = useAuth();
  const [actions, setActions] = useState<BMRequiredAction[]>(() => (
    cachedToken === token ? cachedActions ?? [] : []
  ));

  useEffect(() => {
    let active = true;
    void loadActions(token)
      .then((list) => { if (active) setActions(list); })
      .catch(() => { if (active) setActions([]); });
    return () => { active = false; };
  }, [token]);

  return useMemo(() => new Map(
    actions.map((action) => [Number(action.Id), action.Descripcion]),
  ), [actions]);
}
