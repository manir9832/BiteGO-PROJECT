# BiteGo — Product Requirements & Build Log

## Original Problem Statement
Production-ready food-delivery platform "BiteGo" comprising exactly 3 mobile apps
(Customer, Restaurant, Delivery Partner) + 1 Admin web website, on one shared
secure backend + MongoDB. Strict no-dummy-production-data. Two SEPARATE
admin-controlled delivery-rate systems (Customer Delivery Charge vs Delivery
Partner Earning). Dynamic multi service-area management. COD only. OTP login.
Historical order integrity. Backend authoritative for all money/business rules.

## User Choices (confirmed)
- Build Customer app first, end-to-end.
- Mobile roles kept as separate apps (phased).
- OTP: dev/test flow now (OTP returned in API response); Rainflair SMS later.
- Images: Cloudinary (user to provide keys) — deferred; not needed for customer MVP.
- DB/Maps: MongoDB Atlas string + Google Maps key to be provided at deploy;
  currently local Mongo + haversine distance (backend authoritative).

## Architecture
- Backend: FastAPI + Motor (tz-aware) + MongoDB. Modules:
  - `config.py` (env + default business settings), `db.py` (client, indexes, defaults, first-admin),
    `security.py` (OTP hashing, JWT access+refresh, RBAC), `finance.py` (haversine + money),
    `common.py` (serialization, order state machine, notify/audit),
    `server.py` (auth, customer, discovery, orders, notifications),
    `routes_ops.py` (restaurant + delivery partner APIs),
    `routes_admin.py` (admin dashboard/settings/service-areas/management/settlements/seed).
  - All routes under `/api`. JWT persistent (1d access / 60d refresh, rotating).
- Frontend (Customer): Expo Router. `src/` theme, api client (auto-refresh),
  contexts (auth, cart with one-restaurant rule, location, toast), components, screens.
- Design: Warm Sand & Cinnamon palette, Plus Jakarta Sans, bottom tabs.

## Financial engine (verified)
- Customer delivery: ₹19 first km + ₹8 per additional started km (ceil). 
  0.8→19,1→19,1.01→27,2→27,2.01→35,3→35,3.01→43,4.2→51.
- Partner earning: admin slabs 1=15,2=19,3=28,4=35,5=42 (ceil km; extrapolates beyond).
- 3km → customer ₹35 / partner ₹28 (independent, never derived from each other). ✅
- Platform charge ₹7 default. Commission 0% / fixed fee ₹0 default.
- Order stores immutable snapshot + settings_snapshot; admin settings changes affect
  only future orders (verified: platform_charge 7→9 leaves historical order at 7).

## Implemented (2026-08-30)
### Backend (all roles) — tested 20/20 pytest
- Auth: OTP request/verify (dev_otp), rate limit + resend cooldown, refresh rotation, /me, admin email+password login, first-admin on startup, RBAC.
- Customer: profile, addresses CRUD + default, favorites, discovery (restaurants by location w/ priority & max radius, categories, restaurant+menu, search, food), service-area match.
- Orders: authoritative quote + create (idempotent client_order_id, service-area & availability validation, price snapshots), list (active/completed/cancelled), track, cancel, reorder-check, review (updates rating).
- Restaurant API: register (pending→admin approve), profile/hours/open toggle, dashboard, orders, accept/reject/preparing/ready, menu CRUD, earnings, reviews.
- Delivery API: register, online/offline, requests (area+online gated), atomic accept (race-safe 409), pickup/start/deliver, live location, active, earnings (shows partner earning).
- Server-side 20-min restaurant accept timeout (background worker, works app-closed).
- Order state machine with guarded transitions + full timeline (actor/system + timestamps).
- Admin: dashboard, settings GET/PUT (incl. earning slabs), service-areas CRUD (soft-delete), restaurant/partner/customer management (approve/reject/suspend), order management, today settlements (seller + partner payable), categories, reviews moderation, audit logs, broadcast, dev seed.

### Customer App (Expo) — flow verified via automation
- Login → OTP → complete profile (name + location/address).
- Home discovery (glass sticky header, location selector, search, category chips, restaurant cards with scrims, favorites, pull-to-refresh, empty/error/area-unavailable states).
- Search (debounced restaurants + dishes), Restaurant profile + menu + reviews + steppers.
- Cart (one-restaurant rule with clear-cart modal) + Checkout (address select, backend-quoted bill, COD) with duplicate-tap protection.
- Order tracking (8-step timeline) + invoice + cancel + rating/review; Orders tab (active/completed/cancelled) + reorder.
- Profile, Addresses CRUD, Favorites, Notifications, Change location, Edit profile, Help & Support (helpline 9832413545 call), About/Privacy/Terms.

## Backlog (prioritized)
- P0: Restaurant App UI (new-order loud alert, accept within 20m, menu mgmt, earnings).
- P0: Delivery Partner App UI (online toggle, request accept, navigate, live location, earnings showing partner rate).
- P0: Admin Website UI (dashboard, approvals, dual delivery-rate settings, service areas, settlements/export, offers/coupons, notifications, moderation, audit).
- P1: Rainflair SMS OTP integration (provider seam ready), Cloudinary image upload, Google Maps live map/route, push notifications, WebSocket realtime.
- P1: Offers/coupons apply at checkout; settlement record-payment + export.
- P2: Reviews for delivery partner separate; multi-language (Bengali) polish.

## Test Credentials — see /app/memory/test_credentials.md
Admin admin@bitego.app / BiteGoAdmin@123. Seed via POST /api/admin/seed.

## Milestone 2 (2026-08-30) — All 4 apps complete
- Restaurant App (Expo, role=restaurant): registration→admin approval, Orders (New/Active/Completed) with **loud new-order alert** (looping sound via expo-audio + vibration + modal, acknowledged to silence), Accept/Reject/Preparing/Ready, Menu CRUD + availability toggle, Earnings, Profile open/close toggle.
- Delivery Partner App (role=delivery): registration→approval, Online/Offline toggle, New Requests showing **admin-configured partner earning (not customer charge)**, atomic Accept, Pickup→Start→Deliver, live location updates, Earnings (today/total/history), Profile.
- Admin Website (role=admin, desktop-first web): top-nav shell; Dashboard (real counts + payable), Restaurants/Partners/Customers management, Orders (full breakdown incl. partner earning + margin + timeline), **Settings with TWO independent rate cards** (Customer Delivery Charge vs Delivery Partner Earning slabs), Service Areas CRUD (soft-delete), Settlements (seller-wise + partner-wise daily payable).
- Auth generalized: role-based login (customer/restaurant/delivery OTP + admin email/password); index routes by role.
- Restaurant accept timeout changed to **10 minutes** (server-side worker) per updated instruction.
- Bug fixed: OTP rate-limit upsert DuplicateKeyError on expired window.
- Verified: 21/21 backend pytest; full cross-app lifecycle (customer→restaurant→delivery→admin) on one backend; 3km → customer ₹35 / partner ₹28 kept distinct.

## Next Tasks
Optional polish: Rainflair SMS, Cloudinary uploads, push notifications, offers/coupons at checkout, settlement record-payment + export.

## Milestone 3 (2026-06) — Google Maps integration
- Backend: `maps.py` calls Google Routes API (httpx, TWO_WHEELER, field mask) for authoritative delivery distance; used in `/orders/quote` + `/orders`. Haversine fallback keeps ordering working if API disabled/unavailable. Orders now store `route_polyline`, `distance_source`, `eta_seconds`. New auth endpoint `POST /api/maps/route`. Dual-rate math unchanged. Key via `GOOGLE_MAPS_SERVER_KEY` env (never client-exposed).
- Frontend: `react-native-maps` (native) + Google Maps JS (`@googlemaps/js-api-loader` v2 functional API) for web via `src/components/AppMap.tsx` / `AppMap.web.tsx`; polyline decoder util. Maps added to: Customer order tracking + location picker, Delivery active-delivery card, Restaurant order detail, Admin service-areas (overview + tap-to-set map). Native keys injected via `app.config.js` from `EXPO_PUBLIC_GOOGLE_MAPS_*`.
- Backend tested: 27/27 pytest (iteration_3) incl. Haversine fallback, dual-rate 35 vs 28 preserved, full lifecycle.
- BLOCKER (user action): the provided GCP key's project has all Maps APIs DISABLED (Routes API + Maps JavaScript API `ApiNotActivatedMapError` + Maps SDK Android/iOS). User must enable them + billing for maps to render and real road distance to compute. Code is complete and auto-activates once enabled.

## Milestone 4 (2026-06) — Image uploads + logout fix
- Image storage: **Emergent Managed Object Storage** (Cloudinary keys were requested by user but never provided; managed storage needs none and meets all functional needs). `backend/storage.py` (init/put/get), `POST /api/upload` (auth restaurant/admin, multipart, 8MB/type limits), public `GET /api/files/{path}`. `PUT /api/admin/restaurants/{rid}/media` for admin banner change.
- Frontend `ImageUpload` (expo-image-picker, permission-safe, web-blob + native branches). Replaced ALL image-URL text fields: Restaurant register (logo+banner), menu-edit (food image), profile (change banner/logo), Admin restaurants (change banner). Uploaded images render in Customer app; dummy Unsplash placeholders removed (neutral icon fallback). `uploadImage()` in src/api.ts.
- Logout bug fixed globally: `logout()`/session-expiry now `router.replace('/(auth)/login')` — fixes reported Restaurant logout.
- Tested: 40/40 backend pytest (iteration_4), incl. auth gating, serve, restaurant→customer image visibility, logout revocation, order-flow regression. Web upload verified via admin banner UI.
- PENDING user input: (1) MongoDB Atlas connection string (currently platform-managed local Mongo, NOT Atlas); (2) Cloudinary keys if they still want Cloudinary instead of Object Storage.

## Admin login: admin@bitego.app / BiteGoAdmin@123

