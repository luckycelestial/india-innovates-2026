## 2024-05-24 - Date Object Allocation in Render Loops
**Learning:** Instantiating `new Date(dateString)` inside loops handling large arrays of records (like the analytics tab processing `listGrievances`) leads to unnecessary memory allocation and frequent Garbage Collection pauses.
**Action:** Always favor using `Date.parse(dateString)` to obtain the primitive timestamp for date comparisons and duration calculations inside loops. Also, cache `Date.now()` outside the loop rather than evaluating it on each iteration.
## 2024-05-24 - [Optimization: Avoid O(N) operations in render]
**Learning:** O(N) operations like array `.reduce` directly within React component render bodies can cause performance bottlenecks as they run on every render.
**Action:** Wrap expensive derived data calculations in `useMemo` so they only re-evaluate when dependencies change.
