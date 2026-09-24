import { useState } from "react";
import CfdiSolicitudes from "./components/CfdiSolicitudes";
import CfdiExplorer from "./components/CfdiExplorer";

type Tab = "solicitudes" | "explorador";

function App() {
  const [tab, setTab] = useState<Tab>("explorador");

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-base font-semibold text-slate-200 tracking-tight">
              CFDis
            </h1>
            {tab === "solicitudes" && (
              <button
                onClick={() => setTab("explorador")}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition cursor-pointer"
              >
                ← Explorador
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {tab === "explorador" && <CfdiExplorer onDescargarCfdis={() => setTab("solicitudes")} />}
        {tab === "solicitudes" && <CfdiSolicitudes />}
      </main>
    </div>
  );
}

export default App;
