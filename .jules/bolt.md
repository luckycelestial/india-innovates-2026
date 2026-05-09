## 2024-05-24 - Date Object Allocation in Render Loops
**Learning:** Instantiating `new Date(dateString)` inside loops handling large arrays of records (like the analytics tab processing `listGrievances`) leads to unnecessary memory allocation and frequent Garbage Collection pauses.
**Action:** Always favor using `Date.parse(dateString)` to obtain the primitive timestamp for date comparisons and duration calculations inside loops. Also, cache `Date.now()` outside the loop rather than evaluating it on each iteration.

## 2024-05-25 - Caching Date and Avoid O(N) Reductions in Render
**Learning:** Found multiple instances where large data aggregations (like `.reduce` for category counts) or `new Date()` instantiations were happening synchronously during each React render cycle. `Date.now()` and `new Date()` within loops handling arrays of records creates memory bloat and garbage collection pressure.
**Action:** When calculating derived state from an array in a component render, wrap the operation in `useMemo`. When iterating over arrays (like mapping to render UI), evaluate `Date.now()` once before the loop and use `Date.parse(dateStr)` instead of `new Date(dateStr)` to calculate durations.
