# User and Role Management — PRAJA

## Purpose
This screen lets an admin manage the three core PRAJA user types: citizens, officers, and admins. It should make it easy to create, review, update, activate, suspend, and assign roles without leaving the admin area.[cite:3][cite:10][cite:17]

## Screen goal
The goal is to give the admin clear control over who can access the system and what each person can do. This screen should support clean role governance, which is essential for a complaint platform that separates citizen access from operational staff access.[cite:3][cite:17][cite:20]

## Tech context
Build this screen using Next.js, Tailwind CSS, and TypeScript so it stays consistent with the rest of PRAJA.[cite:2][cite:11] The admin data and user records can be stored and updated in Supabase, with role permissions enforced through the backend.[cite:2][cite:7]

## User types to manage
The screen should organize users into these groups:

- Citizens.
- Officers.
- Admins.

You may also add a fourth group later for supervisors or department heads if the workflow expands.

## Core functions
The screen should support:

- Search users by name, phone, email, or ID.
- Filter by role.
- Filter by status.
- View profile details.
- Edit role or permissions.
- Activate or suspend accounts.
- Reset access credentials if needed.
- Assign or reassign officers to wards or departments.

These controls help the admin keep the PRAJA system organized and secure.[cite:10][cite:17]

## Recommended layout
A practical layout is:

### 1. Header
Include:

- Screen title: `User & Role Management`
- Search bar
- Add user button, if needed
- Role filter dropdown
- Status filter dropdown

### 2. Summary cards
Show a quick overview of the user base:

- Total citizens.
- Total officers.
- Total admins.
- Suspended accounts.
- Unassigned officers.

### 3. User table or card list
Show users in a searchable table for desktop or responsive cards for mobile.

Suggested table columns:

- Name.
- Role.
- Department or ward.
- Contact.
- Status.
- Last login.
- Actions.

### 4. Side panel or detail modal
When a user is opened, show:

- Full profile.
- Assigned ward or department.
- Current permissions.
- Status history.
- Notes.

## Admin actions
Useful actions per user:

- View profile.
- Edit role.
- Suspend / activate.
- Assign ward.
- Assign department.
- Promote to admin, if allowed.
- Reset password or send invite.

For the demo, it is enough to show role editing and activation status changes.

## Role rules
The admin screen should clearly enforce the PRAJA hierarchy:

- Citizens can submit and track complaints.
- Officers can view and resolve assigned complaints.
- Admins can oversee the full system.[cite:3][cite:10][cite:17]

This makes the platform safer and easier to reason about.

## Visual style
Keep the screen official and structured.

Suggested style direction:

- White cards on a light slate background.
- Clear role badges.
- Status chips.
- Minimal icon usage.
- Strong table spacing.
- Modal or drawer for edits.

## Mobile guidance
On mobile:

- Use stacked user cards instead of a dense table.
- Put search first.
- Keep role filters visible.
- Move detailed editing into a full-screen sheet or modal.

## Component breakdown
Suggested reusable components:

- `UserManagementHeader`
- `RoleFilterBar`
- `UserSummaryCards`
- `UserTable`
- `UserCardList`
- `UserDetailDrawer`
- `RoleEditModal`
- `AccessStatusToggle`

This modular structure fits well with Next.js + TypeScript and makes the screen easy to extend.[cite:11]

## Tailwind structure suggestion

```tsx
export default function UserRoleManagementPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* header, summary, table, detail panel */}
        </div>
      </section>
    </main>
  )
}
```

Useful classes:

- `space-y-6`
- `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`
- `rounded-2xl border border-slate-200 bg-white shadow-sm`
- `overflow-x-auto`
- `sticky top-4`

## Data behavior
This screen should read and update user records from Supabase.[cite:2][cite:7] Typical fields include:

- `id`
- `name`
- `email`
- `phone`
- `role`
- `ward`
- `department`
- `status`
- `last_login`
- `created_at`

Role changes should be logged so admin actions remain auditable.

## Demo-ready scope
For the presentation, you only need a small set of sample citizens, officers, and admins. The key thing is to show that roles can be viewed, filtered, and edited cleanly.

## Route and file suggestion
Suggested route:

- `app/admin/users/page.tsx`

Suggested related components:

- `components/admin/user-management-header.tsx`
- `components/admin/user-summary-cards.tsx`
- `components/admin/user-table.tsx`
- `components/admin/user-detail-drawer.tsx`
- `components/admin/role-edit-modal.tsx`

## Acceptance criteria
This screen is complete when:

- The admin can view all users by role.[cite:3][cite:17]
- Search and filters work clearly.
- Role changes are possible.
- User status can be updated.
- The layout is responsive and presentation-ready.
