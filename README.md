# Hotspot

Hotspot is an internal office seat-booking application. Employees can sign in, choose an office area, and reserve an available seat for a day. Administrators can review bookings, manage users, rename seats, and block or unblock seats.

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

The SQLite database is created locally in `data/seat-hub.db`. It is intentionally excluded from Git because it contains user and booking data.

## Production check

```bash
npm run build
npm start
```

## Current scope

- Email and password sign-in
- Daily seat reservations
- Interactive office-area map
- Booking cancellation and changes
- Admin-only user, seat, and booking management
- SQLite storage for internal-network deployment
