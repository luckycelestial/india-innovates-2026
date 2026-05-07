## 2024-05-24 - Date Object Allocation in Render Loops
**Learning:** Instantiating `new Date(dateString)` inside loops handling large arrays of records (like the analytics tab processing `listGrievances`) leads to unnecessary memory allocation and frequent Garbage Collection pauses.
**Action:** Always favor using `Date.parse(dateString)` to obtain the primitive timestamp for date comparisons and duration calculations inside loops. Also, cache `Date.now()` outside the loop rather than evaluating it on each iteration.

## 2026-05-07 - Synchronous O(N) Iterations Blocking Render Threads
**Learning:** Performing multiple un-memoized `array.reduce()` or similar O(N) aggregations (like calculating ticket statistics) in the direct render body of a component like `ManageTicketsTab` can lead to degraded framerates when interacting with unrelated UI elements (like expanding lists or toggling charts) as the component scales.
**Action:** Always wrap derived data aggregations (especially on potentially unbounded arrays like tickets/grievances) using `useMemo` so that the recalculation is only triggered when the source data reference changes, not on every state update.
