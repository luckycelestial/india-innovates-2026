## 2024-05-24 - Date Object Allocation in Render Loops
**Learning:** Instantiating `new Date(dateString)` inside loops handling large arrays of records (like the analytics tab processing `listGrievances`) leads to unnecessary memory allocation and frequent Garbage Collection pauses.
**Action:** Always favor using `Date.parse(dateString)` to obtain the primitive timestamp for date comparisons and duration calculations inside loops. Also, cache `Date.now()` outside the loop rather than evaluating it on each iteration.
## 2025-02-12 - Render Body Data Formats
**Learning:** Instantiating `new Date()` within an inner loop mapping function directly within the JSX render block introduces performance overhead that scales with list size.
**Action:** When working with rendering data lists, try to hoist computations logic like obtaining `Date.now()` completely outside mapping operations to save on object allocations.
