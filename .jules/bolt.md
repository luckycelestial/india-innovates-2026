## 2024-05-24 - Date Object Allocation in Render Loops
**Learning:** Instantiating `new Date(dateString)` inside loops handling large arrays of records (like the analytics tab processing `listGrievances`) leads to unnecessary memory allocation and frequent Garbage Collection pauses.
**Action:** Always favor using `Date.parse(dateString)` to obtain the primitive timestamp for date comparisons and duration calculations inside loops. Also, cache `Date.now()` outside the loop rather than evaluating it on each iteration.

## 2024-05-11 - [React Render Loop GC Pressure]
**Learning:** Performing O(N) list operations (like `.reduce`) inside React component render bodies causes significant memory allocation and Garbage Collection overhead, especially when dealing with large arrays of tickets.
**Action:** Always wrap expensive derived data calculations in `useMemo` hooks to minimize memory footprint and GC pressure during renders.
