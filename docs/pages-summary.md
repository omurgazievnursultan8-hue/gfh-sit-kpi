# GFH KPI System — Pages Summary for Prototype

**System:** OAO "Государственный финансовый холдинг" — KPI evaluation system  
**Stack:** React SPA, sidebar layout, bilingual (ru/kg), Tailwind CSS + shadcn/ui  
**Total distinct page designs: 25**

---

## Layout types

| Type | Description |
|---|---|
| **Public** | Full-screen centered card, no sidebar, no header |
| **App** | Left sidebar (dark, 256px) + fixed top header + main content area |
| **Admin** | Separate admin sidebar (all admin sections) + main content area |

---

## GROUP 1 — Auth / Public Pages (5 pages)

No sidebar. Centered card on gray background.

| # | Page | Route | Who sees it |
|---|---|---|---|
| 1 | **Login** | `/login` | Everyone (unauthenticated) |
| 2 | **Forgot Password** | `/forgot-password` | Everyone (unauthenticated) |
| 3 | **Reset Password** | `/reset-password?token=...` | Everyone (via email link) |
| 4 | **Forced Change Password** | `/change-password` | Any user whose password has expired |
| 5 | **PDPA Consent** | `/pdpa-consent` | First-time login users only |

### Page details

**1. Login**
- Fields: email, password
- Link: "Forgot password" → `/forgot-password`
- On submit: redirect to `/change-password` if `passwordExpired`, to `/pdpa-consent` if `pdpaRequired`, else to `/dashboard`
- Shows error message on failed login

**2. Forgot Password**
- Single email input + "Send link" button
- On success: shows green confirmation text + "Back to login" link

**3. Reset Password**
- Single "New password" field (min 10 chars)
- On success: redirect to `/login` with success message

**4. Forced Change Password**
- Fields: current password, new password, confirm password
- Amber warning banner: "Your password has expired"
- On success: redirect to `/dashboard`

**5. PDPA Consent**
- Scrollable consent text box (max-h-64, overflow-y-auto)
- Checkbox: "I agree to data processing"
- Button "Accept and continue" (disabled until checked)

---

## GROUP 2 — Main App Pages (17 pages)

All use App layout: dark left sidebar + fixed header with role label, user email, language switcher, logout.

**Sidebar nav items (visible by role):**

| Nav item | Route | Visible to |
|---|---|---|
| Dashboard | `/dashboard` | All |
| My Evaluations | `/my-evaluations` | All |
| Manager To-Do | `/manager-todo` | CHAIRMAN, DEPUTY_CHAIRMAN, HEAD_OF_DEPARTMENT, HEAD_OF_DEPARTMENT_UNIT |
| Manager Dashboard | `/manager-dashboard` | CHAIRMAN, DEPUTY_CHAIRMAN, HEAD_OF_DEPARTMENT, HEAD_OF_DEPARTMENT_UNIT |
| Hierarchical Analytics | `/analytics/hierarchical` | ADMIN, CHAIRMAN, DEPUTY_CHAIRMAN, HEAD_OF_DEPARTMENT, HEAD_OF_DEPARTMENT_UNIT |
| Anti-Bonus Analytics | `/analytics/anti-bonus` | ADMIN, CHAIRMAN, DEPUTY_CHAIRMAN, HEAD_OF_DEPARTMENT, HEAD_OF_DEPARTMENT_UNIT |
| Criteria | `/criteria` | ADMIN, CHAIRMAN, DEPUTY_CHAIRMAN, HEAD_OF_DEPARTMENT, HEAD_OF_DEPARTMENT_UNIT |
| Users | `/users` | ADMIN |
| Org Structure | `/org` | ADMIN, CHAIRMAN |
| Delegations | `/delegations` | ADMIN |
| Settings | `/settings` | ADMIN |
| Production Calendar | `/calendar` | ADMIN |
| Notifications | `/notifications` | All |
| Audit Log | `/audit` | ADMIN, CHAIRMAN |

---

| # | Page | Route | Who sees it |
|---|---|---|---|
| 6 | **Personal Dashboard** | `/dashboard` | All authenticated users |
| 7 | **My Evaluations List** | `/my-evaluations` | All (employee sees own; manager sees own as evaluatee) |
| 8 | **Evaluation Detail + Reaction** | `/my-evaluations/:id` | Employee (evaluatee) |
| 9 | **Appeal Form** | `/my-evaluations/:id/appeal` | Employee after clicking DISAGREE |
| 10 | **Evaluation Form** (score entry) | `/evaluations/:id` | Evaluators (managers filling in scores) |
| 11 | **Manager To-Do** | `/manager-todo` | Managers with pending evaluations |
| 12 | **Manager Dashboard** | `/manager-dashboard` | Managers |
| 13 | **Hierarchical Analytics** | `/analytics/hierarchical` | ADMIN + managers |
| 14 | **Anti-Bonus Analytics** | `/analytics/anti-bonus` | ADMIN + managers |
| 15 | **Criteria Management** | `/criteria` | ADMIN + managers |
| 16 | **System Settings** | `/settings` | ADMIN |
| 17 | **Production Calendar** | `/calendar` | ADMIN |
| 18 | **User Management** | `/users` | ADMIN |
| 19 | **Org Structure** | `/org` | ADMIN, CHAIRMAN |
| 20 | **Delegations** | `/delegations` | ADMIN |
| 21 | **Notifications List** | `/notifications` | All |
| 22 | **Audit Log** | `/audit` | ADMIN, CHAIRMAN |

### Page details

**6. Personal Dashboard** (`/dashboard`)
- Large colored rating badge: green ≥80, yellow 60–79, red <60
- Breakdown bar: positive contribution vs anti-bonus deductions
- Recharts LineChart: rating over last 12 periods
- Reference lines: department avg, company avg
- Export buttons (Excel, PDF)

**7. My Evaluations List** (`/my-evaluations`)
- Paginated table: period name, type (MONTHLY/QUARTERLY/ANNUAL), status badge, score, date
- Status values: DRAFT, SUBMITTED, ACKNOWLEDGED, APPEALED, CLOSED
- Click row → go to `/my-evaluations/:id`

**8. Evaluation Detail + Reaction** (`/my-evaluations/:id`)
- Score breakdown: positive criteria list with scores, anti-bonus list with deductions
- Final rating displayed prominently
- Reaction buttons: "AGREE" (green) / "DISAGREE" (red) — only when status=SUBMITTED
- If DISAGREE was clicked: "File Appeal" button appears

**9. Appeal Form** (`/my-evaluations/:id/appeal`)
- Text area for appeal reason (required)
- File attachment upload (optional)
- Submit button + back to evaluation link

**10. Evaluation Form** (`/evaluations/:id`)
- Two sections: Positive Criteria / Anti-Bonus Criteria
- Each criterion: name, description, numeric score input
- Live score preview (dry-run result updates on input change)
- Autosave banner ("Draft saved at HH:MM")
- File attachment section (upload evidence files)
- "Submit" button → confirmation dialog

**11. Manager To-Do** (`/manager-todo`)
- Sections grouped by period type (MONTHLY / QUARTERLY / ANNUAL)
- Per group: progress bar (X submitted / Y total), list of pending employee evaluations
- Each row: employee name, link to evaluation form
- Separate section: "Pending Appeal Responses" (appeals awaiting manager reaction)
- ADMIN only: "Force-close period" button on overdue periods

**12. Manager Dashboard** (`/manager-dashboard`)
- Progress bar: current period completion (submitted/total)
- Subordinates table: name, score (color-coded), evaluation status
- Top-3 performers highlight card (green)
- Bottom-3 performers highlight card (red/amber)
- Export buttons

**13. Hierarchical Analytics** (`/analytics/hierarchical`)
- Filter bar: org unit selector dropdown, period type, date range
- View mode toggle: Table | Bar Chart | Tree | Heatmap (4 modes)
- Table mode: unit name, avg score, employee count, completion %
- Bar chart mode: Recharts BarChart, bars colored by score
- Tree mode: recursive expandable tree with score badges
- Heatmap mode: CSS grid, cells colored by score intensity
- Click any unit → drill-down modal with employee list
- Comparison mode: select 2 units, show side by side
- Export buttons

**14. Anti-Bonus Analytics** (`/analytics/anti-bonus`)
- Filter bar: org unit dropdown, period type selector
- Top-10 table: employee name, unit, total anti-bonus deductions, top offending criterion
- Tabs: "Distribution" | "Dynamics"
- Distribution tab: Recharts BarChart (score buckets)
- Dynamics tab: Recharts LineChart per criterion over 12 periods
- Export buttons

**15. Criteria Management** (`/criteria`)
- Two tabs: "Positive" | "Anti-Bonus"
- Positive tab: weight sum progress bar (green ≤80%, yellow 80–95%, red >95%)
- Table: criteria name (ru/kg), weight %, scope (global/unit), status badge, actions
- "Show inactive" toggle reveals deactivated criteria
- "Add criterion" button → modal form
- Modal fields: name RU, name KG, weight, scope (global or select org unit), is_penalty flag

**16. System Settings** (`/settings`)
- Inline-editable key-value table
- Columns: setting key, current value (click to edit inline), description
- Press Enter or click checkmark to save; Esc to cancel

**17. Production Calendar** (`/calendar`)
- Year selector (dropdown or prev/next arrows)
- 12-column grid (Jan–Dec), each cell shows working days count
- ADMIN: click cell → inline input to edit working days count
- Read-only for non-ADMIN

**18. User Management** (`/users`)
- Search/filter bar (by name, email, role, status)
- Paginated table: full name, email, role badge, position, department, status badge, actions
- Actions per row: Edit, Deactivate/Reactivate, Reset Password
- "Create user" button → modal form
- Modal fields: full name, email (create only), role dropdown, position, org unit, manager

**19. Org Structure** (`/org`)
- Expandable/collapsible tree
- Each node: type badge (BLOCK / DEPARTMENT / UNIT), name, manager name
- Hover → show Edit / Add child / Delete icon buttons
- "Add block" button at top
- Modal for create/edit: name, type, parent unit, manager

**20. Delegations** (`/delegations`)
- "Active only" filter checkbox
- Paginated table: evaluatee name, delegate (evaluator) name, date range, status badge, Deactivate button
- "New delegation" button → modal: select evaluatee, select evaluator, start/end date

**21. Notifications List** (`/notifications`)
- Full list of notifications (paginated)
- Each row: icon, message text, timestamp, read/unread indicator
- "Mark all read" button
- (Bell icon in header shows unread count badge + dropdown with last 10 — this is a header component, not a separate page)

**22. Audit Log** (`/audit`)
- Filter bar: actor email (text), action (dropdown), entity type (dropdown), date from/to
- Paginated table: timestamp, actor email, action, entity type, entity ID, details
- "Export Excel" button (downloads filtered result)

---

## GROUP 3 — Admin Panel Pages (3 additional designs)

Uses AdminLayout: separate admin sidebar with icons linking to all admin sections.

Admin sidebar links: Users · Org Structure · Criteria · Periods · Delegations · Settings · Calendar · Audit Log · Monitoring

| # | Page | Route | Notes |
|---|---|---|---|
| 23 | **Admin Dashboard** | `/admin` | Stats landing page |
| 24 | **Evaluation Periods** | `/admin/periods` | Manage evaluation periods (create, activate, close) |
| 25 | **Admin Monitoring** | `/admin/monitoring` | System health + Quartz jobs + error logs |

> **Note:** `/admin/users`, `/admin/org`, `/admin/criteria`, `/admin/delegations`, `/admin/settings`, `/admin/calendar`, `/admin/audit` reuse the same page components from Group 2 (pages 18, 19, 20, 15, 16, 17, 22), wrapped in AdminLayout.

### Page details

**23. Admin Dashboard** (`/admin`)
- Stat cards: total users, active users, current period evaluations (submitted/total), pending appeals, open delegations
- Each card has icon, number, label

**24. Evaluation Periods** (`/admin/periods`)
- Paginated table: period name, type (MONTHLY/QUARTERLY/ANNUAL), start/end date, status (DRAFT/ACTIVE/CLOSED), progress (X/Y submitted)
- Actions: Activate (DRAFT→ACTIVE), Force-close (ACTIVE→CLOSED)
- "Create period" button → modal: name, type, start/end date, assign evaluations

**25. Admin Monitoring** (`/admin/monitoring`)
- Panel 1 — Health: green "System operational" card (if API responds) or red error
- Panel 2 — Quartz Jobs: table of scheduled jobs: name, cron expression, last fire time, next fire time, state (NORMAL/PAUSED/ERROR)
- Panel 3 — Error Logs: scrollable code block with last 20 error log lines
- "Refresh" button reloads all three panels

---

## Summary table

| Group | Count | Description |
|---|---|---|
| Auth / Public | 5 | Login, forgot/reset/change password, PDPA consent |
| Main App | 17 | Dashboard, evaluations, analytics, management pages |
| Admin Panel (new) | 3 | Admin landing, periods management, monitoring |
| **Total** | **25** | **Distinct page designs** |

---

## User roles and their accessible pages

| Role | Pages accessible |
|---|---|
| **EMPLOYEE** | Login flows, Dashboard, My Evaluations, Evaluation Detail, Appeal, Notifications |
| **HEAD_OF_DEPARTMENT_UNIT** | + Evaluation Form, Manager To-Do, Manager Dashboard, Hierarchical Analytics, Anti-Bonus Analytics, Criteria (read) |
| **HEAD_OF_DEPARTMENT** | Same as above |
| **DEPUTY_CHAIRMAN** | Same as above |
| **CHAIRMAN** | + Org Structure (read), Audit Log |
| **ADMIN** | All pages including Users, Org, Delegations, Settings, Calendar, full Audit, Admin Panel |
