# Reel Roulette: IMDb catalog import (~1,023 movies)

## Context

Taking Reel Roulette from a small hand-curated catalog (68 movies) to a
large, genuinely browsable one, sourced from the user's own 1,025-movie
IMDb list export (CSV columns: Position, Const, Created, Modified,
Description, Title, Original Title, URL, Title Type, IMDb Rating,
Runtime (mins), Year, Genres, Num Votes, Release Date, Directors).

This pairs with `docs/genre-filter-and-matching-plan.md` (switching
genre filtering from OR to AND) — the 3 new suits added here were
specifically checked against that AND-matching behavior to confirm they
combine richly rather than sitting redundant (Western + Sci-Fi → Back to
the Future Part III; Western + Comedy → 5 movies; Musical + Comedy → 20
movies; Musical + Horror → 1 movie).

## Decisions settled

- **Scope**: 1,025 CSV rows → filter out the 2 non-movie rows (1 TV
  Movie, 1 TV Series) → 1,023 real movies.
- **Posters**: out of scope, not imported (copyright; the app doesn't
  use movie posters at all today).
- **cast_members**: left empty (`[]`) for every new movie — the CSV has
  no cast data (only Directors). Confirmed safe: `movie-details.tsx`
  already guards the "Starring" line with `{cast.length > 0 && (...)}`.
- **Synopses ("blurbs")**: the existing catalog's `synopsis` column is
  hand-written, one-sentence text embedded directly as the 9th tuple
  element in `scripts/gen_seed.py`'s `MOVIES` list — no API, no
  template (confirmed by reading the full 351-line script). New movies
  get Claude-authored blurbs in the same voice (specific concrete
  detail, light wit, no spoilers past the premise) — validated against
  15 real titles from the actual CSV and approved as matching tone/size.
  Write these in batches of roughly 50-100 movies, with a ~5% random
  spot-check reread per batch for voice/spoiler consistency — don't
  attempt all 1,023 in one pass.
- **mood_tags**: same treatment as blurbs (same pass, same batches),
  drawn *only* from the existing closed vocabulary in
  `src/lib/genre-meta.ts`'s `MOOD_TAGS` (`edge-of-seat`, `funny`,
  `heartwarming`, `tearjerker`, `cerebral`, `dark`, `cozy`, `epic`,
  `scary`, `mind-bending`, `nostalgic`, `romantic`, `quirky`,
  `inspiring`, `heavy`, `so-bad-its-good`) — 1-2 tags per movie, no new
  vocabulary invented.
- **Genre suits: 10 → 13**. Added: `western`, `musical`, `biography`.
  No schema constraint blocks this — `primary_genre` is just
  `text not null references genres(slug)`, and `GenreSlug` in
  `src/lib/types.ts` is only a TypeScript union, not a DB-level cap.
- **Icons** (matching the existing single-glyph lucide style): western
  → `Fence` (lucide has no cowboy-hat/revolver icon by design; `Fence`
  is a real, already-available icon — keeps all 13 suits consistently
  lucide-sourced, no custom SVG component needed). musical → `Music2`.
  biography → `BookOpen`.
- **Colors**, picked by computing the hue/sat/lightness of all 10
  existing `--color-genre-*` values and filling the real open gaps:
  `western: #a6a230` (khaki-olive, fills the empty 37°-84° gap),
  `musical: #ea3eea` (magenta-violet, fills the empty 271°-330° gap
  between horror and romance), `biography: #389444` (sage-emerald,
  fills the empty 84°-173° gap). Worth a visual double-check once
  rendered, but these are chosen for real separation from the existing
  palette, not guessed.
- **Genre fold table** — every IMDb genre label maps to one or more of
  the 13 suits (a movie keeps all that apply, deduped):
  - Direct: Action→action, Comedy→comedy, Drama→drama, Horror→horror,
    Sci-Fi→scifi, Romance→romance, Thriller→thriller,
    Animation→animation, Fantasy→fantasy, Documentary→documentary,
    Western→western, Musical→musical, Biography→biography.
  - Folded: Crime→thriller, Mystery→thriller, Adventure→action,
    Family→comedy, War→drama+thriller, Sport→biography,
    Music→biography, History→drama, Film-Noir→thriller+drama.
- **Primary genre selection rule**: drama is *deprioritized* — pick the
  first non-drama mapped suit in the movie's IMDb-listed genre order;
  fall back to drama only if no other suit applies. Backed by data
  computed from the actual CSV: a naive "first listed tag" rule makes
  drama primary for 266/1025 movies (26%, the largest single suit by a
  wide margin); deprioritizing it drops that to 77/1025 (7.5%) and lets
  Action (261), Thriller (219), and Comedy (190) lead instead — closer
  to how the hand-curated 68 already balance across suits. Drama is
  *kept* as a suit (not eliminated) since several existing movies are
  archetypally drama-only (The Godfather, Schindler's List, 12 Angry
  Men, The Shawshank Redemption) and forcing them elsewhere would be
  arbitrary.
- **Duplicates**: cross-check all 1,025 CSV titles+years against the
  current 68-movie catalog before import. Any match is dropped from the
  import entirely — the hand-curated version always wins (it already
  has real `cast_members` and an approved hand-written blurb).
- **Merge mechanism**: extend `scripts/gen_seed.py`'s existing `GENRES`
  and `MOVIES` lists (add the 3 new genre rows, append the deduped
  ~1,023 new movie tuples) rather than building a separate import
  pipeline. Same script, same truncate-and-reinsert pattern already
  used to produce `supabase/seed.sql` — one source of truth, not two.

## Files to touch

- `src/lib/types.ts` — add `"western" | "musical" | "biography"` to the
  `GenreSlug` union.
- `src/lib/genre-meta.ts` — add 3 `GENRE_META` entries (icon, color,
  label), import `Fence`, `Music2`, `BookOpen` from `lucide-react`.
- `src/app/globals.css` — add 3 new `--color-genre-*` variables.
- `scripts/gen_seed.py` — add 3 rows to `GENRES`; append the deduped,
  blurb-and-mood-tagged, primary-genre-assigned movie tuples to `MOVIES`.
- `supabase/seed.sql` — regenerated by re-running
  `python3 scripts/gen_seed.py > supabase/seed.sql`, not hand-edited.

## Explicitly left to the user's own Claude Code session

- Writing the ~1,023 blurbs and mood-tag sets, in batches, with spot checks.
- Running the title+year dedup check against the current 68.
- Applying the fold table and the deprioritize-drama rule to assign
  each movie's `primary_genre` and full `genre_slugs` list.
- Re-running `gen_seed.py`, reviewing the regenerated `seed.sql`, and
  applying it to Supabase.

## Verification

1. Regenerate `seed.sql` and spot-check 5-10 random new movies: their
   `primary_genre`/`genre_slugs` match the fold table, no duplicate
   title+year pairs exist between the original 68 and the new ~1,023.
2. Confirm the 3 new suits render correctly: `FilterBar` shows
   Western/Musical/Biography chips with the right color/label; a card
   whose `primary_genre` is one of the 3 shows the new icon/color in
   its medallion and corner pips.
3. With the AND-filter change live, confirm Western + Sci-Fi returns the
   expected small set (Back to the Future Part III per the pre-dedup
   analysis) — a sanity check that fold table + AND-matching work
   together correctly.
4. Confirm a new, `cast_members`-empty movie renders fine in
   `movie-details.tsx` — no "Starring" line, no crash.
5. Spot-check ~5% of the written blurbs for tone consistency and
   spoiler-safety.
