import {
  Camera,
  Drama,
  Flame,
  Ghost,
  Heart,
  Rocket,
  Smile,
  Sparkles,
  Swords,
  Wand2,
  type LucideIcon,
} from "lucide-react";

import type { GenreSlug } from "@/lib/types";

export const GENRE_META: Record<
  GenreSlug,
  { label: string; color: string; icon: LucideIcon }
> = {
  action: { label: "Action", color: "var(--color-genre-action)", icon: Swords },
  comedy: { label: "Comedy", color: "var(--color-genre-comedy)", icon: Smile },
  drama: { label: "Drama", color: "var(--color-genre-drama)", icon: Drama },
  horror: { label: "Horror", color: "var(--color-genre-horror)", icon: Ghost },
  scifi: { label: "Sci-Fi", color: "var(--color-genre-scifi)", icon: Rocket },
  romance: { label: "Romance", color: "var(--color-genre-romance)", icon: Heart },
  thriller: { label: "Thriller", color: "var(--color-genre-thriller)", icon: Flame },
  animation: { label: "Animation", color: "var(--color-genre-animation)", icon: Sparkles },
  fantasy: { label: "Fantasy", color: "var(--color-genre-fantasy)", icon: Wand2 },
  documentary: { label: "Documentary", color: "var(--color-genre-documentary)", icon: Camera },
};

export const MOOD_TAGS = [
  "edge-of-seat",
  "funny",
  "heartwarming",
  "tearjerker",
  "cerebral",
  "dark",
  "cozy",
  "epic",
  "scary",
  "mind-bending",
  "nostalgic",
  "romantic",
  "quirky",
  "inspiring",
  "heavy",
  "so-bad-its-good",
] as const;
