## 2024-05-24 - Date Object Allocation in Render Loops
**Learning:** Instantiating `new Date(dateString)` inside loops handling large arrays of records (like the analytics tab processing `listGrievances`) leads to unnecessary memory allocation and frequent Garbage Collection pauses.
**Action:** Always favor using `Date.parse(dateString)` to obtain the primitive timestamp for date comparisons and duration calculations inside loops. Also, cache `Date.now()` outside the loop rather than evaluating it on each iteration.
## 2025-02-17 - Memoize Derived Computations in React Renders
**Learning:** Avoid O(N) array operations (like `.reduce()`) directly inside React render bodies to prevent unnecessary performance overhead on every re-render.
**Action:** Always wrap expensive derived data calculations using `useMemo` so that they only re-evaluate when their dependencies actually change.
