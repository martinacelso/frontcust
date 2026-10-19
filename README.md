# Frontcust

React/Vite hotel booking and staff-management application with an Express/Mongoose API.

## Requirements

- Node.js 20.19 or later, or 22.12 or later.
- A MongoDB deployment that supports transactions. MongoDB Atlas is recommended; a standalone local server does not support the transactions this app requires.

## Configure MongoDB Atlas

1. Create a MongoDB Atlas project and a cluster (the free shared cluster is sufficient for development).
2. In **Database Access**, create a database user and save its password. This database user is separate from your app admin account.
3. In **Network Access**, add your current IP address. Avoid allowing access from anywhere (`0.0.0.0/0`) unless you understand the exposure and have a specific reason.
4. In the cluster's **Connect** screen, choose **Drivers** and copy the Node.js connection string. Replace all placeholders with the database username, password (URL-encode special characters), and cluster host. Include the `frontcust` database name.
5. Create `server/.env` and set:

   ```env
   MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/frontcust?retryWrites=true&w=majority
   SESSION_SECRET=replace-with-a-random-secret-of-at-least-64-characters
   PORT=5000
   DEMO_PAYMENTS=true
   ```

   Generate a session secret with:

   ```cmd
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Keep `.env` private; it is ignored by Git.

6. Verify the Atlas connection. From the `server` folder, run:

   ```cmd
   npm run check:database
   ```

   Continue only when it prints `Transaction-capable topology: YES`.

## Install and run

Open two terminals from the project folder.

Backend:

```cmd
cd server
npm install
npm run check:database
npm start
```

If the database check fails, use its error category to check the Atlas URI, database-user credentials, cluster status, and Network Access IP allowlist. Stop the backend with `Ctrl+C`, rerun `npm run check:database` from `server`, and start the backend with `npm start` after the check succeeds.

Frontend:

```cmd
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`. The Vite `/api` proxy forwards requests to `http://127.0.0.1:5000`.

Check the backend/database at `http://127.0.0.1:5000/api/health`.

## Initialize database records

Create an administrator by temporarily adding all three of these entries to `server/.env` (replace the example values with your own; do not include angle brackets):

```env
ADMIN_NAME=Your Full Name
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=your-unique-password-of-at-least-12-characters
```

Then run:

```cmd
cd server
npm run create-admin
```

Remove the three `ADMIN_*` values from `.env` afterward. Import the starter room catalog and inventory with:

```cmd
npm run seed:rooms
```

New rooms are marked dirty and need inspection/cleaning before check-in.

## Persistence and record lifecycle

Accounts, rooms, room types, bookings, staff, audit entries, guest inbox messages, and simulated payment records are stored in MongoDB. Inventory and reservation screens read from the API rather than local demo arrays.

Delete actions preserve database history:

- Rooms and room types are archived and can be restored. A room with an active reservation cannot be archived; archive its rooms before archiving a room type.
- Guest accounts are disabled, not erased. Staff accounts can be disabled and re-enabled.
- Cancelled or expired bookings can be archived. Only active unpaid booking holds can be edited.
- Audit entries and generated booking messages are retained; audit entries can be archived, and inbox messages can be archived per guest.
- Payment method and generated demo references are stored with bookings. The demo checkout does not collect card, wallet, or bank details and does not charge or transfer money. Payments, refunds, and balance settlements are not real transactions and should not be edited or deleted as if they were a financial ledger.

No payment gateway or SMTP email provider is configured by default. `DEMO_PAYMENTS=true` enables simulated checkout, refunds, balance settlement, and walk-in deposits for classroom/test demonstrations only. Restart the backend after changing it.

### Password reset email

Password reset links are delivered by SMTP. Add the SMTP settings for an email provider to `server/.env`; for example:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-sending-email@example.com
SMTP_PASSWORD=your-provider-app-password
SMTP_FROM=Twin Lakes Hotel <your-sending-email@example.com>
APP_ORIGIN=http://localhost:5173
```

Use the provider's SMTP hostname, port, and credentials; for Gmail, use an app password rather than your normal account password. Set `SMTP_SECURE=false` when using port 587 with STARTTLS. For production, set `APP_ORIGIN` to the public HTTPS frontend URL. Keep SMTP credentials private and restart the backend after updating `.env`.

Reset links expire after 30 minutes and can be used once. A reset request intentionally shows the same confirmation whether or not an active account exists. If SMTP settings are missing, the form reports that configuration is required; if delivery fails, check the backend log and your provider's SMTP settings. Booking notifications remain in the app inbox and are not sent through SMTP.

## Validation

```cmd
npm run build
npm run lint
cd server
npm test
```
