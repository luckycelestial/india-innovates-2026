## 2024-05-18 - Avoid new Date() inside loops

**Learning:** Memory indicated: "Performance Preference: To minimize memory allocation and GC overhead in loops involving dates, favor \`Date.parse(dateString)\` over instantiating \`new Date(dateString)\`. Lexicographical string comparison can be used for ISO 8601 dates, but only if all compared strings strictly follow the exact same format." In components like \`AnalyticsTab.jsx\` and \`SentinelHeatmap.jsx\`, date parsing is happening inside tight loops, particularly with ticket filtering which can result in thousands of loops over large data sets.

**Action:** Replace `new Date(r.created_at)` with `Date.parse(r.created_at)` and evaluate comparisons for ISO 8601 string comparisons directly if the ISO formats are consistent. But the safest general optimization is replacing `new Date(val)` or `new Date(val).getTime()` with `Date.parse(val)` to avoid object instantiation overhead during iteration.
