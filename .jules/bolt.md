## 2024-05-24 - Date Object Allocation in Render Loops
**Learning:** Instantiating `new Date(dateString)` inside loops handling large arrays of records (like the analytics tab processing `listGrievances`) leads to unnecessary memory allocation and frequent Garbage Collection pauses.
**Action:** Always favor using `Date.parse(dateString)` to obtain the primitive timestamp for date comparisons and duration calculations inside loops. Also, cache `Date.now()` outside the loop rather than evaluating it on each iteration.

## 2024-05-25 - Avoid Instantiating `new Date` inside Render Maps
**Learning:** Instantiating `new Date(sla_deadline)` inside a mapped array during component rendering increases garbage collection overhead and causes performance slowdowns in React, especially for lists of large amounts of tickets. `Date.now()` is also repeatedly queried per mapped element.
**Action:** Lift `Date.now()` outside the map loop and replace `new Date(dateString)` with `Date.parse(dateString)` inside the loop, using simple primitive subtraction for duration calculations. This drastically minimizes Object allocations inside render cycles.
