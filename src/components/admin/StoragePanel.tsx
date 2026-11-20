"use client";
import { useRef,useState } from "react";
import { api,errorMessage,useAdminResource } from "./api";
type Space={database:{bytes:number;limit:number;percent:number};storage:{bytes:number;limit:number;percent:number};chunks:{con_vector:number;sin_vector:number};warning:boolean};
export function StoragePanel({revision,onChanged}:{revision:number;onChanged:()=>void}) {
  const resource=useAdminResource<Space>("/api/admin/espacio",revision);
  const [busy,setBusy]=useState(false); const running=useRef(false);
  const [notice,setNotice]=useState(""); const [error,setError]=useState("");
  async function calculate() {
    if(running.current)return; running.current=true;setBusy(true);setError("");setNotice("");
    try {
      const result=await api<{processed:number;remaining:number;busy:boolean;reason?:string}>("/api/admin/embeddings/pendientes",{method:"POST"});
      setNotice(result.busy?"Ya hay un cálculo en curso.":`${result.processed} vectores calculados; quedan ${result.remaining.toLocaleString("es-CO")}. ${result.reason||""}`);
      onChanged();
    } catch(e){setError(errorMessage(e));}
    finally{running.current=false;setBusy(false);}
  }
  const data=resource.data;
  return <section className="card mt-5 space-y-4 p-5" aria-labelledby="storage-title">
    <h2 id="storage-title" className="font-display text-xl text-forest-900">Espacio y búsqueda</h2>
    {resource.error?<p role="alert" className="notice notice-error">{resource.error.message}</p>:!data?<p role="status">Consultando espacio…</p>:<>
      <div className="grid gap-3 sm:grid-cols-2">
        {[["Base de datos",data.database],["Archivos (aproximado)",data.storage]].map(([label,value])=>{
          const meter=value as Space["database"];
          return <div key={String(label)}><p className="text-sm">{String(label)}: {(meter.bytes/1e6).toFixed(1)} / {meter.limit/1e6} MB · {meter.percent.toFixed(1)} %</p><progress className="mt-2 w-full accent-forest-700" aria-label={String(label)} value={Math.min(100,meter.percent)} max={100}/></div>;
        })}
      </div>
      {data.warning&&<p className="notice notice-error" role="alert">El uso de espacio alcanzó el 80 %. Revisa la biblioteca antes de cargar más documentos.</p>}
      <p className="text-sm text-muted">{data.chunks.con_vector.toLocaleString("es-CO")} fragmentos con vector · {data.chunks.sin_vector.toLocaleString("es-CO")} pendientes.</p>
    </>}
    <button className="btn btn-secondary" disabled={busy||!data||data.chunks.sin_vector===0} onClick={calculate}>{busy?"Calculando… puede tardar hasta cuatro minutos":"Calcular vectores pendientes"}</button>
    <div aria-live="polite">{notice&&<p className="notice notice-info">{notice}</p>}{error&&<p className="notice notice-error" role="alert">{error}</p>}</div>
  </section>;
}
