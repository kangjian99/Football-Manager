# Football Manager AI

Named players live in season snapshots under `data/seasons/<season-id>/`. Logos, team attack/midfield/defence ratings, and filler-squad generation stay in `constants.ts`, `constants_e.ts`, and `constants_b24.ts`.

## 2024-25 snapshot

`data/seasons/2024-25/` is a move of the lists that used to be hardcoded in those constants files. It is not a refreshed 2025/26 or 2026/27 roster.

The game bundles `2024-25` (`CURRENT_SEASON_ID`). A new career loads that snapshot. The English leagues in `constants_e.ts` are what the app starts with; Serie A and Serie B are the same snapshot, used when that constants file is imported instead.

Advancing a year inside a career ages the squad already in memory. It does not swap in another snapshot file.

The browser stores `fm_career_v1` as `{ "version": 1, "seasonId": "2024-25" }` the first time a career starts. Fixtures and squad progress are still in memory and still reset on refresh. On the next visit, squads are built from the saved `seasonId`. A save that has no `seasonId` stops startup instead of being attached to a newer snapshot.

## Refreshing a season

The refresh script keeps ratings for players who are still in the squad, gives a new name rating **75** (the same fallback `injectRealPlayers` uses when a rating is missing), and adds 1 to the age of every player who remains. Squad membership, and age/position for genuinely new names, come from the API. It does not invent players.

football-data.org is preferred. API-Football is used only when that key is the one set.

```bash
FOOTBALL_DATA_API_TOKEN=your-token npm run refresh-season -- --from 2024-25 --to 2025-26
```

```bash
API_FOOTBALL_KEY=your-token npm run refresh-season -- --from 2024-25 --to 2025-26
```

If neither variable is set, the script prints an error and does not write a file. Do not commit API keys. `.env` is gitignored.

`serie-b-extra.json` is the small demonstration set from `constants_b24.ts`. It has no competition code, so the script skips it instead of guessing a squad.

## Rolling back

Close the pull request, or revert the merge commit on the default branch.
