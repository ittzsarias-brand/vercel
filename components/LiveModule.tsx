"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plus, Trash2, ShieldCheck, RefreshCw, Pencil } from "lucide-react";

type ModuleName = "Accounting" | "Business" | "Deliveries" | "Inventory" | "Notes" | "Private vault";
type Row = { id: string; [key: string]: unknown };
const collections: Record<ModuleName, string> = {
  Accounting: "accounting", Business: "business", Deliveries: "deliveries",
  Inventory: "inventory", Notes: "notes", "Private vault": "vault",
};
const fields: Record<ModuleName, { key: string; label: string; placeholder: string }[]> = {
  Accounting: [{key:"type",label:"Type",placeholder:"Income or expense"},{key:"amount",label:"Amount",placeholder:"e.g. 125.00"},{key:"category",label:"Category",placeholder:"e.g. Supplies"},{key:"description",label:"Description",placeholder:"What was this for?"}],
  Business: [{key:"title",label:"Activity",placeholder:"e.g. Supplier meeting"},{key:"category",label:"Category",placeholder:"e.g. Operations"},{key:"description",label:"Details",placeholder:"Add context"}],
  Deliveries: [{key:"orderId",label:"Order ID",placeholder:"e.g. DL-2049"},{key:"customer",label:"Customer",placeholder:"Customer or business"},{key:"status",label:"Status",placeholder:"Preparing, In transit, Delivered"},{key:"details",label:"Details",placeholder:"Delivery address or notes"}],
  Inventory: [{key:"name",label:"Item name",placeholder:"e.g. USB-C charger"},{key:"sku",label:"SKU",placeholder:"e.g. UC-019"},{key:"quantity",label:"Quantity",placeholder:"e.g. 25"},{key:"description",label:"Details",placeholder:"Optional details"}],
  Notes: [{key:"title",label:"Title",placeholder:"Note title"},{key:"category",label:"Category",placeholder:"e.g. General"},{key:"body",label:"Note",placeholder:"Write your note here"}],
  "Private vault": [{key:"title",label:"Record title",placeholder:"Short title"},{key:"body",label:"Private details",placeholder:"Store private information"}],
};
const headings: Record<ModuleName, string> = {
  Accounting:"Income and expenses",Business:"Business activity",Deliveries:"Delivery tracker",Inventory:"Inventory records",Notes:"Your notes","Private vault":"Private vault",
};
function readable(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as {toDate?:unknown}).toDate === "function") return (value as {toDate:()=>Date}).toDate().toLocaleString();
  return String(value);
}
export default function LiveModule({ active, uid, email }: { active: ModuleName; uid: string; email: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string,string>>({});
  const moduleFields = fields[active];
  const collectionName = collections[active];

  useEffect(() => {
    setLoading(true); setError("");
    const unsubscribe = onSnapshot(collection(db, collectionName), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Row));
      data.sort((a,b) => {
        const time = (x: Row) => { const v = x.createdAt as {toMillis?:()=>number} | undefined; return v?.toMillis ? v.toMillis() : 0; };
        return time(b)-time(a);
      });
      setRows(data); setLoading(false);
    }, () => { setError("Could not load records. Check your Firestore database and security rules."); setLoading(false); });
    return unsubscribe;
  }, [collectionName]);

  const visibleRows = useMemo(() => rows, [rows]);
  async function submit(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const data: Record<string,unknown> = { ...values, updatedAt: serverTimestamp() };
      if (active === "Accounting") {
        const amount = Number(values.amount);
        if (!Number.isFinite(amount) || amount < 0) throw new Error("Enter a valid non-negative amount.");
        data.amount = amount;
      }
      if (active === "Inventory") {
        const quantity = Number(values.quantity);
        if (!Number.isInteger(quantity) || quantity < 0) throw new Error("Quantity must be a whole number, zero or higher.");
        data.quantity = quantity;
      }
      if (editingId) await updateDoc(doc(db, collectionName, editingId), data);
      else await addDoc(collection(db, collectionName), { ...data, createdAt: serverTimestamp(), createdBy: uid, createdByEmail: email });
      setValues({}); setEditingId(null); setFormOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save the record."); }
    finally { setSaving(false); }
  }
  function edit(row: Row) {
    const next: Record<string,string> = {};
    for (const field of moduleFields) { const value = row[field.key]; if (value !== undefined && value !== null) next[field.key] = String(value); }
    setValues(next); setEditingId(row.id); setFormOpen(true);
  }
  async function remove(row: Row) {
    if (!window.confirm("Delete this record permanently?")) return;
    try { await deleteDoc(doc(db, collectionName, row.id)); }
    catch { setError("Delete failed. Check your Firestore security rules."); }
  }
  return <section className="module panel live-module">
    <div className="live-heading"><div className="module-icon"><RefreshCw size={25}/></div><small className="eyebrow">OWNER WORKSPACE</small><h2>{headings[active]}</h2><p>Manage your records. Changes sync online automatically.</p></div>
    {error && <div className="auth-error" role="alert">{error}</div>}
    <div className="panel-head live-list-head"><div><h2>Saved records</h2><p>{visibleRows.length} record(s) · live sync</p></div><button className="primary" onClick={()=>{setValues({});setEditingId(null);setFormOpen(v=>!v)}}><Plus size={15}/> Add record</button></div>
    {formOpen&&<form className="live-form" onSubmit={submit}>{moduleFields.map(f=><label key={f.key}>{f.label}{f.key==="body"||f.key==="details"||f.key==="description"?<textarea rows={3} value={values[f.key]||""} onChange={e=>setValues(v=>({...v,[f.key]:e.target.value}))} placeholder={f.placeholder} required={f.key!=="description"}/>:<input type={f.key==="amount"||f.key==="quantity"?"number":"text"} min={f.key==="amount"||f.key==="quantity"?0:undefined} step={f.key==="amount"?"0.01":f.key==="quantity"?"1":undefined} value={values[f.key]||""} onChange={e=>setValues(v=>({...v,[f.key]:e.target.value}))} placeholder={f.placeholder} required/>}</label>)}<div className="modal-actions"><button type="button" className="quiet" onClick={()=>{setFormOpen(false);setEditingId(null)}}>Cancel</button><button className="primary" disabled={saving}>{saving?"Saving…":editingId?"Save changes":"Save record"}</button></div></form>}
    {loading?<p className="live-empty">Loading records…</p>:visibleRows.length===0?<div className="live-empty"><b>No records yet</b><p>Add your first record above. New records will appear here automatically.</p></div>:<div className="live-records">{visibleRows.map(row=><article className="live-record" key={row.id}><div className="live-record-content"><b>{readable(row.title||row.name||row.orderId||row.type||"Record")}</b><small>{Object.entries(row).filter(([k,v])=>!["id","createdAt","updatedAt","createdBy","createdByEmail"].includes(k)&&v!==""&&v!==null&&v!==undefined).map(([k,v])=>k==="title"||k==="name"||k==="orderId"||k==="type"?null:<span key={k}><strong>{k.replace(/[A-Z]/g, m => " " + m.toLowerCase()).replace(/^./,c=>c.toUpperCase())}:</strong> {readable(v)}　</span>)}</small><small className="record-meta">Added by {readable(row.createdByEmail)||"owner"} · {readable(row.createdAt)||"just now"}</small></div><div className="record-actions"><button className="icon" onClick={()=>edit(row)} aria-label="Edit record" title="Edit record"><Pencil size={15}/></button><button className="icon" onClick={()=>remove(row)} aria-label="Delete record" title="Delete record"><Trash2 size={15}/></button></div></article>)}</div>}
    <div className="demo-note"><ShieldCheck size={15}/> Signed in as {email} · Owner-only workspace</div>
  </section>;
}
