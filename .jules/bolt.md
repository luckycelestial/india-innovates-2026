## 2024-04-28 - [Minimize GC Overhead Date Parsing in Loops]
**Learning:** Found multiple instances where `new Date(dateString).getTime()` was being called inside loops (like filter functions processing hundreds of grievance records). Instantiating new Date objects purely to get their epoch timestamp within a loop is an anti-pattern as it causes excessive object allocation and GC pressure.
**Action:** Use `Date.parse(dateString)` instead, which returns the timestamp directly without allocating a new Date object, improving performance especially on large datasets.
