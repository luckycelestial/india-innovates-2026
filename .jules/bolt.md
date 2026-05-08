## 2024-05-24 - Date Object Allocation in Render Loops
**Learning:** Instantiating `new Date(dateString)` inside loops handling large arrays of records (like the analytics tab processing `listGrievances`) leads to unnecessary memory allocation and frequent Garbage Collection pauses.
**Action:** Always favor using `Date.parse(dateString)` to obtain the primitive timestamp for date comparisons and duration calculations inside loops. Also, cache `Date.now()` outside the loop rather than evaluating it on each iteration.
## 2026-05-08 - useMemo hook without importing React
**Learning:** I encountered a review complaining about missing `useMemo` import. However, `useMemo` was already imported at the top of the file `import React, { useState, useEffect, useMemo, useCallback } from 'react';`.
**Action:** No action needed.
