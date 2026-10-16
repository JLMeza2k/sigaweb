import { useState, useEffect, useRef, useCallback } from "react";
import { parseCert, extractRfc, createPfx, decryptSatKey } from "../../utils/cfdirepo/DescargaMasivaSAT";
import { saveFiel } from "../../services/cfdirepo/fielStorage";
import {
  IconCheck,
  IconClose,
  IconShield,
  IconSpinner,
} from "./Icons";

function IconUpload({ className = "" }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>;
}

function IconEye({ className = "" }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
}

function IconEyeOff({ className = "" }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.477 10.477a3 3 0 0 0 4.046 4.046M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395" /></svg>;
}

function FileDropZone({
  label,
  accept,
  file,
  onFile,
  icon,
}: {
  label: string;
  accept: string;
  file: File | null;
  onFile: (f: File) => void;
  icon: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  return (
    <div
      className={`relative group border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ease-out ${isDragging
        ? "border-indigo bg-indigo-soft scale-[1.02]"
        : file
          ? "border-success-border bg-success-soft"
          : "border-border-strong hover:border-fg-faint hover:bg-hover"
        }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />

      {file ? (
        <div className="flex flex-col items-center gap-2">
          <IconCheck className="w-10 h-10 text-success" />
          <p className="text-sm font-medium text-success truncate max-w-full">{file.name}</p>
          <p className="text-xs text-fg-faint">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="text-3xl mb-1">{icon}</div>
          <IconUpload className="w-6 h-6 text-fg-faint group-hover:text-fg-muted transition-colors" />
          <p className="text-sm font-medium text-fg-muted group-hover:text-fg-secondary transition-colors">{label}</p>
          <p className="text-xs text-fg-fainter">Arrastra o haz clic para seleccionar</p>
        </div>
      )}
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-fg-secondary mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-12 rounded-xl bg-input border border-border-strong text-fg-primary placeholder-fg-faint focus:outline-none focus:ring-2 focus:ring-indigo/50 focus:border-indigo transition-all duration-200"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-faint hover:text-fg-secondary transition-colors"
          tabIndex={-1}
        >
          {show ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function FielModal({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [keyPassword, setKeyPassword] = useState("");
  const [pfxPassword, setPfxPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setCerFile(null);
    setKeyFile(null);
    setKeyPassword("");
    setPfxPassword("");
    setError(null);
  }, []);

  useEffect(() => {
    if (isOpen) resetForm();
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cerFile || !keyFile) {
      setError("Selecciona ambos archivos (.cer y .key)");
      return;
    }
    if (!keyPassword) {
      setError("Ingresa la contraseña del archivo .key");
      return;
    }
    if (!pfxPassword) {
      setError("Ingresa una contraseña para el PFX");
      return;
    }

    setIsLoading(true);

    try {
      const cerBuffer = await cerFile.arrayBuffer();
      const keyBuffer = await keyFile.arrayBuffer();
      const cert = parseCert(cerBuffer);
      const rfc = extractRfc(cert);
      const validity = (cert as unknown as { validity?: { notAfter?: Date } }).validity;
      const vigencia = validity?.notAfter ? validity.notAfter.toISOString().split("T")[0] : null;

      if (!rfc) throw new Error("No se pudo extraer el RFC del certificado");

      const decryptedKeyPem = decryptSatKey(keyBuffer, keyPassword);
      const pfxBuffer = createPfx(cerBuffer, decryptedKeyPem, pfxPassword);
      const pfxBase64 = arrayBufferToBase64(pfxBuffer);

      await saveFiel({ nombre: rfc, password: pfxPassword, rawFile: pfxBase64, vigencia });
      resetForm();
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al procesar los archivos");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface rounded-2xl border border-border-subtle shadow-2xl">
        <div className="flex items-center justify-between px-8 py-5 border-b border-border-subtle/50">
          <div>
            <h2 className="text-lg font-semibold text-fg-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo inline-block" />
              Configurar FIEL
            </h2>
            <p className="text-sm text-fg-faint mt-1">Carga los archivos de tu Firma Electrónica Avanzada</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-fg-muted hover:text-fg-secondary hover:bg-hover transition-colors cursor-pointer">
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FileDropZone label="Certificado (.cer)" accept=".cer" file={cerFile} onFile={setCerFile} icon="📜" />
            <FileDropZone label="Llave privada (.key)" accept=".key" file={keyFile} onFile={setKeyFile} icon="🔑" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PasswordField id="key-password" label="Contraseña del .key" value={keyPassword} onChange={setKeyPassword} placeholder="Contraseña de la llave privada" />
            <PasswordField id="pfx-password" label="Contraseña del PFX" value={pfxPassword} onChange={setPfxPassword} placeholder="Contraseña para el archivo PFX" />
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-soft border border-danger-border text-danger-fg text-sm">
              <span className="text-lg shrink-0">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-5 py-3 rounded-xl font-semibold text-sm bg-panel-muted border border-border-strong text-fg-secondary hover:bg-hover hover:text-fg-primary transition-all duration-200 cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo to-purple hover:from-indigo-hover active:from-indigo-hover/90 text-white shadow-lg shadow-indigo/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer flex items-center justify-center gap-2">
              {isLoading ? (
                <><IconSpinner className="w-5 h-5" />Procesando…</>
              ) : (
                <><IconShield className="w-5 h-5" />Generar y Guardar PFX</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
