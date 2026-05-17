## 2024-05-24 - Date Object Allocation in Render Loops
**Learning:** Instantiating `new Date(dateString)` inside loops handling large arrays of records (like the analytics tab processing `listGrievances`) leads to unnecessary memory allocation and frequent Garbage Collection pauses.
**Action:** Always favor using `Date.parse(dateString)` to obtain the primitive timestamp for date comparisons and duration calculations inside loops. Also, cache `Date.now()` outside the loop rather than evaluating it on each iteration.

## 2025-02-12 - Unmemoized O(N) Array Reductions in Render Body
**Learning:** Found raw `.reduce()` calls aggregating stats directly inside component bodies. In heavy components like `ManageTicketsTab` where many independent UI state toggles exist (like `showPerf`, `selectedTicket`), unmemoized array derivations execute O(N) operations on every re-render, creating unnecessary CPU overhead.
**Action:** Always wrap derived data calculations that iterate over arrays (like `.map`, `.filter`, or `.reduce`) in `useMemo` if the component contains multiple independent state variables that trigger frequent re-renders.
