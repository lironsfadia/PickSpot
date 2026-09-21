"use client";

import { useCallback, useEffect, useState } from "react";

const statusLabel = {
  available: "Available",
  occupied: "Occupied",
  blocked: "Blocked",
  mine: "Your reservation",
};

const MAP_AREAS = [
  {
    id: "blue-north", name: "West seating", shortName: "West", color: "blue", seatZone: "Blue",
    left: 3, top: 4, width: 36, height: 32,
    path: "M74 98 L727 54 L729 279 L706 310 L329 360 L74 360 Z",
    tagX: 532, tagY: 282, tagWidth: 178, deskSizes: [6, 6, 6, 6, 6, 6, 6, 6, 6], deskColumns: 7, deskOrientation: "vertical", seatOrder: "paired",
  },
  {
    id: "green-southwest", name: "East seating — A", shortName: "East A", color: "green", seatZone: "Green",
    left: 4, top: 58, width: 12, height: 18,
    path: "M65 573 L211 573 L264 676 L264 751 L65 751 Z",
    tagX: 76, tagY: 696, tagWidth: 174, deskSizes: [6, 6], deskColumns: 2, deskOrientation: "vertical", seatOrder: "paired",
  },
  {
    id: "yellow-south", name: "East seating — B", shortName: "East B", color: "yellow", seatZone: "Yellow",
    left: 15, top: 63, width: 16, height: 20,
    path: "M264 658 L473 658 L457 774 L411 774 L264 730 Z",
    tagX: 286, tagY: 715, tagWidth: 174, deskSizes: [2, 4, 2], deskColumns: 3, deskOrientation: "vertical", seatOrder: "paired", deskSeatOrders: ["paired", "paired", "first-side"],
  },
  {
    id: "green-east", name: "North seating", shortName: "North", color: "green", seatZone: "Green",
    left: 83, top: 30, width: 13, height: 50,
    path: "M1368 292 L1504 312 L1520 805 L1474 875 L1370 875 L1353 772 Z",
    tagX: 1365, tagY: 790, tagWidth: 150, deskSizes: [4, 6, 6, 6, 6], deskColumns: 1, deskOrientation: "horizontal", seatOrder: "rows", enclosedDeskCount: 2,
  },
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

function isSeatInArea(seat, area) {
  return seat.zone === area.seatZone
    && seat.x >= area.left && seat.x <= area.left + area.width
    && seat.y >= area.top && seat.y <= area.top + area.height;
}

function activateWithKeyboard(event, action) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function AreaOverview({ mapData, onAreaSelect }) {
  const areas = MAP_AREAS.map((area) => ({
    ...area,
    seats: mapData.seats.filter((seat) => isSeatInArea(seat, area)),
  }));

  return <div className="plan-overview">
    <div className="plan-guide"><span><i className="guide-seat" />Blue outlines are bookable seating</span><span><i className="guide-facility" />Facilities are shown for orientation</span><span><i className="guide-atrium" />Pink marks the open atrium</span></div>
    <div className="plan-canvas">
      <svg className="office-overview-svg" viewBox="0 0 1613 975" role="group" aria-label="Clickable office seating areas">
        <image href="/office-2d-map.png" x="0" y="0" width="1613" height="975" />
        <g className="map-facility-chip chip-red" transform="translate(704 493)">
          <rect width="146" height="44" rx="22" /><text x="73" y="28" textAnchor="middle">Reception</text>
        </g>
        <g className="map-facility-chip chip-red" transform="translate(746 176)">
          <rect width="126" height="44" rx="22" /><text x="63" y="28" textAnchor="middle">Kitchen</text>
        </g>
        <g className="map-facility-chip chip-grey" transform="translate(1002 401)">
          <rect width="205" height="44" rx="22" /><text x="102.5" y="28" textAnchor="middle">Lifts &amp; toilets</text>
        </g>
        <g className="map-facility-chip chip-blue" transform="translate(515 603)">
          <rect width="174" height="44" rx="22" /><text x="87" y="28" textAnchor="middle">Meeting rooms</text>
        </g>
        <g className="map-atrium" aria-label="Open atrium with a view down to Floor 0">
          <path d="M329 360 L711 309 L704 565 L383 585 L315 417 Z" />
          <g className="map-atrium-label" transform="translate(437 455)">
            <rect width="222" height="64" rx="14" />
            <text className="map-atrium-title" x="111" y="27" textAnchor="middle">Open atrium</text>
            <text className="map-atrium-note" x="111" y="47" textAnchor="middle">View down to Floor 0</text>
          </g>
        </g>
        {areas.map((area) => <g
          key={area.id}
          className={`overview-area area-${area.color}`}
          role="button"
          tabIndex="0"
          onClick={() => onAreaSelect(area.id)}
          aria-label={`Open ${area.name}, ${area.seats.length} seats`}
          onKeyDown={(event) => activateWithKeyboard(event, () => onAreaSelect(area.id))}
        >
          <path d={area.path} />
          <g className="overview-area-tag" transform={`translate(${area.tagX} ${area.tagY})`}>
            <rect width={area.tagWidth} height="61" rx="13" />
            <text className="overview-area-name" x="16" y="25">{area.shortName}</text>
            <text className="overview-area-count" x="16" y="45">{area.seats.length} seats · View area</text>
            <text className="area-chevron" x={area.tagWidth - 19} y="37" textAnchor="middle">›</text>
          </g>
        </g>)}
      </svg>
    </div>
    <div className="area-shortcuts" aria-label="Seating area shortcuts">
      {areas.map((area) => <button key={area.id} type="button" onClick={() => onAreaSelect(area.id)}>
        <span className={`area-shortcut-icon area-${area.color}`} aria-hidden="true" />
        <span><strong>{area.shortName}</strong><small>{area.seats.length} seats</small></span>
        <b aria-hidden="true">›</b>
      </button>)}
    </div>
  </div>;
}

function AlignedSeat({ seat, selected, onSelect, side }) {
  const inaccessible = seat.status === "blocked" || seat.status === "occupied";
  return <button
    type="button"
    className={`aligned-seat status-${seat.status} ${selected ? "selected" : ""}`}
    aria-label={`${seat.label}, ${statusLabel[seat.status]}`}
    disabled={inaccessible}
    onClick={() => onSelect(seat)}
    title={`${seat.label}: ${statusLabel[seat.status]}`}
  >
    <span className={`aligned-chair-shape chair-${side}`} aria-hidden="true"><i /></span>
    <small>{seat.label}</small>
  </button>;
}

function splitDeskRows(seats, seatOrder) {
  if (seatOrder === "first-side") {
    return { top: seats, bottom: [] };
  }
  if (seatOrder === "paired") {
    return {
      top: seats.filter((_, index) => index % 2 === 0),
      bottom: seats.filter((_, index) => index % 2 === 1),
    };
  }
  const middle = Math.ceil(seats.length / 2);
  return { top: seats.slice(0, middle), bottom: seats.slice(middle) };
}

function DeskCluster({ number, seats, seatOrder, orientation, selectedSeatId, onSelect }) {
  const rows = splitDeskRows(seats, seatOrder);
  const firstSide = orientation === "vertical" ? "left" : "top";
  const secondSide = orientation === "vertical" ? "right" : "bottom";
  return <section className={`aligned-desk orientation-${orientation} seats-${seats.length}`} aria-label={`Desk ${number}, ${orientation}`}>
    <div className={`aligned-chair-row side-${firstSide}`}>
      {rows.top.map((seat) => <AlignedSeat key={seat.id} seat={seat} side={firstSide} selected={selectedSeatId === seat.id} onSelect={onSelect} />)}
    </div>
    <div className="aligned-desk-surface"><span>Desk {number}</span></div>
    <div className={`aligned-chair-row side-${secondSide}`}>
      {rows.bottom.map((seat) => <AlignedSeat key={seat.id} seat={seat} side={secondSide} selected={selectedSeatId === seat.id} onSelect={onSelect} />)}
    </div>
  </section>;
}

function AreaMap({ mapData, area, selectedSeatId, onSelect }) {
  const seats = mapData.seats.filter((seat) => isSeatInArea(seat, area)).sort((a, b) => a.id - b.id);
  let offset = 0;
  const desks = area.deskSizes.map((size, index) => {
    const desk = { number: index + 1, seats: seats.slice(offset, offset + size) };
    offset += size;
    return desk;
  }).filter((desk) => desk.seats.length);
  const renderDesk = (desk) => <DeskCluster
    key={desk.number}
    number={desk.number}
    seats={desk.seats}
    seatOrder={area.deskSeatOrders?.[desk.number - 1] || area.seatOrder}
    orientation={area.deskOrientation}
    selectedSeatId={selectedSeatId}
    onSelect={onSelect}
  />;
  const enclosedDesks = desks.slice(0, area.enclosedDeskCount || 0);
  const openDesks = desks.slice(area.enclosedDeskCount || 0);
  return <div className={`aligned-map-frame area-${area.id}`}>
    <div className="aligned-map-heading"><span>Same desk direction as the office plan · slight angles straightened</span><strong>{seats.length} bookable seats</strong></div>
    <div className={`aligned-floor-plan area-${area.id} orientation-${area.deskOrientation}`} style={{ "--desk-columns": area.deskColumns }} role="group" aria-label={`${area.name} aligned seat map`}>
      {enclosedDesks.length > 0 && <section className="enclosed-desk-room" aria-labelledby={`${area.id}-room-label`}>
        <div className="enclosed-room-heading" id={`${area.id}-room-label`}><strong>Closed room</strong><span>{enclosedDesks.length} desks</span></div>
        <div className="enclosed-room-desks">{enclosedDesks.map(renderDesk)}</div>
      </section>}
      {openDesks.map(renderDesk)}
    </div>
  </div>;
}

function SeatMap({ mapData, activeArea, selectedSeatId, onSelect, onAreaSelect }) {
  if (!mapData?.site) return <div className="map-loading">Loading the office map…</div>;
  return activeArea
    ? <AreaMap mapData={mapData} area={activeArea} selectedSeatId={selectedSeatId} onSelect={onSelect} />
    : <AreaOverview mapData={mapData} onAreaSelect={onAreaSelect} />;
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
  const [activeAreaId, setActiveAreaId] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdminConsole, setShowAdminConsole] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const isAdmin = user.role === "admin" || user.role === "owner";
  const unread = notifications.filter((item) => !item.readAt).length;
  const activeArea = MAP_AREAS.find((area) => area.id === activeAreaId) || null;

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
    <section className="hero"><div><p className="eyebrow">SITE 1 — MAIN OFFICE</p><h1>Choose your desk for tomorrow.</h1><p>Choose West, East, or North seating, then select a chair.</p></div><div className="booking-window"><span className="window-dot" /><div><strong>Booking window</strong><span>06:00–00:00, Israel time</span></div></div></section>
    <section className="booking-layout"><div className="map-section"><div className="section-topline"><div><h2>{activeArea ? activeArea.name : "Office map"}</h2><p>{activeArea ? "Click a chair to select it." : "Choose a seating area to open a straight, aligned seat view."}</p></div>{activeArea ? <div className="map-tools"><Legend /><button type="button" className="back-to-map" onClick={() => setActiveAreaId(null)}>← Back to office map</button></div> : <span className="map-prompt">Click a seating area</span>}</div><SeatMap mapData={mapData} activeArea={activeArea} selectedSeatId={selectedSeat?.id} onSelect={setSelectedSeat} onAreaSelect={setActiveAreaId} /></div><BookingPanel mapData={mapData} selectedSeat={selectedSeat} onReserve={reserve} onCancel={cancel} busy={busy} /></section>
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
