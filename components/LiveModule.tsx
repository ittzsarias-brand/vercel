"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plus, Trash2, ShieldCheck, RefreshCw } from "lucide-react";

type ModuleName = "Accounting" | "Business" | "Deliveries" | "Inventory" | "Notes" | "Private vault" | "Admin";
type Row = { id: string; [key: string]: unknown };
const collections: Record<Exclude<ModuleName, "Admin">, string> = {
  Accounting: "accounting", Business: "business", Deliveries: "deliveries",
  Inventory: "inventory", Notes: "notes", "Private vault": "vault",
};
const fields: Record<Exclude<ModuleName, "Admin">, { key: string; label: string; placeholder: string }[]> = {
  Accounting: [{key:"type",label:"Type",placeholder:"Income or expense"},{key:"amount",label:"Amount",placeholder:"e.g. 125.00"},{key:"category",label:"Category",placeholder:"e.g. Supplies"},{key:"description",label:"Description",placeholder:"What was this for?"}],
  Business: [{key:"title",label:"Activity",placeholder:"e.g. Supplier meeting"},{key:"category",label:"Category",placeholder:"e.g. Operations"},{key:"description",label:"Details",placeholder:"Add context"}],
  Deliveries: [{key:"orderId",label:"Order ID",placeholder:"e.g. DL-2049"},{key:"customer",label:"Customer",placeholder:"Customer or business"},{key:"status",label:"Status",placeholder:"Preparing, In transit, Delivered"},{key:"details",label:"Details",placeholder:"Delivery address or notes"}],
  Inventory: [{key:"name",label:"Item name",placeholder:"e.g. USB-C charger"},{key:"sku",label:"SKU",placeholder:"e.g. UC-019"},{key:"quantity",label:"Quantity",placeholder:"e.g. 25"},{key:"description",label:"Details",placeholder:"Optional details"}],
  Notes: [{key:"title",label:"Title",placeholder:"Note title"},{key:"category",label:"Category",placeholder:"e.g. General"},{key:"body",label:"Note",placeholder:"Write your note here"}],
  "Private vault": [{key:"title",label:"Record title",placeholder:"Short title"},{key:"body",label:"Private details",placeholder:"Store private information"}],
};
const headings: Record<ModuleName, string> = {
  Accounting:"Income and expenses",Business:"Business activity",Deliveries:"Delivery tracker",Inventory:"Inventory records",Notes:"Shared team notes","Private vault":"Owner-only private vault",Admin:"Team access and roles",
};
function readable(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as {toDate?:unknown}).toDate === "function") {
    return (value as {toDate:()=>Date}).toDate().toLocaleString();
  }
  return String(value);
}
export default function LiveModule({ active, uid, email }: { active: ModuleName; uid: string; email: string }) {
  const [role, setRole] = useState<string>("loading");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string,string>>({});
  const [profileRows, setProfileRows] = useState<Row[]>([]);
  const [profileUid, setProfileUid] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileRole, setProfileRole] = useState("employee");
  const isAdmin = active === "Admin";
  const isOwner = role === "owner";
  const moduleFields = active === "Admin" ? [] : fields[active];
  const collectionName = active === "Admin" ? "users" : collections[active];

  useEffect(() => {
    let alive = true;
    getDoc(doc(db, "users", uid)).then(snap => {
      if (alive) setRole(snap.exists() ? String(snap.data().role || "unassigned") : "unassigned");
    }).catch(() => { if (alive) setRole("unassigned"); });
    return () => { alive = false; };
  }, [uid]);

  useEffect(() => {
    if (role === "loading" || role === "unassigned") { setLoading(false); return; }
    if (active === "Private vault" && role !== "owner") { setRows([]); setLoading(false); return; }
    setLoading(true); setError("");
    if (isAdmin && !isOwner) {
      const unsubscribeProfile = onSnapshot(doc(db, "users", uid), snap => {
        setProfileRows(snap.exists() ? [{ id: snap.id, ...snap.data() } as Row] : []);
        setLoading(false);
      }, () => { setError("Could not load your profile. Ask the owner to check your Firestore role."); setLoading(false); });
      return unsubscribeProfile;
    }
    const unsubscribe = onSnapshot(collection(db, collectionName), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Row));
      data.sort((a,b) => {
        const time = (x: Row) => {
          const v = x.createdAt as {toMillis?:()=>number} | undefined;
          return v?.toMillis ? v.toMillis() : 0;
        };
        return time(b)-time(a);
      });
      if (isAdmin) setProfileRows(data); else setRows(data);
      setLoading(false);
    }, () => { setError("Could not load records. Check that your user profile and Firestore security rules are set up."); setLoading(false); });
    return unsubscribe;
  }, [active, collectionName, isAdmin, isOwner, role, uid]);

  const visibleRows = useMemo(() => rows, [rows]);
  async function submit(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (isAdmin) {
        if (!isOwner) throw new Error("Only the owner can manage team roles.");
        if (!profileUid.trim() || !["owner","employee"].includes(profileRole)) throw new Error("Enter a Firebase Authentication user UID and choose a role.");
        await setDoc(doc(db,"users",profileUid.trim()), { email: profileEmail.trim(), role: profileRole, updatedAt: serverTimestamp() }, { merge: true });
        setProfileUid(""); setProfileEmail(""); setProfileRole("employee");
      } else {
        const data: Record<string,unknown> = { ...values, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: uid, createdByEmail: email };
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
        await addDoc(collection(db, collectionName), data);
        setValues({});
      }
      setFormOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the record.");
    } finally { setSaving(false); }
  }
  async function remove(row: Row) {
    if (!window.confirm("Delete this record permanently?")) return;
    try { await deleteDoc(doc(db, collectionName, row.id)); }
    catch { setError("Delete failed. Check your role and Firestore rules."); }
  }
  if (role === "loading") return <section className="module panel"><p>Checking your workspace permissions…</p></section>;
  if (role === "unassigned") return <section className="module panel"><div className="module-icon"><ShieldCheck size={28}/></div><h2>Workspace role not assigned</h2><p>Your login works, but an owner must create your profile in Firestore before you can access business records.</p><div className="demo-note">Firebase Console → Firestore Database → collection <b>users</b> → document ID must be your Authentication UID → fields: <code>role</code> = <code>owner</code> and <code>email</code> = your login email. Create the first owner profile before publishing the security rules.</div></section>;
  if (active === "Private vault" && !isOwner) return <section className="module panel"><div className="module-icon"><ShieldCheck size={28}/></div><h2>Owner access only</h2><p>The private vault is restricted to the workspace owner by Firestore security rules.</p></section>;

  return <section className="module panel live-module">
    <div className="live-heading"><div className="module-icon"><RefreshCw size={25}/></div><small className="eyebrow">{isAdmin ? "ACCESS & TEAM" : "LIVE FIRESTORE DATA"}</small><h2>{headings[active]}</h2><p>{isAdmin ? "Assign roles to accounts that already exist in Firebase Authentication." : "Records sync online for authorized workspace users."}</p></div>
    {error && <div className="auth-error" role="alert">{error}</div>}
    {isAdmin ? <div className="profile-manager">
      <div className="panel-head"><div><h2>Workspace users</h2><p>{profileRows.length} profile(s)</p></div></div>
      {profileRows.map(r=><div className="team-row" key={r.id}><div className="team-avatar">{String(r.email||"?").slice(0,1).toUpperCase()}</div><div><b>{readable(r.email) || "Email not set"}</b><small>UID: {r.id}</small></div><span>{readable(r.role)}</span>{isOwner&&r.id!==uid&&<button className="icon" onClick={()=>remove(r)} title="Remove profile" aria-label="Remove profile"><Trash2 size={15}/></button>}</div>)}
      {isOwner && <><button className="primary" onClick={()=>setFormOpen(v=>!v)}><Plus size={15}/> Add user profile</button>{formOpen&&<form className="live-form" onSubmit={submit}><label>Firebase Authentication UID<input value={profileUid} onChange={e=>setProfileUid(e.target.value)} required placeholder="Copy UID from Authentication → Users"/></label><label>Email<input type="email" value={profileEmail} onChange={e=>setProfileEmail(e.target.value)} required placeholder="employee@company.com"/></label><label>Role<select value={profileRole} onChange={e=>setProfileRole(e.target.value)}><option value="employee">Employee</option><option value="owner">Owner</option></select></label><div className="modal-actions"><button type="button" className="quiet" onClick={()=>setFormOpen(false)}>Cancel</button><button className="primary" disabled={saving}>{saving?"Saving…":"Save profile"}</button></div></form>}</>}
      {!isOwner&&<div className="demo-note">Only the owner can change workspace roles.</div>}
    </div> : <>
      <div className="panel-head live-list-head"><div><h2>Saved records</h2><p>{visibleRows.length} record(s) · live sync</p></div><button className="primary" onClick={()=>{setValues({});setFormOpen(v=>!v)}}><Plus size={15}/> Add record</button></div>
      {formOpen&&<form className="live-form" onSubmit={submit}>{moduleFields.map(f=><label key={f.key}>{f.label}{f.key==="body"||f.key==="details"||f.key==="description"?<textarea rows={3} value={values[f.key]||""} onChange={e=>setValues(v=>({...v,[f.key]:e.target.value}))} placeholder={f.placeholder} required={f.key!=="description"}/>:<input type={f.key==="amount"||f.key==="quantity"?"number":"text"} min={f.key==="amount"||f.key==="quantity"?0:undefined} step={f.key==="amount"?"0.01":f.key==="quantity"?"1":undefined} value={values[f.key]||""} onChange={e=>setValues(v=>({...v,[f.key]:e.target.value}))} placeholder={f.placeholder} required/>}</label>)}<div className="modal-actions"><button type="button" className="quiet" onClick={()=>setFormOpen(false)}>Cancel</button><button className="primary" disabled={saving}>{saving?"Saving…":"Save record"}</button></div></form>}
      {loading?<p className="live-empty">Loading records…</p>:visibleRows.length===0?<div className="live-empty"><b>No records yet</b><p>Add your first record above. New records will appear for other authorized users too.</p></div>:<div className="live-records">{visibleRows.map(row=><article className="live-record" key={row.id}><div className="live-record-content"><b>{readable(row.title||row.name||row.orderId||row.type||"Record")}</b><small>{Object.entries(row).filter(([k,v])=>!["id","createdAt","updatedAt","createdBy","createdByEmail"].includes(k)&&v!==""&&v!==null&&v!==undefined).map(([k,v])=>k==="title"||k==="name"||k==="orderId"||k==="type"?null:<span key={k}><strong>{k.replace(/[A-Z]/g, m => " " + m.toLowerCase()).replace(/^./,c=>c.toUpperCase())}:</strong> {readable(v)}　</span>)}</small><small className="record-meta">Added by {readable(row.createdByEmail)||"workspace user"} · {readable(row.createdAt)||"just now"}</small></div><button className="icon" onClick={()=>remove(row)} aria-label="Delete record" title="Delete record"><Trash2 size={15}/></button></article>)}</div>}
    </>}
    <div className="demo-note"><ShieldCheck size={15}/> Signed in as {email} · Role: {role} · Changes are stored in Firebase.</div>
  </section>;
}
