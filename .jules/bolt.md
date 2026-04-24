
## 2024-04-24 - [Avoid Instantiating Dates in Loops]
**Learning:** Instantiating `Date` objects inside loops running over large arrays (like hundreds or thousands of rows of data fetched from Supabase) can be a significant performance bottleneck due to memory allocation and garbage collection.
**Action:** When filtering, sorting, or accumulating data with ISO-8601 date strings, use `Date.parse(dateString)` instead of `new Date(dateString)` for numerical time diffs. Furthermore, take advantage of the fact that ISO-8601 strings are lexicographically sortable, so inequalities (`<=`, `<`) can be compared directly on the strings without parsing them. Ensure comparison strings are in the exact same ISO-8601 format.
