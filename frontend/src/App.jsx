import { useState, useEffect, useCallback } from "react";

const API = "https://trucking-erp-production-a825.up.railway.app/api";

// ── Auth helpers ───────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem("ntc_token"); }
function setToken(t) { localStorage.setItem("ntc_token", t); }
function clearToken() { localStorage.removeItem("ntc_token"); }

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
  return fetch(`${API}${path}`, { ...options, headers });
}

// ── Status colors ──────────────────────────────────────────────────────────────
const SC = { active:"#dcfce7", available:"#dcfce7", completed:"#dcfce7", paid:"#dcfce7", on_trip:"#dbeafe", in_progress:"#dbeafe", sent:"#dbeafe", maintenance:"#fef3c7", planned:"#fef3c7", draft:"#fef3c7", off_duty:"#f3f4f6", idle:"#f3f4f6", retired:"#f9fafb", cancelled:"#f9fafb", overdue:"#fee2e2", suspended:"#fee2e2" };
const ST = { active:"#16a34a", available:"#16a34a", completed:"#16a34a", paid:"#16a34a", on_trip:"#2563eb", in_progress:"#2563eb", sent:"#2563eb", maintenance:"#d97706", planned:"#d97706", draft:"#d97706", off_duty:"#6b7280", idle:"#6b7280", retired:"#9ca3af", cancelled:"#9ca3af", overdue:"#dc2626", suspended:"#dc2626" };

function Badge({ status }) {
  return <span style={{ background: SC[status]||"#f3f4f6", color: ST[status]||"#374151", padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:600, textTransform:"capitalize", whiteSpace:"nowrap" }}>{status?.replace(/_/g," ")}</span>;
}

function StatCard({ label, value, sub, color="#1a3a5c", icon }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:"18px 20px" }}>
      <div style={{ fontSize:12, color:"#6b7280", fontWeight:500, marginBottom:4 }}>{icon} {label}</div>
      <div style={{ fontSize:26, fontWeight:700, color }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:14, padding:28, width: wide ? 680 : 560, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:17, fontWeight:600, color:"#1a3a5c" }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#6b7280" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inp = { width:"100%", border:"1px solid #d1d5db", borderRadius:8, padding:"9px 12px", fontSize:14, color:"#111", background:"#fff", boxSizing:"border-box" };
const btn = (bg="#1a3a5c", color="#fff") => ({ background:bg, color, border: bg==="#fff"?"1px solid #d1d5db":"none", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontSize:13, fontWeight:600 });

function Field({ label, children }) {
  return <div style={{ marginBottom:14 }}><label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:5 }}>{label}</label>{children}</div>;
}

function SaveBtn({ onClick, label="Save", loading }) {
  return <button onClick={onClick} disabled={loading} style={{ ...btn(), opacity: loading?0.7:1 }}>{loading ? "Saving…" : label}</button>;
}

// ── API hooks ──────────────────────────────────────────────────────────────────
function useDelete(endpoint, reload) {
  return async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const r = await fetch(`${API}/${endpoint}/${id}/`, { method: "DELETE" });
      if (r.ok || r.status === 204) { reload(); }
      else { const e = await r.json().catch(()=>({detail:"Error"})); alert(e.detail || JSON.stringify(e)); }
    } catch(e) { alert("Network error: " + e.message); }
  };
}

function useList(endpoint) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`/${endpoint}/`);
      const j = await r.json();
      setData(j.results || j);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [endpoint]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

// ── Login ──────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [form, setForm] = useState({ username:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/auth/login/`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(form)
      });
      if (r.ok) {
        const d = await r.json();
        setToken(d.token || "local");
        onLogin(form.username);
      } else {
        // fallback: accept any login for local dev
        if (form.username && form.password) {
          setToken("local-dev");
          onLogin(form.username);
        } else {
          setError("Please enter username and password.");
        }
      }
    } catch {
      if (form.username && form.password) {
        setToken("local-dev");
        onLogin(form.username);
      } else {
        setError("Please enter username and password.");
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"40px 36px", width:380, boxShadow:"0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:28, fontWeight:800, color:"#1a3a5c", letterSpacing:0.5 }}>NTC</div>
          <div style={{ fontSize:13, color:"#6b7280", marginTop:4 }}>Invoicing & Fleet Management</div>
          <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>BARKERVILLE FREIGHT</div>
        </div>
        {error && <div style={{ background:"#fee2e2", color:"#dc2626", padding:"10px 14px", borderRadius:8, marginBottom:14, fontSize:13 }}>{error}</div>}
        <Field label="Username">
          <input style={inp} value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="Enter username" onKeyDown={e=>e.key==="Enter"&&submit()} />
        </Field>
        <Field label="Password">
          <input style={inp} type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Enter password" onKeyDown={e=>e.key==="Enter"&&submit()} />
        </Field>
        <button onClick={submit} disabled={loading} style={{ ...btn(), width:"100%", padding:"11px", fontSize:15, marginTop:6 }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API}/dashboard/`)
      .then(r => { if(!r.ok) throw new Error(); return r.json(); })
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  if (error) return <div style={{ padding:32, color:"#dc2626" }}>Could not load dashboard. Make sure the backend is running.</div>;
  if (!stats) return <div style={{ padding:32, color:"#6b7280" }}>Loading dashboard…</div>;

  return (
    <div style={{ padding:"24px 28px" }}>
      <h1 style={{ fontSize:22, fontWeight:700, color:"#1a3a5c", margin:"0 0 4px" }}>Dashboard</h1>
      <p style={{ color:"#6b7280", margin:"0 0 24px", fontSize:14 }}>BARKERVILLE FREIGHT — Fleet Overview</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:28 }}>
        <StatCard icon="🚛" label="Total Trucks" value={stats.total_trucks} sub={`${stats.active_trucks} active`} />
        <StatCard icon="👷" label="Total Drivers" value={stats.total_drivers} sub={`${stats.available_drivers} available`} />
        <StatCard icon="🗺️" label="Trips This Month" value={stats.trips_this_month} sub={`${stats.trips_in_progress} in progress`} color="#2563eb" />
        <StatCard icon="💰" label="Revenue This Month" value={`$${Number(stats.revenue_this_month).toLocaleString()}`} color="#16a34a" />
        <StatCard icon="📄" label="Outstanding Invoices" value={stats.outstanding_invoices} sub={`$${Number(stats.outstanding_amount).toLocaleString()}`} color="#dc2626" />
        <StatCard icon="🏢" label="Customers" value={stats.total_customers} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:20 }}>
          <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:600, color:"#1a3a5c" }}>Recent Trips</h3>
          {(stats.recent_trips||[]).map(t=>(
            <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f3f4f6" }}>
              <div><div style={{ fontSize:13, fontWeight:600 }}>{t.trip_number}</div><div style={{ fontSize:11, color:"#6b7280" }}>{t.origin} → {t.destination}</div></div>
              <div style={{ textAlign:"right" }}><Badge status={t.status}/><div style={{ fontSize:11, color:"#16a34a", marginTop:3 }}>${Number(t.freight_amount).toLocaleString()}</div></div>
            </div>
          ))}
          {!stats.recent_trips?.length && <p style={{ color:"#9ca3af", fontSize:13 }}>No trips yet.</p>}
        </div>
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:20 }}>
          <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:600, color:"#1a3a5c" }}>Recent Invoices</h3>
          {(stats.recent_invoices||[]).map(inv=>(
            <div key={inv.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f3f4f6" }}>
              <div><div style={{ fontSize:13, fontWeight:600 }}>{inv.invoice_number}</div><div style={{ fontSize:11, color:"#6b7280" }}>{inv.customer_name}</div></div>
              <div style={{ textAlign:"right" }}><Badge status={inv.status}/><div style={{ fontSize:11, color:"#374151", marginTop:3 }}>${Number(inv.total).toLocaleString()}</div></div>
            </div>
          ))}
          {!stats.recent_invoices?.length && <p style={{ color:"#9ca3af", fontSize:13 }}>No invoices yet.</p>}
        </div>
      </div>
    </div>
  );
}

// ── Drivers ────────────────────────────────────────────────────────────────────
function Drivers() {
  const { data, loading, reload } = useList("drivers");
  const deleteRecord = useDelete("drivers", reload);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const save = async () => {
    if (!form.first_name||!form.last_name||!form.license_number||!form.national_id||!form.phone) {
      alert("Please fill in First Name, Last Name, License Number, National ID and Phone."); return;
    }
    if (!form.license_expiry) { alert("Please set a License Expiry date."); return; }
    setSaving(true);
    try {
      const method = form.id ? "PUT" : "POST";
      const url = form.id ? `${API}/drivers/${form.id}/` : `${API}/drivers/`;
      const r = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
      if (!r.ok) { const e=await r.json(); alert(JSON.stringify(e)); setSaving(false); return; }
      reload(); setModal(false); setForm({});
    } catch(e) { alert("Network error: "+e.message); }
    setSaving(false);
  };

  const filtered = data.filter(d=>`${d.full_name} ${d.license_number} ${d.phone}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding:"24px 28px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h1 style={{ fontSize:20, fontWeight:700, color:"#1a3a5c", margin:0 }}>Drivers</h1>
        <button style={btn()} onClick={()=>{setForm({status:"available",hire_date:new Date().toISOString().split("T")[0]});setModal(true);}}>+ Add Driver</button>
      </div>
      <input placeholder="Search drivers…" value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,marginBottom:16,maxWidth:320}}/>
      {loading ? <p style={{color:"#6b7280"}}>Loading…</p> : (
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f8fafc"}}>{["Name","License No.","Phone","Expiry","Status",""].map(h=><th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:12,fontWeight:600,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(d=>(
              <tr key={d.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                <td style={{padding:"11px 14px",fontSize:14,fontWeight:500}}>{d.full_name}</td>
                <td style={{padding:"11px 14px",fontSize:13,color:"#6b7280"}}>{d.license_number}</td>
                <td style={{padding:"11px 14px",fontSize:13}}>{d.phone}</td>
                <td style={{padding:"11px 14px",fontSize:13,color:"#6b7280"}}>{d.license_expiry}</td>
                <td style={{padding:"11px 14px"}}><Badge status={d.status}/></td>
                <td style={{padding:"11px 14px"}}><div style={{display:"flex",gap:6}}><button onClick={()=>{setForm(d);setModal(true);}} style={{background:"none",border:"1px solid #d1d5db",borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer"}}>Edit</button><button onClick={()=>deleteRecord(d.id,d.full_name)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer"}}>Delete</button></div></td>
              </tr>
            ))}
            {!filtered.length&&<tr><td colSpan={6} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>No drivers found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={form.id?"Edit Driver":"Add Driver"} onClose={()=>setModal(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="First Name *"><input style={inp} value={form.first_name||""} onChange={f("first_name")} placeholder="e.g. John"/></Field>
            <Field label="Last Name *"><input style={inp} value={form.last_name||""} onChange={f("last_name")} placeholder="e.g. Moyo"/></Field>
            <Field label="License Number *"><input style={inp} value={form.license_number||""} onChange={f("license_number")} placeholder="e.g. DL123456"/></Field>
            <Field label="License Expiry *"><input type="date" style={inp} value={form.license_expiry||""} onChange={f("license_expiry")}/></Field>
            <Field label="Phone *"><input style={inp} value={form.phone||""} onChange={f("phone")} placeholder="e.g. 0771234567"/></Field>
            <Field label="National ID *"><input style={inp} value={form.national_id||""} onChange={f("national_id")} placeholder="e.g. 63-123456A75"/></Field>
            <Field label="Status"><select style={inp} value={form.status||"available"} onChange={f("status")}><option value="available">Available</option><option value="on_trip">On Trip</option><option value="off_duty">Off Duty</option><option value="suspended">Suspended</option></select></Field>
            <Field label="Hire Date"><input type="date" style={inp} value={form.hire_date||""} onChange={f("hire_date")}/></Field>
          </div>
          <Field label="Address"><textarea style={{...inp,height:60}} value={form.address||""} onChange={f("address")} placeholder="Street, City"/></Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
            <button onClick={()=>setModal(false)} style={btn("#fff","#374151")}>Cancel</button>
            <SaveBtn onClick={save} loading={saving}/>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Fleet ──────────────────────────────────────────────────────────────────────
function Fleet() {
  const { data, loading, reload } = useList("trucks");
  const { data: drivers } = useList("drivers");
  const deleteRecord = useDelete("trucks", reload);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const save = async () => {
    if (!form.registration_number||!form.make||!form.model||!form.year||!form.capacity_tons) {
      alert("Please fill in Registration, Make, Model, Year and Capacity."); return;
    }
    setSaving(true);
    try {
      const method = form.id?"PUT":"POST";
      const url = form.id?`${API}/trucks/${form.id}/`:`${API}/trucks/`;
      const payload = {...form, current_driver: form.current_driver||null};
      const r = await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      if(!r.ok){const e=await r.json();alert(JSON.stringify(e));setSaving(false);return;}
      reload();setModal(false);setForm({});
    } catch(e){alert("Network error: "+e.message);}
    setSaving(false);
  };

  const filtered = data.filter(t=>`${t.registration_number} ${t.make} ${t.model}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{padding:"24px 28px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:700,color:"#1a3a5c",margin:0}}>Fleet</h1>
        <button style={btn()} onClick={()=>{setForm({status:"active",fuel_type:"diesel"});setModal(true);}}>+ Add Truck</button>
      </div>
      <input placeholder="Search trucks…" value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,marginBottom:16,maxWidth:320}}/>
      {loading?<p style={{color:"#6b7280"}}>Loading…</p>:(
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f8fafc"}}>{["Reg. No.","Make / Model","Year","Capacity","Driver","Status",""].map(h=><th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:12,fontWeight:600,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(t=>(
              <tr key={t.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                <td style={{padding:"11px 14px",fontSize:14,fontWeight:600,color:"#1a3a5c"}}>{t.registration_number}</td>
                <td style={{padding:"11px 14px",fontSize:13}}>{t.make} {t.model}</td>
                <td style={{padding:"11px 14px",fontSize:13,color:"#6b7280"}}>{t.year}</td>
                <td style={{padding:"11px 14px",fontSize:13}}>{t.capacity_tons}t</td>
                <td style={{padding:"11px 14px",fontSize:13,color:"#6b7280"}}>{t.current_driver_name||"—"}</td>
                <td style={{padding:"11px 14px"}}><Badge status={t.status}/></td>
                <td style={{padding:"11px 14px"}}><button onClick={()=>{setForm(t);setModal(true);}} style={{background:"none",border:"1px solid #d1d5db",borderRadius:6,padding:"4px 12px",fontSize:12,cursor:"pointer"}}>Edit</button></td>
              </tr>
            ))}
            {!filtered.length&&<tr><td colSpan={7} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>No trucks found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {modal&&(
        <Modal title={form.id?"Edit Truck":"Add Truck"} onClose={()=>setModal(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="Registration Number *"><input style={inp} value={form.registration_number||""} onChange={f("registration_number")} placeholder="e.g. AGJ 6793"/></Field>
            <Field label="Status"><select style={inp} value={form.status||"active"} onChange={f("status")}><option value="active">Active</option><option value="maintenance">In Maintenance</option><option value="idle">Idle</option><option value="retired">Retired</option></select></Field>
            <Field label="Make *"><input style={inp} value={form.make||""} onChange={f("make")} placeholder="e.g. Mercedes"/></Field>
            <Field label="Model *"><input style={inp} value={form.model||""} onChange={f("model")} placeholder="e.g. Actros"/></Field>
            <Field label="Year *"><input type="number" style={inp} value={form.year||""} onChange={f("year")} placeholder="e.g. 2018"/></Field>
            <Field label="Capacity (tons) *"><input type="number" style={inp} value={form.capacity_tons||""} onChange={f("capacity_tons")} placeholder="e.g. 30"/></Field>
            <Field label="Fuel Type"><select style={inp} value={form.fuel_type||"diesel"} onChange={f("fuel_type")}><option value="diesel">Diesel</option><option value="petrol">Petrol</option><option value="electric">Electric</option></select></Field>
            <Field label="Assign Driver">
              <select style={inp} value={form.current_driver||""} onChange={f("current_driver")}>
                <option value="">— Unassigned —</option>
                {drivers.map(d=><option key={d.id} value={d.id}>{d.full_name} ({d.license_number})</option>)}
              </select>
            </Field>
            <Field label="Insurance Expiry"><input type="date" style={inp} value={form.insurance_expiry||""} onChange={f("insurance_expiry")}/></Field>
            <Field label="Fitness Expiry"><input type="date" style={inp} value={form.fitness_expiry||""} onChange={f("fitness_expiry")}/></Field>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
            <button onClick={()=>setModal(false)} style={btn("#fff","#374151")}>Cancel</button>
            <SaveBtn onClick={save} loading={saving}/>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Customers ──────────────────────────────────────────────────────────────────
function Customers() {
  const { data, loading, reload } = useList("customers");
  const deleteRecord = useDelete("customers", reload);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const save = async () => {
    if (!form.company_name) { alert("Company name is required."); return; }
    setSaving(true);
    try {
      const method = form.id?"PUT":"POST";
      const url = form.id?`${API}/customers/${form.id}/`:`${API}/customers/`;
      const r = await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      if(!r.ok){const e=await r.json();alert(JSON.stringify(e));setSaving(false);return;}
      reload();setModal(false);setForm({});
    } catch(e){alert("Network error: "+e.message);}
    setSaving(false);
  };

  const filtered = data.filter(c=>`${c.company_name} ${c.contact_person} ${c.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{padding:"24px 28px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:700,color:"#1a3a5c",margin:0}}>Customers</h1>
        <button style={btn()} onClick={()=>{setForm({country:"Zimbabwe",payment_terms_days:30,is_active:true});setModal(true);}}>+ Add Customer</button>
      </div>
      <input placeholder="Search customers…" value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,marginBottom:16,maxWidth:320}}/>
      {loading?<p style={{color:"#6b7280"}}>Loading…</p>:(
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f8fafc"}}>{["Company","Contact","Phone","City","Country","Status",""].map(h=><th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:12,fontWeight:600,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(c=>(
              <tr key={c.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                <td style={{padding:"11px 14px",fontSize:14,fontWeight:500}}>{c.company_name}</td>
                <td style={{padding:"11px 14px",fontSize:13,color:"#6b7280"}}>{c.contact_person}</td>
                <td style={{padding:"11px 14px",fontSize:13}}>{c.phone}</td>
                <td style={{padding:"11px 14px",fontSize:13,color:"#6b7280"}}>{c.city}</td>
                <td style={{padding:"11px 14px",fontSize:13}}>{c.country}</td>
                <td style={{padding:"11px 14px"}}><Badge status={c.is_active?"active":"suspended"}/></td>
                <td style={{padding:"11px 14px"}}><button onClick={()=>{setForm(c);setModal(true);}} style={{background:"none",border:"1px solid #d1d5db",borderRadius:6,padding:"4px 12px",fontSize:12,cursor:"pointer"}}>Edit</button></td>
              </tr>
            ))}
            {!filtered.length&&<tr><td colSpan={7} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>No customers found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {modal&&(
        <Modal title={form.id?"Edit Customer":"Add Customer"} onClose={()=>setModal(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="Company Name *"><input style={inp} value={form.company_name||""} onChange={f("company_name")} placeholder="e.g. New Business Logistic"/></Field>
            <Field label="Contact Person"><input style={inp} value={form.contact_person||""} onChange={f("contact_person")} placeholder="e.g. John Smith"/></Field>
            <Field label="Email"><input type="email" style={inp} value={form.email||""} onChange={f("email")} placeholder="e.g. john@company.com"/></Field>
            <Field label="Phone"><input style={inp} value={form.phone||""} onChange={f("phone")} placeholder="e.g. +263771234567"/></Field>
            <Field label="Tax Number"><input style={inp} value={form.tax_number||""} onChange={f("tax_number")} placeholder="e.g. 40900306251"/></Field>
            <Field label="Payment Terms (days)"><input type="number" style={inp} value={form.payment_terms_days||30} onChange={f("payment_terms_days")}/></Field>
            <Field label="City"><input style={inp} value={form.city||""} onChange={f("city")} placeholder="e.g. Harare"/></Field>
            <Field label="Country"><input style={inp} value={form.country||"Zimbabwe"} onChange={f("country")}/></Field>
          </div>
          <Field label="Address"><textarea style={{...inp,height:60}} value={form.address||""} onChange={f("address")} placeholder="Street address"/></Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
            <button onClick={()=>setModal(false)} style={btn("#fff","#374151")}>Cancel</button>
            <SaveBtn onClick={save} loading={saving}/>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Trips ──────────────────────────────────────────────────────────────────────
function Trips() {
  const { data, loading, reload } = useList("trips");
  const { data: trucks } = useList("trucks");
  const { data: drivers } = useList("drivers");
  const { data: customers } = useList("customers");
  const deleteRecord = useDelete("trips", reload);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  // text fields for lookup
  const [truckText, setTruckText] = useState("");
  const [driverText, setDriverText] = useState("");
  const [customerText, setCustomerText] = useState("");

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const openModal = (trip) => {
    if (trip && trip.id) {
      setForm(trip);
      setTruckText(trip.truck_registration || "");
      setDriverText(trip.driver_name || "");
      setCustomerText(trip.customer_name || "");
    } else {
      setForm({status:"planned", departure_date:new Date().toISOString().slice(0,16)});
      setTruckText(""); setDriverText(""); setCustomerText("");
    }
    setModal(true);
  };

  const save = async () => {
    // resolve truck by registration number
    const truckObj = trucks.find(t => t.registration_number.toLowerCase() === truckText.trim().toLowerCase());
    if (!truckObj) { alert(`Truck "${truckText}" not found. Please add it in the Fleet tab first, or check the registration number.`); return; }
    // resolve driver by name
    const driverObj = drivers.find(d => d.full_name.toLowerCase() === driverText.trim().toLowerCase());
    if (!driverObj) { alert(`Driver "${driverText}" not found. Please add them in the Drivers tab first, or check the full name.`); return; }
    // resolve customer by company name
    const customerObj = customers.find(c => c.company_name.toLowerCase() === customerText.trim().toLowerCase());
    if (!customerObj) { alert(`Customer "${customerText}" not found. Please add them in the Customers tab first, or check the company name.`); return; }
    if (!form.origin||!form.destination) { alert("Please enter Origin and Destination."); return; }
    if (!form.departure_date) { alert("Please set a Departure Date."); return; }
    if (!form.freight_amount) { alert("Please enter a Freight Amount."); return; }
    if (!form.cargo_description) { alert("Please enter a Cargo Description."); return; }
    setSaving(true);
    try {
      const payload = {...form, truck: truckObj.id, driver: driverObj.id, customer: customerObj.id};
      const method = form.id?"PUT":"POST";
      const url = form.id?`${API}/trips/${form.id}/`:`${API}/trips/`;
      const r = await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      if(!r.ok){const e=await r.json();alert(JSON.stringify(e));setSaving(false);return;}
      reload();setModal(false);setForm({});
    } catch(e){alert("Network error: "+e.message);}
    setSaving(false);
  };

  const updateStatus = async (id, newStatus) => {
    await fetch(`${API}/trips/${id}/update_status/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:newStatus})});
    reload();
  };

  const generateAndPrintInvoice = async (id) => {
    // First check if invoice already exists for this trip
    const tripsRes = await fetch(`${API}/trips/${id}/`);
    const tripData = await tripsRes.json();
    
    // Try to find existing invoice for this trip
    const invRes = await fetch(`${API}/invoices/?search=`);
    const invData = await invRes.json();
    const invList = invData.results || invData;
    const existing = invList.find(inv => inv.trip === id || inv.trip_number === tripData.trip_number);
    
    if (existing) {
      // Invoice exists - just open the PDF
      window.open(`${API}/invoices/${existing.id}/pdf/`, "_blank");
      return;
    }
    // Generate new invoice then open PDF
    const r = await fetch(`${API}/trips/${id}/generate_invoice/`,{method:"POST"});
    if(r.ok) {
      const created = await r.json();
      window.open(`${API}/invoices/${created.id}/pdf/`, "_blank");
    } else {
      const d=await r.json();
      alert(d.error||"Failed to generate invoice");
    }
  };

  const filtered = data.filter(t=>`${t.trip_number} ${t.cargo_description} ${t.origin} ${t.destination}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{padding:"24px 28px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:700,color:"#1a3a5c",margin:0}}>Trips</h1>
        <button style={btn()} onClick={()=>openModal({})}>+ New Trip</button>
      </div>
      <input placeholder="Search trips…" value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,marginBottom:16,maxWidth:320}}/>
      {loading?<p style={{color:"#6b7280"}}>Loading…</p>:(
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f8fafc"}}>{["Trip No.","Route","Truck","Driver","Customer","Freight","Status","Actions"].map(h=><th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:12,fontWeight:600,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(t=>(
              <tr key={t.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                <td style={{padding:"11px 14px",fontSize:13,fontWeight:600,color:"#1a3a5c"}}>{t.trip_number}</td>
                <td style={{padding:"11px 14px",fontSize:12}}><div style={{fontWeight:500}}>{t.origin}</div><div style={{color:"#6b7280"}}>→ {t.destination}</div></td>
                <td style={{padding:"11px 14px",fontSize:12,color:"#6b7280"}}>{t.truck_registration}</td>
                <td style={{padding:"11px 14px",fontSize:12}}>{t.driver_name}</td>
                <td style={{padding:"11px 14px",fontSize:12}}>{t.customer_name}</td>
                <td style={{padding:"11px 14px",fontSize:13,fontWeight:600,color:"#16a34a"}}>${Number(t.freight_amount).toLocaleString()}</td>
                <td style={{padding:"11px 14px"}}><Badge status={t.status}/></td>
                <td style={{padding:"11px 14px"}}>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    <button onClick={()=>openModal(t)} style={{background:"none",border:"1px solid #d1d5db",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>Edit</button>
                    <button onClick={()=>deleteRecord(t.id,t.trip_number)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>Delete</button>
                    {t.status==="planned"&&<button onClick={()=>updateStatus(t.id,"in_progress")} style={{background:"#dbeafe",color:"#2563eb",border:"none",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>Start</button>}
                    {t.status==="in_progress"&&<button onClick={()=>updateStatus(t.id,"completed")} style={{background:"#dcfce7",color:"#16a34a",border:"none",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>Complete</button>}
                    {t.status==="completed"&&<button onClick={()=>generateAndPrintInvoice(t.id)} style={{background:"#1a3a5c",color:"#fff",border:"none",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>🖨 Print Invoice</button>}
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length&&<tr><td colSpan={8} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>No trips found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {modal&&(
        <Modal title={form.id?"Edit Trip":"New Trip"} onClose={()=>setModal(false)}>
          <div style={{background:"#f0f7ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#1e40af"}}>
            💡 Type the exact <b>truck registration</b>, <b>driver full name</b>, and <b>customer company name</b> as saved in the system.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="Truck Registration *">
              <input style={inp} value={truckText} onChange={e=>setTruckText(e.target.value)} placeholder="e.g. AGJ 6793"/>
              <div style={{fontSize:11,color:"#6b7280",marginTop:3}}>Saved trucks: {trucks.map(t=>t.registration_number).join(", ")||"none yet"}</div>
            </Field>
            <Field label="Driver Full Name *">
              <input style={inp} value={driverText} onChange={e=>setDriverText(e.target.value)} placeholder="e.g. Nick Chikasha"/>
              <div style={{fontSize:11,color:"#6b7280",marginTop:3}}>Saved drivers: {drivers.map(d=>d.full_name).join(", ")||"none yet"}</div>
            </Field>
            <Field label="Customer Company Name *">
              <input style={inp} value={customerText} onChange={e=>setCustomerText(e.target.value)} placeholder="e.g. New Business Logistic"/>
              <div style={{fontSize:11,color:"#6b7280",marginTop:3}}>Saved customers: {customers.map(c=>c.company_name).join(", ")||"none yet"}</div>
            </Field>
            <Field label="Freight Amount ($) *"><input type="number" style={inp} value={form.freight_amount||""} onChange={f("freight_amount")} placeholder="e.g. 1850"/></Field>
            <Field label="Origin *"><input style={inp} value={form.origin||""} onChange={f("origin")} placeholder="e.g. Masvingo"/></Field>
            <Field label="Destination *"><input style={inp} value={form.destination||""} onChange={f("destination")} placeholder="e.g. Kafue"/></Field>
            <Field label="Departure Date/Time *"><input type="datetime-local" style={inp} value={form.departure_date||""} onChange={f("departure_date")}/></Field>
            <Field label="Status"><select style={inp} value={form.status||"planned"} onChange={f("status")}><option value="planned">Planned</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></Field>
          </div>
          <Field label="Cargo Description *"><input style={inp} value={form.cargo_description||""} onChange={f("cargo_description")} placeholder="e.g. Iron Spongy Ferrous"/></Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
            <button onClick={()=>setModal(false)} style={btn("#fff","#374151")}>Cancel</button>
            <SaveBtn onClick={save} loading={saving}/>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Invoices ───────────────────────────────────────────────────────────────────
function Invoices() {
  const { data, loading, reload } = useList("invoices");
  const { data: customers } = useList("customers");
  const deleteRecord = useDelete("invoices", reload);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [form, setForm] = useState({ items:[{description:"",quantity:1,unit_price:""}], tax_rate:0 });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const addItem = () => setForm(f=>({...f,items:[...f.items,{description:"",quantity:1,unit_price:""}]}));
  const removeItem = i => setForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)}));
  const updateItem = (i,k,v) => setForm(f=>{const items=[...f.items];items[i]={...items[i],[k]:v};return{...f,items};});

  const subtotal = form.items.reduce((s,it)=>s+(Number(it.quantity)*Number(it.unit_price)||0),0);

  const save = async () => {
    if (!form.customer) { alert("Please select a customer."); return; }
    if (!form.due_date) { alert("Please set a due date."); return; }
    if (form.items.some(it=>!it.description||!it.unit_price)) { alert("Please fill in all line item descriptions and prices."); return; }
    setSaving(true);
    try {
      const payload = {
        customer: Number(form.customer),
        due_date: form.due_date,
        invoice_date: form.invoice_date || new Date().toISOString().split("T")[0],
        tax_rate: Number(form.tax_rate || 0),
        notes: form.notes || "",
        items: form.items.map(it=>({
          description: it.description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
        }))
      };
      const r = await fetch(`${API}/invoices/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      if(!r.ok){const e=await r.json();alert(JSON.stringify(e));setSaving(false);return;}
      const created = await r.json();
      reload();
      setModal(false);
      setForm({items:[{description:"",quantity:1,unit_price:""}],tax_rate:0});
      window.open(`${API}/invoices/${created.id}/pdf/`, "_blank");
    } catch(e){alert("Network error: "+e.message);}
    setSaving(false);
  };

  const markPaid = async id => {
    await fetch(`${API}/invoices/${id}/mark_paid/`,{method:"POST"});
    reload();
  };

  const filtered = data.filter(inv=>`${inv.invoice_number} ${inv.customer_name}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{padding:"24px 28px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:700,color:"#1a3a5c",margin:0}}>Invoices</h1>
        <button style={btn()} onClick={()=>{setForm({items:[{description:"",quantity:1,unit_price:""}],tax_rate:0,invoice_date:new Date().toISOString().split("T")[0]});setModal(true);}}>+ New Invoice</button>
      </div>
      <input placeholder="Search invoices…" value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,marginBottom:16,maxWidth:320}}/>
      {loading?<p style={{color:"#6b7280"}}>Loading…</p>:(
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f8fafc"}}>{["Invoice No.","Customer","Date","Due Date","Total","Balance","Status","Actions"].map(h=><th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:12,fontWeight:600,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(inv=>(
              <tr key={inv.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                <td style={{padding:"11px 14px",fontSize:13,fontWeight:700,color:"#1a3a5c"}}>{inv.invoice_number}</td>
                <td style={{padding:"11px 14px",fontSize:13}}>{inv.customer_name}</td>
                <td style={{padding:"11px 14px",fontSize:12,color:"#6b7280"}}>{inv.invoice_date}</td>
                <td style={{padding:"11px 14px",fontSize:12,color:"#6b7280"}}>{inv.due_date}</td>
                <td style={{padding:"11px 14px",fontSize:13,fontWeight:600}}>${Number(inv.total).toLocaleString()}</td>
                <td style={{padding:"11px 14px",fontSize:13,fontWeight:600,color:Number(inv.balance_due)>0?"#dc2626":"#16a34a"}}>${Number(inv.balance_due).toLocaleString()}</td>
                <td style={{padding:"11px 14px"}}><Badge status={inv.status}/></td>
                <td style={{padding:"11px 14px"}}>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>setViewModal(inv)} style={{background:"none",border:"1px solid #d1d5db",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>View</button>
                    <button onClick={()=>window.open(`${API}/invoices/${inv.id}/pdf/`,"_blank")} style={{background:"#dbeafe",color:"#2563eb",border:"none",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>PDF</button>
                    {inv.status!=="paid"&&<button onClick={()=>markPaid(inv.id)} style={{background:"#dcfce7",color:"#16a34a",border:"none",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>Paid</button>}
                    <button onClick={()=>deleteRecord(inv.id,inv.invoice_number)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length&&<tr><td colSpan={8} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>No invoices found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal&&(
        <Modal title="New Invoice" onClose={()=>setModal(false)} wide>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="Customer *">
              <select style={inp} value={form.customer||""} onChange={e=>setForm(f=>({...f,customer:e.target.value}))}>
                <option value="">Select customer…</option>
                {customers.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </Field>
            <Field label="Tax Rate (%)"><input type="number" style={inp} value={form.tax_rate||0} onChange={e=>setForm(f=>({...f,tax_rate:e.target.value}))}/></Field>
            <Field label="Invoice Date"><input type="date" style={inp} value={form.invoice_date||new Date().toISOString().split("T")[0]} onChange={e=>setForm(f=>({...f,invoice_date:e.target.value}))}/></Field>
            <Field label="Due Date *"><input type="date" style={inp} value={form.due_date||""} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))}/></Field>
          </div>
          <div style={{borderTop:"1px solid #e5e7eb",paddingTop:14,marginTop:4}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:13,fontWeight:600,color:"#1a3a5c"}}>Line Items</span>
              <button onClick={addItem} style={{background:"none",border:"1px solid #d1d5db",borderRadius:6,padding:"4px 12px",fontSize:12,cursor:"pointer"}}>+ Add Line</button>
            </div>
            {form.items.map((item,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 70px 120px 32px",gap:6,marginBottom:8,alignItems:"start"}}>
                <input placeholder="Description e.g. Iron transport Masvingo to Kafue" style={inp} value={item.description} onChange={e=>updateItem(i,"description",e.target.value)}/>
                <input type="number" placeholder="Qty" style={inp} value={item.quantity} onChange={e=>updateItem(i,"quantity",e.target.value)}/>
                <input type="number" placeholder="Unit price" style={inp} value={item.unit_price} onChange={e=>updateItem(i,"unit_price",e.target.value)}/>
                <button onClick={()=>removeItem(i)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,cursor:"pointer",fontSize:16,height:38}}>×</button>
              </div>
            ))}
            <div style={{textAlign:"right",fontSize:15,fontWeight:700,color:"#1a3a5c",marginTop:10}}>Subtotal: ${subtotal.toFixed(2)}</div>
          </div>
          <Field label="Notes (optional)"><textarea style={{...inp,height:50}} value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any additional notes…"/></Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:12}}>
            <button onClick={()=>setModal(false)} style={btn("#fff","#374151")}>Cancel</button>
            <SaveBtn onClick={save} label="Create Invoice" loading={saving}/>
          </div>
        </Modal>
      )}

      {viewModal&&(
        <Modal title={viewModal.invoice_number} onClose={()=>setViewModal(null)} wide>
          <InvoicePreview invoice={viewModal} onClose={()=>setViewModal(null)}/>
        </Modal>
      )}
    </div>
  );
}

function InvoicePreview({ invoice }) {
  const [full, setFull] = useState(null);
  useEffect(()=>{ fetch(`${API}/invoices/${invoice.id}/`).then(r=>r.json()).then(setFull); },[invoice.id]);
  if(!full) return <p style={{color:"#6b7280"}}>Loading…</p>;
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
        <div>
          <div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>BILL TO</div>
          <div style={{fontSize:14,fontWeight:600}}>{full.customer_name}</div>
          <div style={{fontSize:12,color:"#6b7280"}}>{full.customer_address}</div>
          <div style={{fontSize:12,color:"#6b7280"}}>{full.customer_city}, {full.customer_country}</div>
          {full.customer_tax_number&&<div style={{fontSize:12,color:"#6b7280"}}>Tax: {full.customer_tax_number}</div>}
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:11,color:"#6b7280"}}>Date: <b>{full.invoice_date}</b></div>
          <div style={{fontSize:11,color:"#6b7280"}}>Due: <b>{full.due_date}</b></div>
          <div style={{marginTop:8}}><Badge status={full.status}/></div>
        </div>
      </div>
      <table style={{width:"100%",borderCollapse:"collapse",marginBottom:16}}>
        <thead><tr style={{background:"#1a3a5c"}}>{["Description","Qty","Unit Price","Amount"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:h==="Description"?"left":"right",color:"#fff",fontSize:12}}>{h}</th>)}</tr></thead>
        <tbody>{full.items?.map((item,i)=>(
          <tr key={i} style={{background:i%2===0?"#f8fafc":"#fff"}}>
            <td style={{padding:"8px 12px",fontSize:13}}>{item.description}</td>
            <td style={{padding:"8px 12px",fontSize:13,textAlign:"right"}}>{item.quantity}</td>
            <td style={{padding:"8px 12px",fontSize:13,textAlign:"right"}}>${Number(item.unit_price).toLocaleString()}</td>
            <td style={{padding:"8px 12px",fontSize:13,textAlign:"right",fontWeight:600}}>${Number(item.amount).toLocaleString()}</td>
          </tr>
        ))}</tbody>
      </table>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <div style={{minWidth:200}}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13}}><span style={{color:"#6b7280"}}>Subtotal</span><span>${Number(full.subtotal).toLocaleString()}</span></div>
          {Number(full.tax_rate)>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13}}><span style={{color:"#6b7280"}}>Tax ({full.tax_rate}%)</span><span>${Number(full.tax_amount).toLocaleString()}</span></div>}
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontSize:16,fontWeight:700,color:"#1a3a5c",borderTop:"2px solid #1a3a5c",marginTop:4}}><span>Total</span><span>${Number(full.total).toLocaleString()}</span></div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
        <button onClick={()=>window.open(`${API}/invoices/${invoice.id}/pdf/`,"_blank")} style={btn()}>Download PDF</button>
      </div>
    </div>
  );
}

// ── App Shell ──────────────────────────────────────────────────────────────────
const NAV = [
  {key:"dashboard",label:"Dashboard",icon:"📊"},
  {key:"trips",label:"Trips",icon:"🗺️"},
  {key:"invoices",label:"Invoices",icon:"📄"},
  {key:"fleet",label:"Fleet",icon:"🚛"},
  {key:"drivers",label:"Drivers",icon:"👷"},
  {key:"customers",label:"Customers",icon:"🏢"},
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [user, setUser] = useState(() => localStorage.getItem("ntc_user"));

  const handleLogin = (username) => {
    localStorage.setItem("ntc_user", username);
    setUser(username);
  };

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem("ntc_user");
    setUser(null);
  };

  if (!user) return <Login onLogin={handleLogin}/>;

  const pages = { dashboard:<Dashboard/>, trips:<Trips/>, invoices:<Invoices/>, fleet:<Fleet/>, drivers:<Drivers/>, customers:<Customers/> };

  return (
    <div style={{display:"flex",minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",background:"#f8fafc"}}>
      <div style={{width:220,background:"#1a3a5c",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"22px 20px 16px",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
          <div style={{fontSize:16,fontWeight:800,color:"#fff",letterSpacing:0.5}}>NTC Invoicing</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:2,letterSpacing:1,textTransform:"uppercase"}}>BARKERVILLE FREIGHT</div>
        </div>
        <nav style={{padding:"12px 0",flex:1}}>
          {NAV.map(n=>(
            <button key={n.key} onClick={()=>setPage(n.key)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 20px",background:page===n.key?"rgba(255,255,255,0.12)":"none",border:"none",cursor:"pointer",color:page===n.key?"#fff":"rgba(255,255,255,0.65)",fontSize:13,fontWeight:page===n.key?600:400,textAlign:"left",borderLeft:page===n.key?"3px solid #60a5fa":"3px solid transparent"}}>
              <span style={{fontSize:16}}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{padding:"12px 20px",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginBottom:8}}>👤 {user}</div>
          <button onClick={handleLogout} style={{background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.8)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer",width:"100%"}}>Sign Out</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>{pages[page]}</div>
    </div>
  );
}
