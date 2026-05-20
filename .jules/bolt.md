## 2024-05-24 - Date Object Allocation in Render Loops
**Learning:** Instantiating `new Date(dateString)` inside loops handling large arrays of records (like the analytics tab processing `listGrievances`) leads to unnecessary memory allocation and frequent Garbage Collection pauses.
**Action:** Always favor using `Date.parse(dateString)` to obtain the primitive timestamp for date comparisons and duration calculations inside loops. Also, cache `Date.now()` outside the loop rather than evaluating it on each iteration.

## 2026-05-18 - Single Loop Dataset Traversals for Multiple Statistics
**Learning:** Performing multiple independent `.filter(condition).length` operations on a single potentially large dataset (like the `rows` array from `listGrievances`) leads to unnecessary repeated iterations (O(3N) instead of O(N)) and increased garbage collection overhead from the intermediate filtered arrays.
**Action:** When extracting multiple distinct statistics (e.g., total open, critical open, SLA violations) from the same dataset, combine them into a single `for...of` loop traversal with accumulator variables to avoid redundant iterations and memory allocations.
## 2025-02-14 - Prevent O(N) recalculations of array reductions in React renders
**Learning:** In `ManageTicketsTab.jsx`, an `O(N)` operation (`tickets.reduce()`) was used directly within the React render function body. This meant it was re-executed on every single re-render of the component, even if the underlying `tickets` data hadn't changed (e.g. when expanding a ticket or opening details).
**Action:** Always wrap expensive derived data calculations like `.reduce` or `.filter` in a `useMemo` hook, adding the dependent data (like `tickets`) to the dependency array. This ensures the calculation only happens when the raw data changes, preventing unnecessary CPU and garbage collection overhead during regular UI interactions.
