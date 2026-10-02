// A movie's playing-card rank, fixed by its rating alone — it never shifts as
// the catalogue grows.
//
// Each rank is a half-point band, with the middle of the deck (the 8) set on
// the typical film rating (~6.3). Ratings across a large catalogue form a
// rough bell curve around there, so most cards land in the middle ranks and
// the ends are rare: Aces are 9+ masterpieces (well under 1% of films), 2s
// are the true duds.

const LADDER: { min: number; rank: string; name: string }[] = [
  { min: 9.0, rank: "A", name: "Ace" },
  { min: 8.5, rank: "K", name: "King" },
  { min: 8.0, rank: "Q", name: "Queen" },
  { min: 7.5, rank: "J", name: "Jack" },
  { min: 7.0, rank: "10", name: "Ten" },
  { min: 6.5, rank: "9", name: "Nine" },
  { min: 6.0, rank: "8", name: "Eight" },
  { min: 5.5, rank: "7", name: "Seven" },
  { min: 5.0, rank: "6", name: "Six" },
  { min: 4.5, rank: "5", name: "Five" },
  { min: 4.0, rank: "4", name: "Four" },
  { min: 3.5, rank: "3", name: "Three" },
  { min: -Infinity, rank: "2", name: "Two" },
];

export function cardRank(rating: number): { rank: string; name: string } {
  return LADDER.find((step) => rating >= step.min)!;
}
