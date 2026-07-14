import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useBlobFetch } from '../hooks/useFetch';
import { API_BASE } from '../utils/api';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
export type DocumentoItem = {
  IdDocto: number;
  TipoArchivo: 0 | 1; // 0=JPEG, 1=PDF
  Referencia: string;
  Fecha: Date;
  TipoDocto: string;
  thumbnail: string; // base64
};

type Props = {
  documentos: DocumentoItem[];
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function formatDate(raw: Date | string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function VisorDocumentos({ documentos }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const baseScale = useMemo(() => {
    if (viewerSize.width === 0 || viewerSize.height === 0) return undefined;
    if (!pageSize) {
      const estW = 595;
      const estH = estW * Math.SQRT2;
      return Math.min(viewerSize.width / estW, viewerSize.height / estH);
    }
    return Math.min(viewerSize.width / pageSize.width, viewerSize.height / pageSize.height);
  }, [pageSize, viewerSize]);

  const scale = useMemo(() => {
    if (baseScale === undefined) return undefined;
    return baseScale * zoom;
  }, [baseScale, zoom]);

  const selected = documentos[selectedIdx] ?? null;
  const docId = selected?.IdDocto;

  useEffect(() => {
    setSelectedIdx(0);
    setPageNumber(1);
    setNumPages(null);
    setPageSize(null);
    setZoom(1);
    setTranslate({ x: 0, y: 0 });
  }, [documentos]);

  const { url: documentUrl, loading, error, setError } = useBlobFetch(
    docId ? `${API_BASE}/earch/documento/${docId}` : null,
    [docId]
  );

  // ── Measure the PDF viewer container ──
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewerSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [documentUrl]);

  const handlePageLoadSuccess = useCallback((page: any) => {
    const viewport = page.getViewport({ scale: 1 });
    setPageSize({ width: viewport.width, height: viewport.height });
  }, []);

  // ── Drag / pan handlers ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: translate.x,
      origY: translate.y,
    };
    setIsDragging(true);
  }, [translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (!drag.isDragging) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setTranslate({ x: drag.origX + dx, y: drag.origY + dy });
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current.isDragging = false;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    setTranslate({ x: 0, y: 0 });
  }, [zoom]);

  // ── Empty state ──
  if (documentos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-14 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-slate-500 font-semibold">
          No hay documentos disponibles
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-h-full">
      {/* ── Document header ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 shrink-0">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-blue-500 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm font-bold text-slate-700">
              {formatDate(selected!.Fecha)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-blue-500 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm font-semibold text-slate-600">
              {selected!.Referencia}
            </span>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">
            {selected!.TipoDocto}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            {selected!.TipoArchivo === 1 ? 'PDF' : 'JPEG'}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              disabled={zoom <= 0.25}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              −
            </button>
            <span className="text-xs font-semibold text-slate-600 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
              disabled={zoom >= 4}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              +
            </button>
            <button
              onClick={() => setZoom(1)}
              disabled={zoom === 1}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Restablecer zoom"
            >
              ⟲
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* ── Thumbnails (left) ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 w-28 shrink-0 flex flex-col">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 px-1">
            Documentos ({documentos.length})
          </p>
          <div className="flex-1 overflow-y-auto space-y-3">
            {documentos.map((doc, idx) => (
              <button
                key={doc.IdDocto}
                onClick={() => {
                  setSelectedIdx(idx);
                  setPageNumber(1);
                  setNumPages(null);
                }}
                className={`shrink-0 w-full rounded-xl border-2 overflow-hidden transition-all duration-150 flex flex-col items-center justify-center gap-1 p-1 ${idx === selectedIdx
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
              >
                {doc.thumbnail ? (
                  <img
                    src={`data:image/png;base64,${doc.thumbnail}`}
                    alt=""
                    className="w-full h-16 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d={doc.TipoArchivo === 1
                          ? 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
                          : 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'} />
                    </svg>
                  </div>
                )}
                <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight line-clamp-2">
                  {doc.TipoDocto}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Document viewer ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          {loading && (
            <div className="flex items-center justify-center flex-1 p-4 bg-slate-50/50">
              <div className="flex flex-col items-center gap-3">
                <svg
                  className="animate-spin w-8 h-8 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <p className="text-sm font-semibold text-slate-500">
                  Cargando documento…
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center flex-1 p-4 bg-slate-50/50">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-red-600">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && selected!.TipoArchivo === 1 && documentUrl && (
            <div className="flex flex-col flex-1">
              <div
                ref={viewerRef}
                className="flex-1 relative overflow-hidden min-h-0 p-4 bg-slate-50/50"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                {viewerSize.width > 0 ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ transform: `translate(${translate.x}px, ${translate.y}px)` }}
                  >
                    <Document
                      key={documentUrl}
                      file={documentUrl}
                      onLoadSuccess={({ numPages: np }) => setNumPages(np)}
                      onLoadError={() => setError('Error al cargar el PDF')}
                      className="flex flex-col items-center"
                    >
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        onLoadSuccess={handlePageLoadSuccess}
                        renderTextLayer
                        renderAnnotationLayer
                        className="shadow-xl rounded-lg overflow-hidden"
                      />
                    </Document>
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-slate-400">
                    Preparando documento…
                  </div>
                )}
              </div>
              {numPages && numPages > 1 && (
                <div className="flex items-center justify-center gap-3 py-3 shrink-0">
                  <button
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1}
                    className="h-8 px-3 text-xs font-bold bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Anterior
                  </button>
                  <span className="text-sm font-semibold text-slate-600">
                    {pageNumber} / {numPages}
                  </span>
                  <button
                    onClick={() =>
                      setPageNumber((p) => Math.min(numPages, p + 1))
                    }
                    disabled={pageNumber >= numPages}
                    className="h-8 px-3 text-xs font-bold bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && !error && selected!.TipoArchivo === 0 && documentUrl && (
            <div
              className="relative flex-1 bg-slate-50/50 rounded-2xl overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <div
                className="absolute inset-4 flex items-center justify-center"
                style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoom})`, transformOrigin: 'center center' }}
              >
                <img
                  src={documentUrl}
                  alt={selected!.Referencia}
                  className="max-w-full max-h-full rounded-lg shadow-xl"
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
