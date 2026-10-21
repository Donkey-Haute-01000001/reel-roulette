"""Look up each imported film on TMDB by its IMDb id and save its top-billed
cast and a fuller synopsis to tmdb_extra.json, which gen_seed.py reads.

Needs TMDB_TOKEN (TMDB's API Read Access Token) in .env.local. Resumable:
films already in tmdb_extra.json are skipped.

    python scripts/fetch_tmdb.py          # every imported film
    python scripts/fetch_tmdb.py 5        # just the first 5, to check
"""

import json
import pathlib
import re
import sys
import time
import urllib.request

HERE = pathlib.Path(__file__).parent
OUT = HERE / "tmdb_extra.json"
CAST_SIZE = 4
# The particulars placard has to fit beside a card on the Watch Deck table,
# so a synopsis is kept to whole sentences within this many characters.
MAX_SYNOPSIS = 320


def token():
    for line in (HERE.parent / ".env.local").read_text(encoding="utf-8").splitlines():
        if line.startswith("TMDB_TOKEN="):
            return line.split("=", 1)[1].strip()
    sys.exit("TMDB_TOKEN is missing from .env.local")


def get(path, tok):
    req = urllib.request.Request(
        f"https://api.themoviedb.org/3{path}",
        headers={"Authorization": f"Bearer {tok}", "Accept": "application/json"},
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                return json.load(res)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:
                time.sleep(2 ** attempt)
                continue
            raise


def trim(text):
    text = " ".join(text.split())
    if len(text) <= MAX_SYNOPSIS:
        return text
    kept = ""
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        if len(kept) + len(sentence) + 1 > MAX_SYNOPSIS:
            break
        kept = f"{kept} {sentence}".strip()
    # One very long first sentence: cut at a word and close with an ellipsis.
    return kept or text[:MAX_SYNOPSIS].rsplit(" ", 1)[0].rstrip(",;:") + "…"


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    tok = token()
    films = json.loads((HERE / "imdb_movies.json").read_text(encoding="utf-8"))[:limit]
    extra = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    missing = []

    for i, m in enumerate(films, 1):
        iid = m["imdb_id"]
        if iid in extra:
            continue
        found = get(f"/find/{iid}?external_source=imdb_id", tok)["movie_results"]
        if not found:
            missing.append(f"{m['title']} ({m['year']})")
            continue
        tmdb_id = found[0]["id"]
        credits = get(f"/movie/{tmdb_id}/credits", tok)
        cast = [c["name"] for c in sorted(credits["cast"], key=lambda c: c["order"])][:CAST_SIZE]
        extra[iid] = {"cast": cast, "synopsis": trim(found[0].get("overview") or "")}
        if i % 50 == 0:
            OUT.write_text(json.dumps(extra, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"{i}/{len(films)}", file=sys.stderr)

    OUT.write_text(json.dumps(extra, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"saved {len(extra)} films; not found on TMDB: {len(missing)}", file=sys.stderr)
    for t in missing:
        print(f"  {t}", file=sys.stderr)


main()
