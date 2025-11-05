# Watchlists (Upstash + Next.js)

v15.9
- Added **Filter Row** below the input row with a divider line.
- Filters: **Only watched**, **Only unwatched** (toggle chips).
- Sorting: **Date added** (newest first) or **Release year** (most recent first).
- Items now capture **release year** when chosen from autocomplete and use it for sorting.
- Moved **List/Grid view toggle** to the **right of the filter row** (blue icon button).

Notes:
- Release year is stored per item when picking from TMDB suggestions; manual titles will sort after those with a year.
