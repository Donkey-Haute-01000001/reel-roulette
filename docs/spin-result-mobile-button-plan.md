# Reel Roulette: Spin result — "Add to Watch Deck" clipped on phone

## Context

On the Spin result reveal (the dialog that shows the movie the reels landed
on), the "Add to Watch Deck" / "Pass" button pair is slightly cut off on
phone. Read the actual markup to confirm why, rather than guessing.

## Diagnosis

Confirmed in `src/components/roulette-slot.tsx` (~line 528):

```jsx
<div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2">
  <Button onClick={handleSave} disabled={saving} className="gap-1.5">
    <Bookmark className="size-4" /> {saving ? "Adding…" : "Add to Watch Deck"}
  </Button>
  <Button variant="secondary" onClick={handlePass} disabled={saving} className="gap-1.5">
    <X className="size-4" /> Pass
  </Button>
</div>
```

The two buttons sit side-by-side in a 2-column grid capped at `max-w-sm`
(384px), so on a phone each button only gets roughly half that width minus
the dialog's own padding. The app's base `Button` component
(`src/components/ui/button.tsx`) bakes in `whitespace-nowrap` plus
uppercase text with letter-spacing (`tracking-[0.12em]`) as its
"ticket/woodtype" look, used everywhere else without issue since those
buttons either have short labels or more room. "ADD TO WATCH DECK" tracked
out in caps, plus a bookmark icon, doesn't fit in that narrow half-width
on a phone, and since the text can't wrap, it overflows instead of
clipping cleanly — reads as "slightly cut off."

## Fix (approach 1, chosen by the user)

Stack the two buttons vertically on phone (each full width), and only
switch to the side-by-side 2-column layout from the `sm:` breakpoint up —
matching the breakpoint convention already used elsewhere in this same
file (e.g. `max-sm:px-10` on the cabinet wrapper). No change to the
button text, font size, or padding — just give "Add to Watch Deck" a full
row's width on narrow screens instead of squeezing it into half.

Change the grid's className from:

```
"mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2"
```

to:

```
"mx-auto mt-4 grid max-w-sm grid-cols-1 gap-2 sm:grid-cols-2"
```

That's the only change needed — both buttons already use `gap-1.5` and
full-width-by-default button sizing, so a single-column grid naturally
makes each one span the full row.

## Files to touch

- `src/components/roulette-slot.tsx` — the `grid-cols-2` → `grid-cols-1
  sm:grid-cols-2` change on the Add to Watch Deck / Pass button row
  (~line 528).

## Verification

1. On a phone (or a narrow devtools viewport), open the Spin result
   dialog for a movie not yet saved: confirm "Add to Watch Deck" now
   renders on its own full-width row with no clipping, and "Pass" sits
   below it, also full width.
2. On a wider viewport (tablet/desktop), confirm the two buttons still
   sit side-by-side as before — this change should only affect phone
   width.
