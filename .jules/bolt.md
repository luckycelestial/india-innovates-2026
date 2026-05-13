## 2024-05-24 - Date Object Allocation in Render Loops
**Learning:** Instantiating `new Date(dateString)` inside loops handling large arrays of records (like the analytics tab processing `listGrievances`) leads to unnecessary memory allocation and frequent Garbage Collection pauses.
**Action:** Always favor using `Date.parse(dateString)` to obtain the primitive timestamp for date comparisons and duration calculations inside loops. Also, cache `Date.now()` outside the loop rather than evaluating it on each iteration.

## 2026-05-13 - O(N) operations in React Render Bodies
**Learning:** Performing O(N) operations (like `array.reduce`) directly within React component render bodies (e.g., calculating ticket status counts in `ManageTicketsTab.jsx`) causes unnecessary recalculations and performance degradation on every state change.
**Action:** Wrap expensive derived data calculations in `useMemo` so they only re-evaluate when their specific dependencies change.
