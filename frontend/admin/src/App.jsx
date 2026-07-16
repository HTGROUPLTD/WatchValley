import React, { useState, useEffect, useMemo, useCallback } from "react";
import { DollarSign, ClipboardList, TrendingUp, TrendingDown, ShieldCheck, Users, Package, MoreVertical, Trash2, ImagePlus } from "lucide-react";

/* =============================================================================
   WATCH VALLEY — OWNER BACKEND (standalone, admin-only)
   -----------------------------------------------------------------------------
   This is a SEPARATE site from the public storefront. It is never linked from
   the customer-facing pages — nothing in the storefront's UI points here.
   Only someone with this file/link can open it.

   It talks to the real Python (FastAPI) backend included alongside this file
   (see /backend). Orders, accounts, and product popularity all live in that
   backend's database — this page just displays and manages them through the
   API, using a JWT issued by POST /api/owner/login.
   ========================================================================== */

// Where the Python (FastAPI) backend is running.
// Change this once you deploy the backend somewhere other than your own machine.
const API_BASE_URL = "http://localhost:8000";

const BRAND = "WATCH VALLEY";

const money = (n) => `$${n.toFixed(2)}`;
const monthKey = (ts) => new Date(ts).toISOString().slice(0, 7);

async function apiFetch(path, options = {}, token = null) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    let detail = "Something went wrong. Please try again.";
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch (e) {}
    throw new Error(detail);
  }
  return res.json();
}

/* ============================= GLOSSY BUTTON (black, rounded-square) ============================= */
function GlossyButton({ children, onClick, className = "", small = false }) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden text-white font-medium transition active:scale-[0.97] ${small ? "rounded-lg px-4 py-1.5 text-xs" : "rounded-xl px-6 py-2.5 text-sm"} ${className}`}
      style={{
        background: "linear-gradient(180deg, #333333 0%, #121212 55%, #030303 100%)",
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -6px 10px rgba(0,0,0,0.4), 0 3px 8px rgba(0,0,0,0.25)",
      }}
    >
      <span
        className="pointer-events-none absolute inset-x-1 top-1 h-1/3 rounded-lg"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0))" }}
      />
      <span className="relative">{children}</span>
    </button>
  );
}

/* ============================= GLASS CARD (frosted stat tile) ============================= */
function GlassCard({ label, children }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.4)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.55)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.5)",
      }}
    >
      <p className="text-xs text-[#5a5a5a] mb-1">{label}</p>
      {children}
    </div>
  );
}

export default function WatchValleyBackend() {
  const [token, setToken] = useState(null);

  const [orders, setOrders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [tab, setTab] = useState("sales"); // sales | orders | accounts | items
  const [ordersTab, setOrdersTab] = useState("pending"); // pending | dispatched | completed

  // ---- Items (product management) ----
  const [newItem, setNewItem] = useState({ name: "", gender: "men", price: "", description: "" });
  const [newItemImageFile, setNewItemImageFile] = useState(null);
  const [newItemImagePreview, setNewItemImagePreview] = useState(null);
  const [addItemError, setAddItemError] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", gender: "men", price: "", description: "" });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Login is bypassed for now — the dashboard is always accessible without
  // an email/password. See the note at the bottom of this file for how to
  // turn real login back on when you're ready for it.
  const authed = true;

  /* ---------- load orders + accounts + items from the real backend ---------- */
  const loadData = useCallback(async (tok) => {
    try {
      const [ordersData, accountsData, itemsData] = await Promise.all([
        apiFetch("/api/owner/orders", {}, tok),
        apiFetch("/api/owner/accounts", {}, tok),
        apiFetch("/api/owner/products", {}, tok),
      ]);
      setOrders(ordersData);
      setAccounts(accountsData);
      setItems(itemsData);
      setLoadFailed(false);
    } catch (e) {
      // backend unreachable or rejecting the request — show the dashboard
      // anyway (with empty data) instead of forcing a login screen
      setLoadFailed(true);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    loadData(token);
  }, [token, loadData]);

  // light polling so new orders placed on the storefront show up without a manual refresh
  useEffect(() => {
    const t = setInterval(() => loadData(token), 8000);
    return () => clearInterval(t);
  }, [token, loadData]);

  const markDispatched = async (id) => {
    try {
      await apiFetch(`/api/owner/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "dispatched" }) }, token);
      loadData(token);
    } catch (e) {}
  };
  const markCompleted = async (id) => {
    try {
      await apiFetch(`/api/owner/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "completed" }) }, token);
      loadData(token);
    } catch (e) {}
  };

  // ---------- items (product management) ----------
  const uploadImage = async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE_URL}/api/owner/products/upload-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Image upload failed.");
    }
    const data = await res.json();
    return data.image_url;
  };

  const handleNewItemImage = (file) => {
    setNewItemImageFile(file);
    setNewItemImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const submitNewItem = async () => {
    setAddItemError("");
    if (!newItem.name.trim() || !newItem.price || Number(newItem.price) <= 0) {
      setAddItemError("Please enter a name and a valid price.");
      return;
    }
    setAddingItem(true);
    try {
      let image_url = null;
      if (newItemImageFile) image_url = await uploadImage(newItemImageFile);
      await apiFetch(
        "/api/owner/products",
        {
          method: "POST",
          body: JSON.stringify({
            name: newItem.name,
            gender: newItem.gender,
            price: Number(newItem.price),
            description: newItem.description,
            image_url,
          }),
        },
        token
      );
      setNewItem({ name: "", gender: "men", price: "", description: "" });
      setNewItemImageFile(null);
      setNewItemImagePreview(null);
      loadData(token);
    } catch (e) {
      setAddItemError(e.message || "Could not add this item. Please try again.");
    }
    setAddingItem(false);
  };

  const openEdit = (item) => {
    if (editingItemId === item.id) {
      setEditingItemId(null);
      return;
    }
    setEditingItemId(item.id);
    setEditForm({ name: item.name, gender: item.gender, price: String(item.price), description: item.description });
    setEditImageFile(null);
    setEditImagePreview(item.image_url ? `${API_BASE_URL}${item.image_url}` : null);
    setEditError("");
  };

  const handleEditImage = (file) => {
    setEditImageFile(file);
    setEditImagePreview(file ? URL.createObjectURL(file) : editImagePreview);
  };

  const saveEdit = async (id) => {
    setEditError("");
    if (!editForm.name.trim() || !editForm.price || Number(editForm.price) <= 0) {
      setEditError("Please enter a name and a valid price.");
      return;
    }
    setSavingEdit(true);
    try {
      const updates = {
        name: editForm.name,
        gender: editForm.gender,
        price: Number(editForm.price),
        description: editForm.description,
      };
      if (editImageFile) updates.image_url = await uploadImage(editImageFile);
      await apiFetch(`/api/owner/products/${id}`, { method: "PATCH", body: JSON.stringify(updates) }, token);
      setEditingItemId(null);
      loadData(token);
    } catch (e) {
      setEditError(e.message || "Could not save changes. Please try again.");
    }
    setSavingEdit(false);
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Remove this watch from the site? This can't be undone.")) return;
    try {
      await apiFetch(`/api/owner/products/${id}`, { method: "DELETE" }, token);
      loadData(token);
    } catch (e) {}
  };

  const salesStats = useMemo(() => {
    const now = new Date();
    const thisKey = now.toISOString().slice(0, 7);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = prevDate.toISOString().slice(0, 7);
    let thisMonth = 0, prevMonth = 0;
    orders.forEach((o) => {
      const k = monthKey(o.created_at);
      if (k === thisKey) thisMonth += o.total;
      else if (k === prevKey) prevMonth += o.total;
    });
    const pctChange = prevMonth === 0 ? (thisMonth > 0 ? 100 : 0) : ((thisMonth - prevMonth) / prevMonth) * 100;
    const profit = thisMonth * 0.45;
    const prevProfit = prevMonth * 0.45;
    const profitDelta = profit - prevProfit;
    const isLoss = profitDelta < 0;
    return { thisMonth, prevMonth, pctChange, profit, prevProfit, profitDelta, isLoss, totalOrders: orders.length };
  }, [orders]);

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const dispatchedOrders = orders.filter((o) => o.status === "dispatched");
  const completedOrders = orders.filter((o) => o.status === "completed");
  const activeList = ordersTab === "pending" ? pendingOrders : ordersTab === "dispatched" ? dispatchedOrders : completedOrders;

  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: "'Inter', sans-serif", background: "linear-gradient(160deg, #d7d7d7 0%, #c7c7c9 45%, #b9b9bd 100%)" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600&family=Inter:wght@300;400;500;600;700&display=swap');`}</style>

      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex items-center gap-2 mb-8">
          <ShieldCheck size={18} className="text-[#121212]" />
          <h1 className="text-xl text-[#121212]" style={{ fontFamily: "'Bodoni Moda', serif" }}>{BRAND} — Owner Backend</h1>
        </div>

        {loadFailed && (
          <div className="max-w-xl mx-auto mb-6 text-center p-3 rounded-xl text-xs" style={{ background: "rgba(193,39,45,0.12)", border: "1px solid rgba(193,39,45,0.3)", color: "#C1272D" }}>
            Couldn't reach the backend at {API_BASE_URL}. Make sure it's running, then this will refresh automatically.
          </div>
        )}

        <>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
              <div
                className="rounded-full p-1 flex gap-1 w-fit"
                style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.5)" }}
              >
                <button onClick={() => setTab("sales")} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition ${tab === "sales" ? "bg-[#121212] text-white" : "text-[#121212]/70"}`}>
                  <DollarSign size={14} /> Sales
                </button>
                <button onClick={() => setTab("orders")} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition ${tab === "orders" ? "bg-[#121212] text-white" : "text-[#121212]/70"}`}>
                  <ClipboardList size={14} /> Orders
                </button>
                <button onClick={() => setTab("accounts")} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition ${tab === "accounts" ? "bg-[#121212] text-white" : "text-[#121212]/70"}`}>
                  <Users size={14} /> Accounts
                </button>
                <button onClick={() => setTab("items")} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition ${tab === "items" ? "bg-[#121212] text-white" : "text-[#121212]/70"}`}>
                  <Package size={14} /> Items
                </button>
              </div>
            </div>

            {!loaded && <p className="text-sm text-[#3a3a3a]">Loading…</p>}

            {loaded && tab === "sales" && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassCard label="This Month's Sales">
                  <p className="text-2xl font-medium text-[#121212]">{money(salesStats.thisMonth)}</p>
                  <p className="text-[11px] text-[#5a5a5a] mt-1">Last month: {money(salesStats.prevMonth)}</p>
                </GlassCard>
                <GlassCard label="Change vs Last Month">
                  <p className={`text-2xl font-medium flex items-center gap-1 ${salesStats.pctChange >= 0 ? "text-[#1a7a3c]" : "text-[#C1272D]"}`}>
                    {salesStats.pctChange >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    {Math.abs(salesStats.pctChange).toFixed(1)}%
                  </p>
                </GlassCard>
                <GlassCard label="Estimated Profit">
                  <p className="text-2xl font-medium text-[#121212]">{money(salesStats.profit)}</p>
                  <p className="text-[11px] text-[#5a5a5a] mt-1">Last month: {money(salesStats.prevProfit)}</p>
                </GlassCard>
                <GlassCard label={salesStats.isLoss ? "Loss vs Last Month" : "Profit vs Last Month"}>
                  <p className={`text-2xl font-medium ${salesStats.isLoss ? "text-[#C1272D]" : "text-[#1a7a3c]"}`}>
                    {salesStats.isLoss ? "-" : "+"}{money(Math.abs(salesStats.profitDelta))}
                  </p>
                </GlassCard>
                <GlassCard label="Total Orders">
                  <p className="text-2xl font-medium text-[#121212]">{salesStats.totalOrders}</p>
                </GlassCard>
                <GlassCard label="Active Accounts">
                  <p className="text-2xl font-medium text-[#121212]">{accounts.length}</p>
                </GlassCard>
              </div>
            )}

            {loaded && tab === "orders" && (
              <div>
                <div className="flex gap-2 mb-4 flex-wrap">
                  <button onClick={() => setOrdersTab("pending")} className={`px-4 py-1.5 rounded-full text-xs border ${ordersTab === "pending" ? "bg-[#121212] text-white border-[#121212]" : "border-[#121212]/20 text-[#121212]/70"}`}>Pending ({pendingOrders.length})</button>
                  <button onClick={() => setOrdersTab("dispatched")} className={`px-4 py-1.5 rounded-full text-xs border ${ordersTab === "dispatched" ? "bg-[#121212] text-white border-[#121212]" : "border-[#121212]/20 text-[#121212]/70"}`}>Dispatched ({dispatchedOrders.length})</button>
                  <button onClick={() => setOrdersTab("completed")} className={`px-4 py-1.5 rounded-full text-xs border ${ordersTab === "completed" ? "bg-[#121212] text-white border-[#121212]" : "border-[#121212]/20 text-[#121212]/70"}`}>Completed ({completedOrders.length})</button>
                </div>
                <div className="space-y-3">
                  {activeList.map((o) => (
                    <div
                      key={o.id}
                      className="rounded-2xl p-4"
                      style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.55)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-medium text-[#121212]">{o.name} · {o.code}</p>
                          <p className="text-xs text-[#5a5a5a]">{o.phone}</p>
                          <p className="text-xs text-[#5a5a5a]">{o.address}</p>
                          <p className="text-xs text-[#5a5a5a] mt-1">
                            Placed by: {o.account_email ? `${o.account_name || ""} (${o.account_email})` : "Guest checkout"}
                          </p>
                        </div>
                        {o.status === "pending" && <span className="bg-[#C1272D] text-white text-[10px] px-2.5 py-1 rounded-full">Pending</span>}
                        {o.status === "dispatched" && <span className="bg-[#b8860b] text-white text-[10px] px-2.5 py-1 rounded-full">Dispatched</span>}
                        {o.status === "completed" && <span className="bg-[#1a7a3c] text-white text-[10px] px-2.5 py-1 rounded-full">Completed</span>}
                      </div>
                      <div className="text-xs text-[#3a3a3a] mb-3">
                        {o.items.map((it) => `${it.name} x${it.qty}`).join(", ")}
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-[#121212]">{money(o.total)}</p>
                        {o.status === "pending" && <GlossyButton onClick={() => markDispatched(o.id)} small>Dispatch</GlossyButton>}
                        {o.status === "dispatched" && <GlossyButton onClick={() => markCompleted(o.id)} small>Completed</GlossyButton>}
                      </div>
                    </div>
                  ))}
                  {activeList.length === 0 && <p className="text-sm text-[#5a5a5a] text-center py-10">No {ordersTab} orders yet.</p>}
                </div>
              </div>
            )}

            {loaded && tab === "accounts" && (
              <div className="space-y-3">
                <p className="text-xs text-[#5a5a5a] mb-2">{accounts.length} account{accounts.length === 1 ? "" : "s"} registered</p>
                {accounts.map((a) => (
                  <div
                    key={a.email}
                    className="rounded-2xl p-4 flex items-center justify-between"
                    style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.55)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                  >
                    <div>
                      <p className="text-sm font-medium text-[#121212]">{a.name}</p>
                      <p className="text-xs text-[#5a5a5a]">{a.email}</p>
                    </div>
                    <p className="text-[10px] text-[#5a5a5a]">{new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
                {accounts.length === 0 && <p className="text-sm text-[#5a5a5a] text-center py-10">No accounts created yet.</p>}
              </div>
            )}

            {loaded && tab === "items"&& (
              <div className="space-y-6">
                {/* ---------- Add New Item ---------- */}
                <div
                  className="rounded-2xl p-5"
                  style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.55)", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                >
                  <p className="text-sm font-medium text-[#121212] mb-3">Add a new watch</p>
                  <div className="grid sm:grid-cols-[120px_1fr] gap-4">
                    <label className="w-full aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer overflow-hidden shrink-0" style={{ background: "rgba(255,255,255,0.5)", border: "1px dashed rgba(0,0,0,0.25)" }}>
                      {newItemImagePreview ? (
                        <img src={newItemImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImagePlus size={20} className="text-[#5a5a5a] mb-1" />
                          <span className="text-[10px] text-[#5a5a5a]">Upload photo</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleNewItemImage(e.target.files[0] || null)} />
                    </label>
                    <div className="space-y-2">
                      <input
                        placeholder="Watch name"
                        value={newItem.name}
                        onChange={(e) => setNewItem((f) => ({ ...f, name: e.target.value }))}
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.08)" }}
                      />
                      <div className="flex gap-2">
                        <select
                          value={newItem.gender}
                          onChange={(e) => setNewItem((f) => ({ ...f, gender: e.target.value }))}
                          className="rounded-lg px-3 py-2 text-sm outline-none"
                          style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.08)" }}
                        >
                          <option value="men">Men</option>
                          <option value="women">Women</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Price ($)"
                          value={newItem.price}
                          onChange={(e) => setNewItem((f) => ({ ...f, price: e.target.value }))}
                          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                          style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.08)" }}
                        />
                      </div>
                      <textarea
                        placeholder="Description"
                        rows={2}
                        value={newItem.description}
                        onChange={(e) => setNewItem((f) => ({ ...f, description: e.target.value }))}
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                        style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.08)" }}
                      />
                    </div>
                  </div>
                  {addItemError && <p className="text-xs text-[#C1272D] mt-2">{addItemError}</p>}
                  <div className="flex justify-end mt-3">
                    <GlossyButton onClick={submitNewItem} className={addingItem ? "opacity-60 pointer-events-none" : ""}>
                      {addingItem ? "Adding…" : "Add Item to List"}
                    </GlossyButton>
                  </div>
                </div>

                {/* ---------- Existing Items ---------- */}
                <div className="space-y-3">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className="rounded-2xl p-4"
                      style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.55)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: it.image_url ? "#fff" : it.dial }}>
                          {it.image_url ? (
                            <img src={`${API_BASE_URL}${it.image_url}`} alt={it.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={20} color={it.accent} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#121212] truncate">{it.name}</p>
                          <p className="text-xs text-[#5a5a5a]">{money(it.price)} · {it.gender === "men" ? "Men" : "Women"}</p>
                        </div>
                        <button onClick={() => openEdit(it)} aria-label="Edit item" className="p-2 rounded-full hover:bg-black/5 transition text-[#121212]">
                          <MoreVertical size={18} />
                        </button>
                        <button onClick={() => deleteItem(it.id)} aria-label="Delete item" className="p-2 rounded-full text-white transition" style={{ backgroundColor: "#1C1C1C" }}>
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {editingItemId === it.id && (
                        <div className="mt-4 pt-4 space-y-2" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                          <div className="grid sm:grid-cols-[80px_1fr] gap-3">
                            <label className="w-full aspect-square rounded-lg flex items-center justify-center cursor-pointer overflow-hidden shrink-0" style={{ background: "rgba(255,255,255,0.5)", border: "1px dashed rgba(0,0,0,0.25)" }}>
                              {editImagePreview ? (
                                <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <ImagePlus size={16} className="text-[#5a5a5a]" />
                              )}
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleEditImage(e.target.files[0] || null)} />
                            </label>
                            <div className="space-y-2">
                              <input
                                value={editForm.name}
                                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Watch name"
                                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                                style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.08)" }}
                              />
                              <div className="flex gap-2">
                                <select
                                  value={editForm.gender}
                                  onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}
                                  className="rounded-lg px-3 py-2 text-sm outline-none"
                                  style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.08)" }}
                                >
                                  <option value="men">Men</option>
                                  <option value="women">Women</option>
                                </select>
                                <input
                                  type="number"
                                  value={editForm.price}
                                  onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                                  placeholder="Price ($)"
                                  className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                                  style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.08)" }}
                                />
                              </div>
                            </div>
                          </div>
                          <textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                            rows={2}
                            placeholder="Description"
                            className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                            style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.08)" }}
                          />
                          {editError && <p className="text-xs text-[#C1272D]">{editError}</p>}
                          <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => setEditingItemId(null)} className="px-4 py-2 rounded-lg text-xs text-[#3a3a3a]">Cancel</button>
                            <GlossyButton onClick={() => saveEdit(it.id)} small className={savingEdit ? "opacity-60 pointer-events-none" : ""}>
                              {savingEdit ? "Saving…" : "Save Changes"}
                            </GlossyButton>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-sm text-[#5a5a5a] text-center py-10">No items yet — add your first watch above.</p>}
                </div>
              </div>
            )}
          </>
      </div>
    </div>
  );
                }
