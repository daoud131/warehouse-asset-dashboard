import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Package, Boxes, Clock3, X, ImagePlus, ArrowUpRight, RefreshCw } from "lucide-react";

const API = "/api";
const imageSrc = (path) => path || "";

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function App() {
  const [assets, setAssets] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ asset_id: "", category: "" });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");

  async function loadAssets(search = query) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/assets?q=${encodeURIComponent(search)}`);
      if (!response.ok) throw new Error("Could not load asset records.");
      setAssets(await response.json());
    } catch (e) {
      setError(`${e.message} Check that the backend is running.`);
    } finally { setLoading(false); }
  }

  useEffect(() => { loadAssets(""); }, []);
  useEffect(() => {
    const timer = setTimeout(() => loadAssets(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const categories = useMemo(() => new Set(assets.map(a => a.category)).size, [assets]);

  function openNew() {
    setForm({ asset_id: "", category: "" });
    setPhoto(null);
    setPreview("");
    setModal({ type: "new" });
  }

  function selectPhoto(file) {
    setPhoto(file || null);
    setPreview(file ? URL.createObjectURL(file) : "");
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = new FormData();
    body.append("asset_id", form.asset_id);
    body.append("category", form.category);
    if (photo) body.append("photo", photo);
    try {
      const response = await fetch(`${API}/assets`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save asset.");
      setModal(null);
      setQuery("");
      await loadAssets("");
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Package size={21}/></div><div><strong>Stockroom</strong><span>ASSET CONTROL</span></div></div>
      <div className="side-label">WORKSPACE</div>
      <div className="nav-item active"><Boxes size={18}/> Asset register</div>
      <div className="side-note"><span className="status-dot"/> Local network workspace</div>
      <div className="sidebar-bottom"><div className="avatar">WH</div><div><strong>Warehouse operator</strong><span>Asset management</span></div></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> Asset register</div><div className="top-right"><span className="online"><i/> System online</span><div className="avatar small">WH</div></div></header>
      <section className="content">
        <div className="page-heading">
          <div><div className="eyebrow">WAREHOUSE OPERATIONS</div><h1>Asset register</h1><p>Track, identify and manage your warehouse assets.</p></div>
          <button className="primary-btn" onClick={openNew}><Plus size={18}/> Add new asset</button>
        </div>

        <div className="stats">
          <div className="stat-card"><div className="stat-icon blue"><Package size={19}/></div><div><span>Total assets</span><strong>{assets.length}</strong><small>Matching records</small></div></div>
          <div className="stat-card"><div className="stat-icon violet"><Boxes size={19}/></div><div><span>Categories</span><strong>{categories}</strong><small>In current results</small></div></div>
          <div className="stat-card"><div className="stat-icon amber"><Clock3 size={19}/></div><div><span>Latest entry</span><strong className="latest">{assets[0] ? formatDate(assets[0].created_at) : "—"}</strong><small>Server recorded time</small></div></div>
        </div>

        <section className="panel">
          <div className="panel-head"><div><h2>All assets</h2><p>Browse and search registered warehouse assets.</p></div><button className="icon-btn" title="Refresh" onClick={() => loadAssets()}><RefreshCw size={17}/></button></div>
          <div className="toolbar"><div className="search-box"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by Asset ID..." aria-label="Search by Asset ID"/>{query && <button onClick={() => setQuery("")}><X size={15}/></button>}</div><span className="result-count">{assets.length} {assets.length === 1 ? "record" : "records"}</span></div>
          {error && <div className="error-banner">{error}</div>}
          <div className="table-wrap">
            <table><thead><tr><th>ASSET</th><th>ASSET ID</th><th>CATEGORY</th><th>DATE ADDED</th><th></th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="5" className="empty">Loading records…</td></tr> :
                 assets.length === 0 ? <tr><td colSpan="5" className="empty"><div className="empty-icon"><Package size={24}/></div><strong>No assets found</strong><span>{query ? "Try a different Asset ID." : "Add your first asset to get started."}</span></td></tr> :
                 assets.map(asset => <tr key={asset.id} onClick={() => setModal({ type: "detail", asset })} className="click-row">
                   <td><div className="asset-thumb">{asset.image_url ? <img src={imageSrc(asset.image_url)} alt=""/> : <Package size={19}/>}</div></td>
                   <td><strong className="asset-code">{asset.asset_id}</strong></td><td><span className="category-pill">{asset.category}</span></td><td className="date-cell">{formatDate(asset.created_at)}</td><td><button className="view-btn" onClick={e => {e.stopPropagation();setModal({type:"detail",asset});}}>View <ArrowUpRight size={14}/></button></td>
                 </tr>)}
              </tbody>
            </table>
          </div>
          <div className="panel-foot">Showing {assets.length} {assets.length === 1 ? "asset" : "assets"} <span>Data stored on your warehouse server</span></div>
        </section>
        <footer>Stockroom Asset Control <span>•</span> Prototype v1.0</footer>
      </section>
    </main>

    {modal?.type === "new" && <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setModal(null)}><section className="modal">
      <div className="modal-head"><div><div className="eyebrow">ASSET REGISTER</div><h2>Add new asset</h2><p>Enter the asset details below.</p></div><button className="icon-btn" onClick={() => setModal(null)}><X/></button></div>
      <form onSubmit={submit}>
        <label>Asset ID / Identification Number <b>*</b><input required maxLength="100" value={form.asset_id} onChange={e => setForm({...form, asset_id:e.target.value})} placeholder="e.g. WH-000124"/></label>
        <label>Asset category <b>*</b><input required maxLength="100" value={form.category} onChange={e => setForm({...form, category:e.target.value})} placeholder="e.g. Forklift, Laptop, Generator"/></label>
        <label>Asset photograph <span className="optional">OPTIONAL</span></label>
        <label className="upload-area">{preview ? <img className="preview" src={preview} alt="Selected asset"/> : <><ImagePlus size={25}/><strong>Click to upload a photograph</strong><span>PNG, JPG, WEBP or GIF · Max 8 MB</span></>}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => selectPhoto(e.target.files?.[0])}/></label>
        <div className="timestamp-note"><Clock3 size={16}/> Date and time will be recorded automatically by the server.</div>
        {error && <div className="error-banner">{error}</div>}
        <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setModal(null)}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? "Saving…" : <><Plus size={17}/> Save asset</>}</button></div>
      </form>
    </section></div>}

    {modal?.type === "detail" && <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setModal(null)}><section className="modal detail-modal">
      <div className="modal-head"><div><div className="eyebrow">ASSET DETAILS</div><h2>{modal.asset.asset_id}</h2><p>Record #{modal.asset.id}</p></div><button className="icon-btn" onClick={() => setModal(null)}><X/></button></div>
      <div className="detail-photo">{modal.asset.image_url ? <img src={imageSrc(modal.asset.image_url)} alt={`Photograph of ${modal.asset.asset_id}`}/> : <div><ImagePlus size={32}/><span>No photograph uploaded</span></div>}</div>
      <div className="detail-grid"><div><span>ASSET ID</span><strong>{modal.asset.asset_id}</strong></div><div><span>CATEGORY</span><strong>{modal.asset.category}</strong></div><div><span>DATE CREATED</span><strong>{formatDate(modal.asset.created_at)}</strong></div></div>
      <div className="modal-actions"><button className="secondary-btn" onClick={() => setModal(null)}>Close</button></div>
    </section></div>}
  </div>;
}
