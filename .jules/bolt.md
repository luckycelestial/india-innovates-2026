## 2024-05-24 - Date Object Allocation in Render Loops
**Learning:** Instantiating `new Date(dateString)` inside loops handling large arrays of records (like the analytics tab processing `listGrievances`) leads to unnecessary memory allocation and frequent Garbage Collection pauses.
**Action:** Always favor using `Date.parse(dateString)` to obtain the primitive timestamp for date comparisons and duration calculations inside loops. Also, cache `Date.now()` outside the loop rather than evaluating it on each iteration.
## 2026-04-30 - Array reduce inside render components
**Learning:** In `ManageTicketsTab.jsx`, an O(N) `.reduce` operation was being executed directly within the component render logic to aggregate ticket counts, causing unnecessary recalculation on every state change (e.g., UI toggles).
**Action:** Wrapped expensive derived data calculations using `useMemo` and an appropriate dependency array so that the operation is isolated from unrelated re-renders.
