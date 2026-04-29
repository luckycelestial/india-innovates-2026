## 2024-05-24 - Date Object Allocation in Render Loops
**Learning:** Instantiating `new Date(dateString)` inside loops handling large arrays of records (like the analytics tab processing `listGrievances`) leads to unnecessary memory allocation and frequent Garbage Collection pauses.
**Action:** Always favor using `Date.parse(dateString)` to obtain the primitive timestamp for date comparisons and duration calculations inside loops. Also, cache `Date.now()` outside the loop rather than evaluating it on each iteration.
## 2024-04-29 - O(N) Reductions in Render Loops
**Learning:** Performing O(N) array reductions (like calculating status counts over hundreds of tickets) directly within a component's render body degrades performance, especially when simple actions like toggling UI details trigger re-renders.
**Action:** Wrap expensive derived data calculations like array reductions in `useMemo` so they only re-evaluate when their specific dependencies (the array itself) change, rather than on every render.
