# Category and Department Management — PRAJA

## Purpose
This screen lets an admin manage complaint categories and map them to the correct departments or routing targets. It is the control center that determines where a complaint should go after submission.[cite:3][cite:17][cite:20]

## Screen goal
The goal is to keep complaint routing accurate, transparent, and easy to maintain. When categories are mapped cleanly to departments, the citizen complaint flow becomes faster and the officer workflow becomes more reliable.[cite:17][cite:20]

## Tech context
Build this screen using Next.js, Tailwind CSS, and TypeScript so it stays consistent with the rest of PRAJA.[cite:2][cite:11] The category and routing data should live in Supabase so that the admin can update mappings without changing the frontend code.[cite:2][cite:7]

## Main objects to manage
This screen should manage two related things:

- Complaint categories.
- Department routing targets.

You can also include ward-level routing or supervisor escalation targets later if needed.

## Core functions
The screen should support:

- Add a new complaint category.
- Edit category name and description.
- Enable or disable a category.
- Map a category to one or more departments.
- Assign a default officer group.
- Set escalation target.
- Search categories.
- Reorder categories by priority or usage.

This makes PRAJA flexible enough to support different complaint types without hardcoding routing rules everywhere.[cite:17][cite:20]

## Recommended layout
A useful layout is split into two main panels:

### 1. Category list panel
Show all complaint categories in a searchable list or table.

Suggested fields:

- Category name.
- Status.
- Assigned department.
- Default priority.
- Complaint count.
- Last updated.

### 2. Routing detail panel
When a category is selected, show its routing settings:

- Primary department.
- Secondary department, if any.
- Escalation target.
- Default officer group.
- SLA weight or priority weight.

This makes routing rules very easy to inspect and adjust.

## Example categories
PRAJA can start with categories such as:

- Roads.
- Water supply.
- Electricity.
- Sanitation.
- Drainage.
- Streetlights.
- Waste collection.
- Public safety.
- Other.

These are common civic complaint buckets and give the demo a realistic structure.

## Routing logic behavior
Each category should map to a default department or handling unit.

Example flow:

- Road issue → Public Works.
- Water issue → Water Board.
- Electricity issue → Power Department.
- Sanitation issue → Municipal Sanitation Team.

For the demo, the mapping can be simple and visible. Later, PRAJA can add AI-assisted routing or dynamic rules on top of these defaults.[cite:17][cite:20]

## Admin actions
Useful actions per category:

- View routing details.
- Edit name.
- Change department mapping.
- Set priority weight.
- Disable category.
- Duplicate category.

For departments, useful actions include:

- Add department.
- Edit department name.
- Set officer count.
- Assign escalation target.
- Disable routing target.

## Visual style
The screen should feel like a serious admin control panel.

Suggested style direction:

- White cards on a light slate background.
- Clear tables or split panels.
- Routing chips and department badges.
- Minimal clutter.
- Very readable labels.

## Mobile guidance
On mobile:

- Stack the category list above the routing details.
- Use a drawer or full-screen sheet for editing.
- Keep search at the top.
- Make category cards tappable.

## Component breakdown
Suggested reusable components:

- `CategoryManagementHeader`
- `CategoryListTable`
- `CategoryCardList`
- `RoutingDetailPanel`
- `DepartmentMappingEditor`
- `CategoryFormModal`
- `DepartmentFormModal`
- `CategoryStatusToggle`

This keeps the code modular and easy to extend in Next.js + TypeScript.[cite:11]

## Tailwind structure suggestion

```tsx
export default function CategoryDepartmentManagementPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* list and routing details */}
        </div>
      </section>
    </main>
  )
}
```

Useful classes:

- `grid gap-6`
- `rounded-2xl border border-slate-200 bg-white shadow-sm`
- `overflow-x-auto`
- `space-y-4`
- `sticky top-4`

## Data behavior
This screen should read and update category and department records in Supabase.[cite:2][cite:7] Typical fields include:

- `id`
- `name`
- `description`
- `status`
- `department_id`
- `secondary_department_id`
- `escalation_target`
- `priority_weight`
- `created_at`
- `updated_at`

Each category change should be auditable so the admin can track routing changes over time.

## Demo-ready scope
For the presentation, it is enough to show a handful of categories and a few departments. The important part is that you can click a category and see where complaints route.

## Route and file suggestion
Suggested route:

- `app/admin/categories/page.tsx`

Suggested related components:

- `components/admin/category-management-header.tsx`
- `components/admin/category-list-table.tsx`
- `components/admin/routing-detail-panel.tsx`
- `components/admin/category-form-modal.tsx`
- `components/admin/department-mapping-editor.tsx`

## Acceptance criteria
This screen is complete when:

- Categories can be created and edited.[cite:17]
- Department routing is visible and adjustable.
- Routing targets are easy to understand.
- The screen is responsive and admin-friendly.
- The structure supports future SLA or AI routing rules.
