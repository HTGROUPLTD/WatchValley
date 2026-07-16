import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Menu, X, Search, ShoppingBag, ChevronLeft, ChevronRight, Instagram, Mail, Check, User, LogOut, Plus, Minus } from "lucide-react";

/* ============================= CONFIG ============================= */
const OWNER_EMAIL = "owner@watchvalley.com"; // change to the real inbox — used for the Support mailto link
const INSTAGRAM_URL = "https://instagram.com/watchvalley";
const BRAND = "WATCH VALLEY";

// Where the Python (FastAPI) backend is running.
// Change this once you deploy the backend somewhere other than your own machine.
const API_BASE_URL = "http://localhost:8000";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
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

/* ============================= PALETTE =============================
   ink #121212  paper #FAF9F6  fog #ECEAE5  steel #8A8A8E  signal #C1272D
   ==================================================================== */

/* ============================= PRODUCTS ============================= */
const DEFAULT_PRODUCTS = [
  { id: 1, name: "Meridian", gender: "men", price: 420, dial: "#121212", strap: "#1F1F1F", accent: "#C1272D", desc: "A matte black case paired with a brushed steel bezel. Built for the boardroom and the runway alike, the Meridian carries a 41mm case and a 100m water resistance rating.", pop: 92 },
  { id: 2, name: "Onyx Classic", gender: "men", price: 380, dial: "#1a1a1a", strap: "#8A8A8E", accent: "#C1272D", desc: "Deep onyx dial with a sunburst finish, framed in a slim 38mm stainless case. A quiet, confident everyday watch.", pop: 76 },
  { id: 3, name: "Ashcroft", gender: "men", price: 540, dial: "#0d0d0d", strap: "#121212", accent: "#FAF9F6", desc: "Full-black tone-on-tone construction with a sapphire crystal and a titanium caseback. Our most technical men's piece.", pop: 88 },
  { id: 4, name: "Nocturne", gender: "men", price: 460, dial: "#171717", strap: "#C1272D", accent: "#121212", desc: "A black dial with a signature red second hand, set on a matte black leather strap. Named for its low-light legibility.", pop: 81 },
  { id: 5, name: "Sable", gender: "men", price: 310, dial: "#2a2a2a", strap: "#8A8A8E", accent: "#121212", desc: "Everyday minimalism: a clean three-hand movement, brushed steel strap, and a 40mm case that wears close to the wrist.", pop: 63 },
  { id: 6, name: "Ferro", gender: "men", price: 610, dial: "#101010", strap: "#1F1F1F", accent: "#C1272D", desc: "Our flagship chronograph. Two red sub-dials break up an otherwise all-black face built around an in-house movement.", pop: 95 },
  { id: 7, name: "Vantage", gender: "men", price: 350, dial: "#1c1c1c", strap: "#8A8A8E", accent: "#FAF9F6", desc: "A field-watch silhouette in matte black, with luminous markers and a canvas-textured strap.", pop: 58 },
  { id: 8, name: "Ridgeline", gender: "men", price: 495, dial: "#141414", strap: "#121212", accent: "#C1272D", desc: "Rugged and refined, the Ridgeline pairs a fluted bezel with a matte black finish strip across the dial.", pop: 70 },
  { id: 9, name: "Lumen", gender: "women", price: 340, dial: "#FAF9F6", strap: "#8A8A8E", accent: "#C1272D", desc: "An ivory dial in a slim 32mm case, finished with a delicate steel mesh strap. Understated and precise.", pop: 84 },
  { id: 10, name: "Ivory Bloom", gender: "women", price: 300, dial: "#F5F3EE", strap: "#ECEAE5", accent: "#121212", desc: "Soft ivory tones with a floral-etched caseback. A gentle, everyday companion piece.", pop: 66 },
  { id: 11, name: "Aurelia", gender: "women", price: 460, dial: "#121212", strap: "#8A8A8E", accent: "#C1272D", desc: "A black dial set in a rose-brushed case, with a fine link bracelet. Aurelia is built for evenings.", pop: 90 },
  { id: 12, name: "Petra", gender: "women", price: 275, dial: "#1a1a1a", strap: "#1F1F1F", accent: "#FAF9F6", desc: "A compact 30mm matte black case with a woven leather strap. Petra layers easily with everyday jewelry.", pop: 55 },
  { id: 13, name: "Selene", gender: "women", price: 520, dial: "#0d0d0d", strap: "#C1272D", accent: "#121212", desc: "Moonlit black dial, red leather strap. Selene is a limited seasonal release with a sapphire crystal front.", pop: 87 },
  { id: 14, name: "Marlow", gender: "women", price: 315, dial: "#F5F3EE", strap: "#121212", accent: "#C1272D", desc: "Ivory dial, matte black strap. A study in contrast, built on a slim quartz movement.", pop: 61 },
  { id: 15, name: "Opaline", gender: "women", price: 395, dial: "#EDEAE3", strap: "#8A8A8E", accent: "#121212", desc: "Opaline dial finish with a fine steel bracelet. A soft, quiet everyday luxury piece.", pop: 73 },
  { id: 16, name: "Wren", gender: "women", price: 260, dial: "#121212", strap: "#8A8A8E", accent: "#FAF9F6", desc: "Petite 28mm matte black case. Wren is our lightest, most minimal women's watch.", pop: 68 },
];

/* ============================= SVG WATCH ICON ============================= */
function WatchIcon({ dial = "#121212", strap = "#8A8A8E", accent = "#C1272D", size = 100 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-sm">
      <rect x="42" y="2" width="16" height="16" rx="3" fill={strap} />
      <rect x="42" y="82" width="16" height="16" rx="3" fill={strap} />
      <circle cx="50" cy="50" r="34" fill={dial} stroke={accent} strokeWidth="1.5" />
      <circle cx="50" cy="50" r="27" fill="none" stroke="#ffffff22" strokeWidth="0.5" />
      <line x1="50" y1="50" x2="50" y2="32" stroke={accent === dial ? "#fff" : "#fff"} strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="50" x2="62" y2="50" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="50" r="2.5" fill={accent} />
      {[...Array(12)].map((_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        const x1 = 50 + 30 * Math.sin(a), y1 = 50 - 30 * Math.cos(a);
        const x2 = 50 + 26 * Math.sin(a), y2 = 50 - 26 * Math.cos(a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff55" strokeWidth="1" />;
      })}
    </svg>
  );
}

/* ============================= WELCOME SPLASH ============================= */
function WelcomeSplash({ onDone }) {
  const [phase, setPhase] = useState("drop"); // drop -> welcome -> gone
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("welcome"), 1000);
    const t2 = setTimeout(() => setPhase("gone"), 3400);
    const t3 = setTimeout(() => onDone(), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div className={`fixed inset-0 z-[100] bg-black flex items-center justify-center transition-opacity duration-300 ${phase === "gone" ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      <div className="relative flex flex-col items-center">
        {/* clock face marking 2 o'clock */}
        <div className="relative w-28 h-28 rounded-full border-2 border-white/50 flex items-center justify-center mb-8">
          {/* hour ticks at 12, 3, 6, 9 */}
          {[0, 90, 180, 270].map((deg) => (
            <div
              key={deg}
              className="absolute w-0.5 h-2 bg-white/60"
              style={{
                left: "50%",
                top: "4px",
                marginLeft: "-1px",
                transformOrigin: "50% 52px",
                transform: `rotate(${deg}deg)`,
              }}
            />
          ))}
          {/* hour hand -> points to 2 */}
          <div
            className="absolute rounded-full"
            style={{
              left: "50%",
              bottom: "50%",
              width: "4px",
              height: "30px",
              marginLeft: "-2px",
              backgroundColor: "#C1272D",
              transformOrigin: "50% 100%",
              transform: "rotate(60deg)",
            }}
          />
          {/* minute hand -> points to 12 */}
          <div
            className="absolute rounded-full"
            style={{
              left: "50%",
              bottom: "50%",
              width: "3px",
              height: "40px",
              marginLeft: "-1.5px",
              backgroundColor: "#C1272D",
              transformOrigin: "50% 100%",
              transform: "rotate(0deg)",
            }}
          />
          {/* center pivot */}
          <div className="absolute w-2.5 h-2.5 rounded-full bg-[#C1272D]" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }} />
          {/* falling ball, settles at the 2 o'clock mark */}
          <div
            className="absolute w-3 h-3 rounded-full bg-[#C1272D]"
            style={{
              animation: "ballDrop 0.6s cubic-bezier(.5,0,.75,1) forwards",
              left: "78%",
              top: "0%",
            }}
          />
        </div>
        <div className={`text-center transition-all duration-300 ${phase !== "drop" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          <p className="text-white tracking-[0.4em] text-xs mb-2">WELCOME TO</p>
          <h1 className="text-white text-4xl tracking-[0.15em]" style={{ fontFamily: "'Bodoni Moda', serif" }}>{BRAND}</h1>
        </div>
      </div>
      <style>{`
        @keyframes ballDrop {
          0% { top: 0%; opacity: 1; }
          65% { top: 68%; }
          80% { top: 58%; }
          100% { top: 65%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ============================= SLIDESHOW ============================= */
// Owner-editable: add / edit slides here.
const SLIDES = [
  { id: 1, title: "The Ferro Chronograph", sub: "Precision, in matte black.", bg: "#121212", accent: "#C1272D" },
  { id: 2, title: "Selene — Limited Release", sub: "A moonlit dial for evening wear.", bg: "#1c1c1c", accent: "#C1272D" },
  { id: 3, title: "Built for Everyday", sub: "The Meridian, 41mm, 100m water resistant.", bg: "#0d0d0d", accent: "#ECEAE5" },
];

function Slideshow() {
  const [i, setI] = useState(0);
  const touchStartX = useRef(null);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);
  const go = (dir) => setI((v) => (v + dir + SLIDES.length) % SLIDES.length);
  const onTouchStart = (e) => (touchStartX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 50) go(-1); else if (dx < -50) go(1);
    touchStartX.current = null;
  };
  const s = SLIDES[i];
  return (
    <div
      className="relative w-full h-64 sm:h-80 overflow-hidden rounded-2xl select-none"
      style={{ backgroundColor: s.bg }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute inset-0 flex items-center justify-center px-8">
        <WatchIcon dial={s.bg} strap="#8A8A8E" accent={s.accent} size={120} />
      </div>
      <div className="absolute left-6 bottom-6 right-6">
        <p className="text-[#ECEAE5]/60 text-[10px] tracking-[0.3em] mb-1">{`0${i + 1} / 0${SLIDES.length}`}</p>
        <h3 className="text-[#FAF9F6] text-2xl" style={{ fontFamily: "'Bodoni Moda', serif" }}>{s.title}</h3>
        <p className="text-[#ECEAE5]/70 text-sm mt-1">{s.sub}</p>
      </div>
      <button onClick={() => go(-1)} aria-label="Previous slide" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition">
        <ChevronLeft size={18} />
      </button>
      <button onClick={() => go(1)} aria-label="Next slide" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition">
        <ChevronRight size={18} />
      </button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {SLIDES.map((sl, idx) => (
          <button key={sl.id} onClick={() => setI(idx)} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-[#C1272D]" : "w-1.5 bg-white/40"}`} />
        ))}
      </div>
    </div>
  );
}

/* ============================= HELPERS ============================= */
const money = (n) => `$${n.toFixed(2)}`;
const monthKey = (ts) => new Date(ts).toISOString().slice(0, 7);

/* ============================= MAIN APP ============================= */
export default function WatchValley() {
  const [showSplash, setShowSplash] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all"); // all | men | women
  const [visibleCount, setVisibleCount] = useState(8);
  const [selected, setSelected] = useState(null); // product detail
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [thankYou, setThankYou] = useState(false);

  const [cart, setCart] = useState([]); // {id, qty}
  const [products, setProducts] = useState(DEFAULT_PRODUCTS); // replaced by the API once it loads

  const [account, setAccount] = useState(null); // {name,email}
  const [authMode, setAuthMode] = useState("signin"); // signin | signup
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");

  const sentinelRef = useRef(null);

  /* ---------- load the live catalog (falls back to the bundled defaults if the API is unreachable) ---------- */
  const loadProducts = useCallback(async () => {
    try {
      const data = await apiFetch("/api/products");
      setProducts(data.map((p) => ({ ...p, desc: p.description })));
    } catch (e) {
      // backend not running / unreachable — keep the bundled defaults so the site still works
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  /* ---------- infinite scroll ---------- */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((v) => v + 6);
    }, { rootMargin: "300px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [selected]);

  useEffect(() => { setVisibleCount(8); }, [query, category]);

  /* ---------- derived product list ---------- */
  const filtered = useMemo(() => {
    let list = products.filter((p) => (category === "all" ? true : p.gender === category));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => (b.popularity ?? b.pop ?? 0) - (a.popularity ?? a.pop ?? 0));
  }, [category, query, products]);

  const visible = filtered.slice(0, visibleCount);

  /* ---------- cart helpers ---------- */
  const addToCart = (product) => {
    setCart((c) => {
      const found = c.find((i) => i.id === product.id);
      if (found) return c.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { id: product.id, qty: 1 }];
    });
  };
  const updateQty = (id, delta) => {
    setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)).filter((i) => i.qty > 0));
  };
  const removeFromCart = (id) => setCart((c) => c.filter((i) => i.id !== id));

  const cartItems = cart.map((ci) => ({ ...ci, product: products.find((p) => p.id === ci.id) })).filter((ci) => ci.product);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const cartCount = cart.reduce((n, i) => n + i.qty, 0);

  /* ---------- checkout ---------- */
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", address: "" });
  const [orderFormError, setOrderFormError] = useState("");
  const submitOrder = async () => {
    if (!orderForm.name.trim() || !orderForm.phone.trim() || !orderForm.address.trim()) {
      setOrderFormError("Please enter the information first.");
      return;
    }
    setOrderFormError("");
    try {
      await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: cartItems.map((i) => ({ id: i.id, name: i.product.name, price: i.product.price, qty: i.qty })),
          total: cartTotal,
          name: orderForm.name,
          phone: orderForm.phone,
          address: orderForm.address,
          account_email: account ? account.email : null,
          account_name: account ? account.name : null,
        }),
      });
      loadProducts(); // refresh so newly-popular watches move up right away
      setCart([]);
      setOrderForm({ name: "", phone: "", address: "" });
      setOrderFormError("");
      setCheckoutOpen(false);
      setThankYou(true);
    } catch (e) {
      setOrderFormError(e.message || "Could not place your order. Please try again.");
    }
  };

  /* ---------- account (talks to the Python backend) ---------- */
  const submitAuth = async () => {
    setAuthError("");
    if (!authForm.email.trim() || !authForm.password.trim() || (authMode === "signup" && !authForm.name.trim())) {
      setAuthError("Please fill in all fields.");
      return;
    }
    try {
      const record = await apiFetch(`/api/accounts/${authMode === "signup" ? "signup" : "login"}`, {
        method: "POST",
        body: JSON.stringify(
          authMode === "signup"
            ? { name: authForm.name, email: authForm.email, password: authForm.password }
            : { email: authForm.email, password: authForm.password }
        ),
      });
      setAccount({ name: record.name, email: record.email });
      setAccountOpen(false);
      setAuthForm({ name: "", email: "", password: "" });
    } catch (e) {
      setAuthError(e.message || "Something went wrong. Please try again.");
    }
  };

  const mailtoOwner = (product) => {
    const subject = encodeURIComponent(`Question about ${product.name}`);
    const body = encodeURIComponent(`Hi,\n\nI'd like to ask about the ${product.name} (${money(product.price)}).\n\n`);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${OWNER_EMAIL}&su=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#121212]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #8A8A8E55; border-radius: 4px; }
      `}</style>

      {showSplash && <WelcomeSplash onDone={() => setShowSplash(false)} />}

      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur border-b border-[#121212]/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="p-2 -ml-2 hover:bg-[#121212]/5 rounded-full transition">
            <Menu size={22} />
          </button>
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A8E]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search watches..."
              />
          </div>
          <button onClick={() => setCartOpen(true)} aria-label="Open cart" className="relative p-2 hover:bg-[#121212]/5 rounded-full transition">
            <ShoppingBag size={21} />
            {cartCount > 0 && (
              <span
                className="absolute -top-1 -right-1 text-white text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#C1272D", border: "1.5px solid #FAF9F6", lineHeight: 1 }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
        <div className="text-center pb-3 px-4">
          <p className="text-[11px] tracking-[0.25em] text-[#8A8A8E]">WATCH VALLEY — IN A MATTE BLACK FINISH STRIP</p>
        </div>
      </header>

      {/* ============ SIDE MENU ============ */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="relative w-72 bg-white text-[#121212] h-full p-6 flex flex-col gap-1 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl" style={{ fontFamily: "'Bodoni Moda', serif" }}>{BRAND}</h2>
              <button onClick={() => setMenuOpen(false)}><X size={20} /></button>
            </div>
            <button onClick={() => { setAccountOpen(true); setMenuOpen(false); }} className="flex items-center gap-3 py-3 text-sm border-b border-[#121212]/10 text-left text-[#121212]">
              <User size={17} /> {account ? `Account — ${account.name}` : "Create / Manage Account"}
            </button>
            <button onClick={() => { setCategory("all"); setMenuOpen(false); }} className="py-3 text-sm border-b border-[#121212]/10 text-left text-[#121212]">All Watches</button>
            <button onClick={() => { setCategory("men"); setMenuOpen(false); }} className="py-3 text-sm border-b border-[#121212]/10 text-left text-[#121212]">Men's Watches</button>
            <button onClick={() => { setCategory("women"); setMenuOpen(false); }} className="py-3 text-sm border-b border-[#121212]/10 text-left text-[#121212]">Women's Watches</button>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-3 text-sm border-b border-[#121212]/10 text-[#121212]">
              <Instagram size={17} /> Our Instagram
            </a>
          </div>
        </div>
      )}

      {/* ============ ACCOUNT PANEL ============ */}
      {accountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setAccountOpen(false)} />
          <div
            className="relative rounded-2xl w-full max-w-sm p-6"
            style={{
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.6)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.6)",
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">{account ? "Your Account" : authMode === "signin" ? "Sign In" : "Create Account"}</h3>
              <button onClick={() => setAccountOpen(false)}><X size={18} /></button>
            </div>
            {account ? (
              <div className="space-y-3">
                <p className="text-sm text-[#5a5a5a]">Signed in as</p>
                <p className="font-medium">{account.name}</p>
                <p className="text-sm text-[#5a5a5a]">{account.email}</p>
                <button onClick={() => { setAccount(null); }} className="mt-4 flex items-center gap-2 text-sm text-[#C1272D]">
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {authMode === "signup" && (
                  <input placeholder="Full name" value={authForm.name} onChange={(e) => setAuthForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-[#6b6b6b]" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(0,0,0,0.08)" }} />
                )}
                <input placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-[#6b6b6b]" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(0,0,0,0.08)" }} />
                <input type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-[#6b6b6b]" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(0,0,0,0.08)" }} />
                {authError && <p className="text-xs text-[#C1272D]">{authError}</p>}
                <button
                  onClick={submitAuth}
                  className="relative overflow-hidden w-full text-white rounded-xl py-2.5 text-sm font-medium transition active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(180deg, #333333 0%, #121212 55%, #030303 100%)",
                    boxShadow: "inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -6px 10px rgba(0,0,0,0.4), 0 3px 8px rgba(0,0,0,0.25)",
                  }}
                >
                  <span className="pointer-events-none absolute inset-x-1 top-1 h-1/3 rounded-lg" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0))" }} />
                  <span className="relative">{authMode === "signin" ? "Sign In" : "Create Account"}</span>
                </button>
                <button onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthError(""); }} className="w-full text-xs text-[#5a5a5a] pt-1">
                  {authMode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ MAIN CONTENT ============ */}
      {!selected && (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Slideshow />

          {/* category tab bar */}
          <div className="flex justify-center mt-8 mb-6">
            <div className="bg-[#ECEAE5] rounded-full p-1 flex gap-1">
              {[{ k: "all", l: "All" }, { k: "men", l: "Men" }, { k: "women", l: "Women" }].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setCategory(t.k)}
                  className={`px-5 py-2 rounded-full text-sm transition ${category === t.k ? "bg-[#121212] text-white" : "text-[#121212]/70 hover:text-[#121212]"}`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* product grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {visible.map((p) => (
              <div key={p.id} className="group text-left">
                <button onClick={() => setSelected(p)} className="block w-full text-left">
                  <div className="bg-[#ECEAE5] rounded-2xl aspect-square flex items-center justify-center overflow-hidden p-6 group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                    {p.image_url ? (
                      <img src={`${API_BASE_URL}${p.image_url}`} alt={p.name} className="w-full h-full object-cover -m-6 transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="transition-transform duration-300 group-hover:scale-105">
                        <WatchIcon dial={p.dial} strap={p.strap} accent={p.accent} size={90} />
                      </div>
                    )}
                  </div>
                  <p className="mt-2.5 text-sm font-medium">{p.name}</p>
                </button>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-sm text-[#8A8A8E]">{money(p.price)}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                    aria-label={`Add ${p.name} to cart`}
                    className="w-6 h-6 rounded-full flex items-center justify-center transition shrink-0 shadow-md"
                    style={{ backgroundColor: "#1C1C1C", border: "1px solid #000" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#C1272D")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1C1C1C")}
                  >
                    <Plus size={13} color="#ffffff" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {visible.length === 0 && <p className="text-center text-[#8A8A8E] py-16 text-sm">No watches match your search.</p>}
          <div ref={sentinelRef} className="h-10" />
        </main>
      )}

      {/* ============ PRODUCT DETAIL ============ */}
      {selected && (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-[#8A8A8E] mb-5">
            <ChevronLeft size={16} /> Back
          </button>
          <div className="bg-[#ECEAE5] rounded-2xl aspect-square max-w-md mx-auto flex items-center justify-center overflow-hidden p-10">
            {selected.image_url ? (
              <img src={`${API_BASE_URL}${selected.image_url}`} alt={selected.name} className="w-full h-full object-cover -m-10" />
            ) : (
              <WatchIcon dial={selected.dial} strap={selected.strap} accent={selected.accent} size={200} />
            )}
          </div>
          <div className="mt-6">
            <h2 className="text-3xl" style={{ fontFamily: "'Bodoni Moda', serif" }}>{selected.name}</h2>
            <p className="text-lg text-[#8A8A8E] mt-1">{money(selected.price)}</p>
            <p className="text-sm text-[#121212]/80 mt-4 leading-relaxed">{selected.desc}</p>
            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={() => mailtoOwner(selected)} className="flex items-center gap-2 border border-[#121212]/20 rounded-full px-5 py-2.5 text-sm hover:bg-[#121212]/5 transition">
                <Mail size={15} /> Support
              </button>
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 border border-[#121212]/20 rounded-full px-5 py-2.5 text-sm hover:bg-[#121212]/5 transition">
                <Instagram size={15} /> Our Story on Instagram
              </a>
            </div>
          </div>

          {/* sticky add-to-cart bar at the bottom of the page */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-[#121212]/10 px-4 sm:px-6 py-3">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{selected.name}</p>
                <p className="text-xs text-[#8A8A8E]">{money(selected.price)}</p>
              </div>
              <button
                onClick={() => addToCart(selected)}
                className="relative overflow-hidden rounded-2xl px-8 py-3 text-sm font-medium text-white transition active:scale-[0.97]"
                style={{
                  background: "linear-gradient(180deg, #2a2a2a 0%, #121212 55%, #050505 100%)",
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -6px 10px rgba(0,0,0,0.4), 0 4px 10px rgba(0,0,0,0.25)",
                }}
              >
                <span
                  className="pointer-events-none absolute inset-x-1 top-1 h-1/3 rounded-xl"
                  style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0))" }}
                />
                <span className="relative">Add to Cart</span>
              </button>
            </div>
          </div>
        </main>
      )}
        
              className="w-full bg-[#ECEAE5] rounded-full pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C1272D]
      {/* ============ CART DRAWER ============ */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-sm bg-white h-full p-6 flex flex-col shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-medium">Your Cart {cartCount > 0 ? `(${cartCount})` : ""}</h3>
              <button onClick={() => setCartOpen(false)}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {cartItems.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center h-full py-16">
                  <div className="w-14 h-14 rounded-full bg-[#ECEAE5] flex items-center justify-center mb-4">
                    <ShoppingBag size={22} className="text-[#8A8A8E]" />
                  </div>
                  <p className="text-sm font-medium">Your cart is empty</p>
                  <p className="text-xs text-[#8A8A8E] mt-1">Add a watch to get started.</p>
                </div>
              )}
              {cartItems.map((i) => (
                <div key={i.id} className="flex items-center gap-3 bg-[#ECEAE5] rounded-2xl p-3">
                  <div className="w-16 h-16 rounded-xl bg-[#FAF9F6] flex items-center justify-center shrink-0 overflow-hidden">
                    {i.product.image_url ? (
                      <img src={`${API_BASE_URL}${i.product.image_url}`} alt={i.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <WatchIcon dial={i.product.dial} strap={i.product.strap} accent={i.product.accent} size={44} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{i.product.name}</p>
                    <p className="text-xs text-[#8A8A8E]">{money(i.product.price)}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button onClick={() => updateQty(i.id, -1)} className="w-6 h-6 rounded-full bg-white flex items-center justify-center"><Minus size={12} /></button>
                      <span className="text-xs w-4 text-center">{i.qty}</span>
                      <button onClick={() => updateQty(i.id, 1)} className="w-6 h-6 rounded-full bg-white flex items-center justify-center"><Plus size={12} /></button>
                      <button onClick={() => removeFromCart(i.id)} className="text-[10px] text-[#C1272D] ml-2">Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {cartItems.length > 0 && (
              <div className="pt-4 border-t border-[#121212]/10 mt-3">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-[#8A8A8E]">Total</span>
                  <span className="font-medium">{money(cartTotal)}</span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}
                  className="w-full text-white rounded-full py-3 text-sm font-medium transition"
                  style={{ backgroundColor: "#1C1C1C", border: "1px solid #000" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2f2f2f")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1C1C1C")}
                >
                  Proceed
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ CHECKOUT MODAL ============ */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setCheckoutOpen(false)} />
          <div
            className="relative rounded-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto"
            style={{
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.6)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.6)",
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Delivery Details</h3>
              <button onClick={() => setCheckoutOpen(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Full name" value={orderForm.name} onChange={(e) => setOrderForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-[#6b6b6b]" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(0,0,0,0.08)" }} />
              <input placeholder="Phone number" value={orderForm.phone} onChange={(e) => setOrderForm((f) => ({ ...f, phone: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-[#6b6b6b]" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(0,0,0,0.08)" }} />
              <textarea placeholder="Delivery address" value={orderForm.address} onChange={(e) => setOrderForm((f) => ({ ...f, address: e.target.value }))} rows={3} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none placeholder:text-[#6b6b6b]" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(0,0,0,0.08)" }} />
              <div className="flex justify-between text-sm pt-1">
                <span className="text-[#8A8A8E]">Order total</span>
                <span className="font-medium">{money(cartTotal)}</span>
              </div>
              {orderFormError && <p className="text-xs text-[#C1272D]">{orderFormError}</p>}
              <button
                onClick={submitOrder}
                className="w-full text-white rounded-xl py-3 text-sm font-medium transition"
                style={{ backgroundColor: "#121212", border: "2px solid #C1272D" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2a2a2a")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#121212")}
              >
                Complete Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ THANK YOU ============ */}
      {thankYou && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setThankYou(false)} />
          <div className="relative bg-[#FAF9F6] rounded-2xl w-full max-w-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#121212] flex items-center justify-center mx-auto mb-4">
              <Check size={26} className="text-white" />
            </div>
            <h3 className="text-xl mb-2" style={{ fontFamily: "'Bodoni Moda', serif" }}>Thank you for placing your order</h3>
            <p className="text-sm text-[#8A8A8E]">Your order will be dispatched soon.</p>
            <button onClick={() => setThankYou(false)} className="mt-6 bg-[#121212] text-white rounded-xl px-6 py-2.5 text-sm">Continue Shopping</button>
          </div>
        </div>
      )}


      {/* ============ FOOTER ============ */}
      {!selected && (
        <footer className="border-t border-[#121212]/10 mt-10">
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#8A8A8E]">
            <p>© {new Date().getFullYear()} {BRAND}</p>
            <div className="flex items-center gap-4">
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-[#121212]"><Instagram size={13} /> Instagram</a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
      }
