"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { displayDesks, seatAreaLabel, furnitureDisplayPoint } from "@/lib/map-presentation";

const statusLabel = {
  available: "Available",
  occupied: "Occupied",
  blocked: "Blocked",
  mine: "Your reservation",
};

const MAP_AREAS = [
  { id: "west", shortName: "West", color: "blue", x: 23, y: 5 },
  { id: "east-a", shortName: "East A", color: "green", x: 10, y: 81 },
  { id: "east-b", shortName: "East B", color: "yellow", x: 24, y: 85 },
  { id: "north-office", shortName: "North · Office", color: "blue", x: 89, y: 29 },
  { id: "north-open", shortName: "North · Open space", color: "green", x: 87, y: 94 },
];

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Something went wrong.");
  return payload;
}

function Logo() {
  return (
    <div className="brand" aria-label="PickSpot">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span><strong>PickSpot</strong></span>
    </div>
  );
}

function AuthCard({ mode, onModeChange, onAuthenticated, setupComplete }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isSetup = mode === "setup";
  const isRegister = mode === "register";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isSetup || isRegister) {
        await request(isSetup ? "/api/auth/setup" : "/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, displayName: name, password }),
        });
      } else {
        await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      }
      onAuthenticated();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <Logo />
        <p className="eyebrow">INTERNAL OFFICE BOOKING</p>
        <h1>{isSetup ? "Create the Owner account" : isRegister ? "Create your account" : "Reserve your seat"}</h1>
        <p className="auth-copy">
          {isSetup
            ? "This first account controls the PickSpot workspace and can manage administrators."
            : "Book your desk for tomorrow from the office network."}
        </p>
        <form onSubmit={submit} className="auth-form">
          {(isSetup || isRegister) && (
            <label>
              Your name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Jane Smith" autoComplete="name" required />
            </label>
          )}
          <label>
            Work email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@att.com" autoComplete="email" required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={isRegister || isSetup ? "new-password" : "current-password"} required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={busy}>{busy ? "Please wait…" : isSetup ? "Create Owner account" : isRegister ? "Create account" : "Sign in"}</button>
        </form>
        {!isSetup && (
          <p className="auth-switch">
            {isRegister ? "Already have an account?" : "New to PickSpot?"}{" "}
            <button type="button" onClick={() => onModeChange(isRegister ? "login" : "register")}>{isRegister ? "Sign in" : "Create an account"}</button>
          </p>
        )}
      </section>
      <aside className="auth-art">
        <div className="globe-lines"><span /><span /><span /><span /></div>
        <div>
          <p className="eyebrow">TOMORROW, PLANNED</p>
          <h2>Find your place before you arrive.</h2>
          <p>Seats become available at 06:00 for the following working day.</p>
        </div>
      </aside>
    </main>
  );
}

function NotificationPanel({ notifications, onClose, onRead }) {
  return (
    <aside className="notifications-panel">
      <div className="panel-heading"><div><p className="eyebrow">UPDATES</p><h3>Notifications</h3></div><button className="icon-button" onClick={onClose} aria-label="Close notifications">×</button></div>
      {notifications.length ? notifications.map((item) => (
        <article className={item.readAt ? "notification" : "notification unread"} key={item.id}>
          <strong>{item.title}</strong><p>{item.message}</p><time>{new Date(item.createdAt).toLocaleString()}</time>
        </article>
      )) : <p className="empty-state">You are all caught up.</p>}
      {notifications.some((item) => !item.readAt) && <button className="text-button" onClick={onRead}>Mark all as read</button>}
    </aside>
  );
}

function Legend() {
  return <div className="legend" aria-label="Seat map legend">
    {Object.entries(statusLabel).map(([status, label]) => <span key={status}><i className={`legend-dot ${status}`} />{label}</span>)}
  </div>;
}

function SeatMap({ mapData, selectedSeatId, onSelect }) {
  const [zoom, setZoom] = useState(1);
  const [tilted, setTilted] = useState(true);
  const viewportRef = useRef(null);
  if (!mapData?.site) return <div className="map-loading">Loading the office map…</div>;


  function resetView() {
    setZoom(1);
    viewportRef.current?.scrollTo({ left: 0, top: 0 });
  }
  return <div className="office-map">
    <div className="office-map-toolbar">
      <span className="map-instruction">Select a seat on the map</span>
      <div className="office-view-controls">
        <button type="button" aria-label="Toggle 3D view" aria-pressed={tilted} onClick={() => setTilted((value) => !value)}>{tilted ? "3D view" : "Top view"}</button>
        <span className="map-control-divider" aria-hidden="true" />
        <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - .25))}>−</button>
        <button type="button" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom((value) => Math.min(2, value + .25))}>+</button>
        <button type="button" onClick={resetView}>Fit map</button>
        <span className="sr-only" role="status">Zoom {Math.round(zoom * 100)}%</span>
      </div>
    </div>
    <div ref={viewportRef} className="office-map-viewport" tabIndex={0} role="region" aria-label="Office map. Scroll to explore; use zoom controls to enlarge seats.">
      <div className="office-map-stage" style={{ width: `max(${zoom * 100}%, ${zoom * 760}px)` }}>
        <div className={`office-floor ${tilted ? "is-3d" : "is-top"}`} role="group" aria-label="Office seats">
          <img className="office-floor-image" src="/office-2d-map.png" alt="Office floor plan with meeting rooms, reception and central atrium" draggable="false" />
          <svg className="furniture-floor" viewBox="0 0 963 583" aria-hidden="true">
            <path fill="var(--zone-blue-bg)" d="M62 105 L374 47 L389 125 L66 164 Z M190 169 L269 154 L276 196 L202 209 Z" />
            <path fill="var(--zone-green-bg)" d="M835 258 L893 258 L901 455 L845 459 L835 398 Z M69 350 L145 371 L135 417 L60 397 Z" />
            <g className="north-office-room">
              <path className="north-office-floor" d="M822 184 L897 199 L897 255 L822 255 Z" />
              <path className="north-office-wall" d="M822 218 L822 184 L897 199 L897 255 L822 255 L822 240" />
              <path className="north-office-door" d="M822 240 L842 240 M842 240 A20 20 0 0 0 822 220" />
            </g>
            <path fill="var(--zone-sand-bg)" d="M158 390 L278 425 L271 452 L147 422 Z" />
          </svg>
          {displayDesks.map(([x,y,width,height,angle], index) => {
            const point = furnitureDisplayPoint(x, y);
            return <div key={index} className="office-desk" aria-hidden="true" style={{ left: `${point.x / 963 * 100}%`, top: `${point.y / 583 * 100}%`, width: `${width / 963 * 100}%`, height: `${height / 583 * 100}%`, "--desk-angle": `${angle}deg` }}><i /></div>;
          })}
          {MAP_AREAS.map((area) => <span key={area.id} className={`office-zone-label zone-label-${area.color}`} style={{ left: `${area.x}%`, top: `${area.y}%` }}><strong>{area.shortName}</strong></span>)}
          <span className="office-place-label" style={{ left: "49%", top: "58%" }}>Reception</span>
          <span className="office-place-label" style={{ left: "52%", top: "24%" }}>Kitchen</span>
          <span className="office-place-label atrium-label" style={{ left: "32%", top: "51%" }}>Open atrium</span>
          {mapData.seats.map((seat) => {
            const point = furnitureDisplayPoint(seat.x * 963 / 100, seat.y * 583 / 100);
            const unavailable = seat.status === "occupied" || seat.status === "blocked";
            return <button key={seat.id} type="button"
              className={`office-chair ${seat.status} ${selectedSeatId === seat.id ? "selected" : ""}`}
              data-seat-id={seat.id}
              style={{ left: `${point.x / 963 * 100}%`, top: `${point.y / 583 * 100}%` }}
              aria-label={`${seat.label}, ${statusLabel[seat.status]}, ${seatAreaLabel(seat)}`}
              aria-pressed={selectedSeatId === seat.id} aria-disabled={unavailable}
              onClick={() => { if (!unavailable) onSelect(seat); }}
              title={`${seat.label} · ${seatAreaLabel(seat)} · ${statusLabel[seat.status]}`}>
              <span className="chair-cushion" aria-hidden="true"><i>{selectedSeatId === seat.id || seat.status === "mine" ? "✓" : unavailable ? "×" : ""}</i></span>
              <span className="office-chair-label">{seat.label}<small>{seatAreaLabel(seat)}</small><small>{statusLabel[seat.status]}</small></span>
            </button>;
          })}
        </div>
      </div>
    </div>
    <div className="map-footer"><Legend /><span>Scroll to explore</span></div>
  </div>;
}

function BookingPanel({ mapData, selectedSeat, onReserve, onCancel, busy }) {
  const noWindow = !mapData?.window?.open;
  return <aside className="booking-panel">
    <p className="eyebrow">YOUR BOOKING</p>
    <h2>{mapData?.window?.open ? "Book tomorrow" : "Booking is not open"}</h2>
    <p className="muted">{mapData?.window?.message}</p>
    {mapData?.booking ? (
      <div className="current-booking">
        <span className="booking-check">✓</span>
        <div><strong>{mapData.booking.seatLabel}</strong><span>Reserved for {mapData.booking.reservedDate}</span></div>
      </div>
    ) : <div className="current-booking empty"><span className="booking-check">+</span><div><strong>No seat reserved</strong><span>Choose an available seat on the map.</span></div></div>}
    <div className="selection-box">
      <span>Selected seat</span>
      <strong>{selectedSeat ? selectedSeat.label : "Choose a seat"}</strong>
      {selectedSeat && <span className="selected-seat-area">{seatAreaLabel(selectedSeat)}</span>}
      {selectedSeat && <small className={`status-text ${selectedSeat.status}`}>{statusLabel[selectedSeat.status]}</small>}
    </div>
    <button className="primary-button" disabled={!selectedSeat || selectedSeat.status === "blocked" || selectedSeat.status === "occupied" || noWindow || busy} onClick={onReserve}>
      {busy ? "Saving…" : mapData?.booking ? "Update reservation" : "Reserve selected seat"}
    </button>
    {mapData?.booking && <button className="secondary-button" disabled={busy || noWindow} onClick={onCancel}>Cancel reservation</button>}
  </aside>;
}

function AdminConsole({ adminData, onRefresh, onToast, user }) {
  const [tab, setTab] = useState("seats");
  const [draftLabels, setDraftLabels] = useState({});
  const [busyId, setBusyId] = useState("");
  if (!adminData) return null;

  async function action(url, body, success) {
    try {
      setBusyId(url);
      await request(url, { method: "POST", body: JSON.stringify(body || {}) });
      onToast(success);
      onRefresh();
    } catch (error) {
      onToast(error.message, true);
    } finally { setBusyId(""); }
  }

  async function saveLabel(seat) {
    const label = draftLabels[seat.id] ?? seat.label;
    try {
      setBusyId(`label-${seat.id}`);
      await request(`/api/admin/seats/${seat.id}`, { method: "PATCH", body: JSON.stringify({ label }) });
      onToast(`${seat.label} renamed to ${label.toUpperCase()}.`);
      onRefresh();
    } catch (error) { onToast(error.message, true); } finally { setBusyId(""); }
  }

  function blockSeat(seat) {
    const reason = window.prompt(`Why is ${seat.label} unavailable?`, "Unavailable");
    if (reason === null) return;
    action(`/api/admin/seats/${seat.id}/block`, { reason }, `${seat.label} is now blocked.`);
  }

  function resetPassword(person) {
    const password = window.prompt(`Enter a temporary password for ${person.displayName} (8+ characters):`);
    if (password === null) return;
    action(`/api/admin/users/${person.id}/reset-password`, { password }, `Password reset for ${person.displayName}.`);
  }

  return <section className="admin-console">
    <div className="admin-heading"><div><p className="eyebrow">ADMIN CONSOLE</p><h2>Manage the workplace</h2><p className="muted">Current booking date: {adminData.window.date}</p></div></div>
    <div className="admin-tabs" role="tablist">
      {[["seats", "Seats"], ["bookings", "Bookings"], ["people", "People"]].map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    {tab === "seats" && <div className="admin-grid">
      {adminData.seats.map((seat) => <article className="admin-seat" key={seat.id}>
        <div><span className={`admin-status ${seat.blockId ? "blocked" : seat.bookingId ? "occupied" : "available"}`} /> <strong>{seat.label}</strong><small>{seat.zone} zone</small></div>
        <div className="seat-actions">
          <input aria-label={`Seat label for ${seat.label}`} value={draftLabels[seat.id] ?? seat.label} onChange={(event) => setDraftLabels({ ...draftLabels, [seat.id]: event.target.value })} />
          <button className="small-button" disabled={busyId === `label-${seat.id}`} onClick={() => saveLabel(seat)}>Save label</button>
          {seat.blockId ? <button className="small-button" disabled={Boolean(busyId)} onClick={() => action(`/api/admin/seats/${seat.id}/unblock`, {}, `${seat.label} is available again.`)}>Unblock</button> : <button className="small-button danger" disabled={Boolean(busyId)} onClick={() => blockSeat(seat)}>Block</button>}
        </div>
        <p>{seat.blockId ? `Blocked: ${seat.blockReason || "Unavailable"}` : seat.bookingId ? `Booked by ${seat.bookedByName}` : "Available"}</p>
      </article>)}
    </div>}
    {tab === "bookings" && <div className="data-table"><div className="table-row table-head"><span>Seat</span><span>Employee</span><span>Email</span><span>Date</span></div>
      {adminData.seats.filter((seat) => seat.bookingId).map((seat) => <div className="table-row" key={seat.bookingId}><strong>{seat.label}</strong><span>{seat.bookedByName}</span><span>{seat.bookedByEmail}</span><span>{seat.reservedDate}</span></div>)}
      {!adminData.seats.some((seat) => seat.bookingId) && <p className="empty-state">No active bookings yet.</p>}
    </div>}
    {tab === "people" && <div className="data-table"><div className="table-row people table-head"><span>Employee</span><span>Access</span><span>Actions</span></div>
      {adminData.users.map((person) => <div className="table-row people" key={person.id}><div><strong>{person.displayName}</strong><span>{person.email}</span></div><span className={`role-badge ${person.role}`}>{person.role}</span><div className="row-actions">
        <button className="small-button" onClick={() => resetPassword(person)}>Reset password</button>
        {user.role === "owner" && person.role !== "owner" && <button className="small-button" onClick={() => action(`/api/admin/users/${person.id}/role`, { role: person.role === "admin" ? "employee" : "admin" }, person.role === "admin" ? `${person.displayName} is now an employee.` : `${person.displayName} is now an admin.`)}>{person.role === "admin" ? "Remove admin" : "Make admin"}</button>}
      </div></div>)}
    </div>}
  </section>;
}

function Dashboard({ user, onLogout }) {
  const [mapData, setMapData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [adminData, setAdminData] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdminConsole, setShowAdminConsole] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const isAdmin = user.role === "admin" || user.role === "owner";
  const unread = notifications.filter((item) => !item.readAt).length;

  const loadData = useCallback(async () => {
    try {
      const [map, notificationData, overview] = await Promise.all([
        request("/api/map"), request("/api/notifications"), isAdmin ? request("/api/admin/overview") : Promise.resolve(null),
      ]);
      setMapData(map); setNotifications(notificationData.notifications); setAdminData(overview);
      setSelectedSeat((current) => map.seats.find((seat) => seat.id === current?.id) || null);
    } catch (error) { setToast({ message: error.message, error: true }); }
  }, [isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (!toast) return undefined; const id = setTimeout(() => setToast(null), 4200); return () => clearTimeout(id); }, [toast]);

  async function reserve() {
    if (!selectedSeat) return;
    try { setBusy(true); const result = await request("/api/bookings", { method: "POST", body: JSON.stringify({ seatId: selectedSeat.id }) }); setToast({ message: `${result.booking.seatLabel} is reserved for ${result.booking.reservedDate}.` }); await loadData(); }
    catch (error) { setToast({ message: error.message, error: true }); } finally { setBusy(false); }
  }
  async function cancel() {
    try { setBusy(true); await request("/api/bookings", { method: "DELETE" }); setToast({ message: "Your reservation has been cancelled." }); await loadData(); }
    catch (error) { setToast({ message: error.message, error: true }); } finally { setBusy(false); }
  }
  async function markNotificationsRead() { await request("/api/notifications", { method: "PATCH" }); await loadData(); }

  return <main className="app-shell">
    <header className="app-header"><Logo /><div className="header-actions">{isAdmin && <button className="notification-button" onClick={() => setShowAdminConsole((open) => !open)}>{showAdminConsole ? "Close admin" : "Admin console"}</button>}<button className="notification-button" onClick={() => setShowNotifications(true)}>Notifications{unread ? <b>{unread}</b> : null}</button><span className="user-label"><strong>{user.displayName}</strong><small>{user.role}</small></span><button className="signout-button" onClick={onLogout}>Sign out</button></div></header>
    <section className="hero"><div><p className="eyebrow">SITE 1 — MAIN OFFICE</p><h1>Choose your desk for tomorrow.</h1><p>Select a chair on the office map and make it yours for tomorrow.</p></div><div className="booking-window"><span className="window-dot" /><div><strong>Booking window</strong><span>06:00–00:00, Israel time</span></div></div></section>
    <section className="booking-layout"><div className="map-section"><div className="section-topline"><div><h2>Office map</h2><p>Find your spot for tomorrow.</p></div></div><SeatMap mapData={mapData} selectedSeatId={selectedSeat?.id} onSelect={setSelectedSeat} /></div><BookingPanel mapData={mapData} selectedSeat={selectedSeat} onReserve={reserve} onCancel={cancel} busy={busy} /></section>
    {isAdmin && showAdminConsole && <AdminConsole adminData={adminData} onRefresh={loadData} onToast={(message, error = false) => setToast({ message, error })} user={user} />}
    {showNotifications && <div className="panel-backdrop" onMouseDown={() => setShowNotifications(false)}><div onMouseDown={(event) => event.stopPropagation()}><NotificationPanel notifications={notifications} onClose={() => setShowNotifications(false)} onRead={markNotificationsRead} /></div></div>}
    {toast && <div className={toast.error ? "toast error" : "toast"}>{toast.message}</div>}
  </main>;
}

export default function Home() {
  const [state, setState] = useState({ loading: true, user: null, setupComplete: false });
  const [mode, setMode] = useState("login");

  const loadSession = useCallback(async () => {
    const data = await request("/api/me");
    setState({ loading: false, user: data.user, setupComplete: data.setupComplete });
    if (!data.setupComplete) setMode("setup");
  }, []);
  useEffect(() => { loadSession().catch(() => setState({ loading: false, user: null, setupComplete: false })); }, [loadSession]);

  async function logout() { await request("/api/auth/logout", { method: "POST" }); setState((current) => ({ ...current, user: null })); setMode("login"); }
  if (state.loading) return <main className="loading-screen"><Logo /><span>Loading PickSpot…</span></main>;
  if (!state.user) return <AuthCard mode={state.setupComplete ? mode : "setup"} setupComplete={state.setupComplete} onModeChange={setMode} onAuthenticated={loadSession} />;
  return <Dashboard user={state.user} onLogout={logout} />;
}
