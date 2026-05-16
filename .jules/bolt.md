## 2024-05-24 - Date Object Allocation in Render Loops
**Learning:** Instantiating `new Date(dateString)` inside loops handling large arrays of records (like the analytics tab processing `listGrievances`) leads to unnecessary memory allocation and frequent Garbage Collection pauses.
**Action:** Always favor using `Date.parse(dateString)` to obtain the primitive timestamp for date comparisons and duration calculations inside loops. Also, cache `Date.now()` outside the loop rather than evaluating it on each iteration.
## 2024-05-24 - Unmemoized Reducers in Render
**Learning:** `Array.reduce` used directly in the render body of React components creates an O(N) performance hit on every single re-render, which is particularly detrimental for frequently updating tables or lists.
**Action:** Always wrap `.reduce` calls inside `useMemo` with the correct dependency array to prevent redundant calculations and improve UI responsiveness.
