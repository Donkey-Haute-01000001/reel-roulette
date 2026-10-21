# Reel Roulette: Filter chip row shouldn't resize when filters are picked

## Context

Picking genre filters on Swipe or Spin can make the page start
scrolling where it didn't before. Reproduced and measured directly on
the live site (reel-roulette-sable.vercel.app) at 1280x800: 0px
overflow with no filters active, 13px overflow after picking 3
genres, back to 0px after Clear.

Cause: `src/components/filter-bar.tsx` only renders its "Clear" button
when `hasActiveFilters(value)` is true. That extra button is enough to
push the genre chip row from one line to two at common window widths
(confirmed: the chip row's own height goes from 28px to 62px once
Clear appears). This is a *live, filter-state-dependent* height
change -- unlike the earlier Swipe/Spin fit fixes (which were about a
stale fixed budget for otherwise-constant content), there's no
constant to tune here, because the content itself is only sometimes
different in height depending on what the user has clicked.

## Fix

Stop conditionally rendering Clear. Always render it, but make it
invisible and non-interactive when there's nothing to clear, so its
box still occupies space in the row and the row's wrap point -- and
every box size around it -- never changes based on filter state.

In `src/components/filter-bar.tsx`:

```jsx
<Button
  variant="ghost"
  size="sm"
  className={cn(
    "h-7 px-2",
    tone === "paper" && "text-crimson hover:bg-crimson/10",
    !hasActiveFilters(value) && "invisible"
  )}
  disabled={disabled || !hasActiveFilters(value)}
  onClick={() => onChange(EMPTY_FILTERS)}
>
  Clear
</Button>
```

(Remove the surrounding `{hasActiveFilters(value) && (...)}` -- the
button is always in the tree now.) `invisible` (CSS `visibility:
hidden`) keeps its layout space while hiding it from view and from
the accessibility tree; `disabled` also stops it from being focused
or clicked while hidden.

This is a single shared-component fix: `FilterBar` is used by both
Swipe (`swipe-screen.tsx`) and Spin (`roulette-slot.tsx`), so fixing
it here covers both without touching either screen directly.

## Files to touch

- `src/components/filter-bar.tsx` -- the one conditional, as above.

## Verification

1. At a window width where the chip row is close to wrapping (around
   1280px wide was where this reproduced), confirm picking any genre
   filter no longer changes the chip row's height or introduces a
   scrollbar.
2. Confirm Clear is invisible (not just empty space with no label)
   when no filters are active, and appears normally once a filter is
   picked.
3. Confirm Clear still isn't reachable by Tab/keyboard when hidden,
   and still works normally (clears filters) once visible.
4. Spot check both Swipe and Spin at a few widths, since both share
   this component.
