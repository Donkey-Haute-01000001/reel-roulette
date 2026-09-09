#!/usr/bin/env python3
"""Generates supabase/seed.sql from a curated movie dataset.
Run: python3 scripts/gen_seed.py > supabase/seed.sql
"""

def esc(s: str) -> str:
    return s.replace("'", "''")

def s(v) -> str:
    return f"'{esc(str(v))}'"

def arr(items) -> str:
    return "ARRAY[" + ", ".join(s(i) for i in items) + "]::text[]"

GENRES = [
    ("action", "Action"),
    ("comedy", "Comedy"),
    ("drama", "Drama"),
    ("horror", "Horror"),
    ("scifi", "Sci-Fi"),
    ("romance", "Romance"),
    ("thriller", "Thriller"),
    ("animation", "Animation"),
    ("fantasy", "Fantasy"),
    ("documentary", "Documentary"),
]

# title, year, director, runtime, rating, primary_genre, [all genres], [mood tags], blurb
MOVIES = [
    ("Die Hard", 1988, "John McTiernan", 132, 8.2, "action", ["action", "thriller"],
     ["edge-of-seat", "funny"],
     "One cop, one skyscraper, and a Christmas party that goes very wrong — the template every action movie since has been copying."),
    ("Mad Max: Fury Road", 2015, "George Miller", 120, 8.4, "action", ["action", "scifi"],
     ["edge-of-seat", "epic"],
     "A two-hour chase across the desert that somehow still finds time for one of the decade's best-drawn characters."),
    ("The Matrix", 1999, "The Wachowskis", 136, 8.5, "action", ["action", "scifi"],
     ["mind-bending", "cerebral"],
     "Bullet time, red pills, and a paranoid thesis about reality dressed up as the coolest action movie of its era."),
    ("Terminator 2: Judgment Day", 1991, "James Cameron", 137, 8.6, "action", ["action", "scifi"],
     ["edge-of-seat", "epic"],
     "The rare sequel that out-does the original, with special effects that still hold up decades later."),
    ("John Wick", 2014, "Chad Stahelski", 101, 7.9, "action", ["action", "thriller"],
     ["edge-of-seat"],
     "A grieving hitman comes out of retirement over a stolen car and a dead dog, and the genre hasn't been the same since."),
    ("Raiders of the Lost Ark", 1981, "Steven Spielberg", 115, 8.5, "action", ["action", "fantasy"],
     ["nostalgic", "epic"],
     "Nazis, boulders, and a whip-cracking archaeologist — pure matinee adventure with barely a wasted frame."),
    ("Speed", 1994, "Jan de Bont", 116, 7.3, "action", ["action", "thriller"],
     ["edge-of-seat"],
     "A bus that can't slow below fifty is the entire premise, and somehow that's more than enough."),
    ("Mission: Impossible - Fallout", 2018, "Christopher McQuarrie", 147, 7.8, "action", ["action", "thriller"],
     ["edge-of-seat", "epic"],
     "Six films in, and the stunts still escalate — this one has Tom Cruise flying a helicopter through a canyon himself."),

    ("Airplane!", 1980, "Jim Abrahams", 88, 7.7, "comedy", ["comedy"],
     ["funny", "so-bad-its-good"],
     "A disaster-movie spoof that fires sight gags so fast you'll miss half of them laughing at the last one."),
    ("Superbad", 2007, "Greg Mottola", 113, 7.6, "comedy", ["comedy"],
     ["funny", "nostalgic"],
     "Two best friends spend one chaotic night trying to buy alcohol before they leave for separate colleges."),
    ("Groundhog Day", 1993, "Harold Ramis", 101, 8.0, "comedy", ["comedy", "fantasy"],
     ["funny", "heartwarming"],
     "A cynical weatherman relives the same small-town day over and over until he finally learns something from it."),
    ("The Grand Budapest Hotel", 2014, "Wes Anderson", 99, 8.1, "comedy", ["comedy", "drama"],
     ["quirky", "cozy"],
     "A concierge and his lobby boy get tangled in an art heist, a murder, and a prison break, all in pastel symmetry."),
    ("Bridesmaids", 2011, "Paul Feig", 125, 6.8, "comedy", ["comedy", "romance"],
     ["funny", "heartwarming"],
     "A maid of honor's life falls apart in real time while she tries to hold a wedding together."),
    ("Dr. Strangelove", 1964, "Stanley Kubrick", 95, 8.5, "comedy", ["comedy", "drama"],
     ["so-bad-its-good", "cerebral"],
     "A war room farce about the men one phone call away from ending the world, and how little it would take."),
    ("Anchorman: The Legend of Ron Burgundy", 2004, "Adam McKay", 94, 7.2, "comedy", ["comedy"],
     ["funny", "quirky"],
     "A 1970s San Diego newsman's fragile ego meets a rival anchorwoman, with a jazz flute solo along the way."),
    ("Some Like It Hot", 1959, "Billy Wilder", 121, 8.2, "comedy", ["comedy", "romance"],
     ["funny", "nostalgic"],
     "Two musicians witness a mob hit and go on the run disguised as an all-female band."),

    ("The Godfather", 1972, "Francis Ford Coppola", 175, 9.2, "drama", ["drama", "thriller"],
     ["epic", "cerebral"],
     "A crime family's succession story, told with more patience and weight than almost anything else in the genre."),
    ("Forrest Gump", 1994, "Robert Zemeckis", 142, 8.0, "drama", ["drama", "romance"],
     ["heartwarming", "nostalgic"],
     "A slow-witted, kind-hearted man stumbles through three decades of American history and comes out the other side happy."),
    ("Schindler's List", 1993, "Steven Spielberg", 195, 9.0, "drama", ["drama"],
     ["heavy", "cerebral"],
     "A war profiteer's slow moral awakening, shot in stark black and white that never lets you look away."),
    ("12 Angry Men", 1957, "Sidney Lumet", 96, 8.9, "drama", ["drama", "thriller"],
     ["cerebral", "edge-of-seat"],
     "Twelve jurors, one hot room, and a single holdout who refuses to send a boy to the chair without talking it through."),
    ("The Shawshank Redemption", 1994, "Frank Darabont", 142, 9.3, "drama", ["drama"],
     ["heartwarming", "epic"],
     "A wrongly convicted banker spends two decades in prison, patiently building the means to walk out on his own terms."),
    ("There Will Be Blood", 2007, "Paul Thomas Anderson", 158, 8.2, "drama", ["drama"],
     ["dark", "cerebral"],
     "An oilman's ambition curdles into something monstrous, set to one of the great unsettling scores in film."),
    ("Moonlight", 2016, "Barry Jenkins", 111, 7.4, "drama", ["drama", "romance"],
     ["heavy", "tearjerker"],
     "One boy's life told in three chapters, each one quietly reshaping who he's allowed to become."),
    ("Parasite", 2019, "Bong Joon-ho", 132, 8.5, "drama", ["drama", "thriller"],
     ["dark", "cerebral"],
     "A poor family cons its way into a rich household's employ, and the class satire turns into something much sharper."),

    ("The Shining", 1980, "Stanley Kubrick", 146, 8.4, "horror", ["horror", "drama"],
     ["scary", "dark"],
     "A winter caretaker's slow unraveling in an empty hotel, filmed with a dread that never lets up."),
    ("Get Out", 2017, "Jordan Peele", 104, 7.7, "horror", ["horror", "thriller"],
     ["scary", "cerebral"],
     "A weekend meeting the girlfriend's parents turns into a horror movie about being the only Black guest at the party."),
    ("Hereditary", 2018, "Ari Aster", 127, 7.3, "horror", ["horror", "drama"],
     ["scary", "dark"],
     "A family tragedy uncovers something much older and much worse lurking in their bloodline."),
    ("Alien", 1979, "Ridley Scott", 117, 8.5, "horror", ["horror", "scifi"],
     ["scary", "edge-of-seat"],
     "A cargo ship's crew realizes too late that something got on board with them, in space where no one can hear you scream."),
    ("A Quiet Place", 2018, "John Krasinski", 90, 7.5, "horror", ["horror", "thriller"],
     ["scary", "edge-of-seat"],
     "A family survives blind monsters that hunt by sound alone, which means every scene is nearly silent."),
    ("The Exorcist", 1973, "William Friedkin", 122, 8.1, "horror", ["horror", "drama"],
     ["scary", "dark"],
     "A mother watches her daughter change into something else entirely, and calls in the priests as a last resort."),
    ("Psycho", 1960, "Alfred Hitchcock", 109, 8.5, "horror", ["horror", "thriller"],
     ["scary", "cerebral"],
     "A secretary on the run checks into a roadside motel run by a young man very attached to his mother."),

    ("Blade Runner", 1982, "Ridley Scott", 117, 8.1, "scifi", ["scifi", "thriller"],
     ["cerebral", "dark"],
     "A bounty hunter tracks synthetic humans through a rain-soaked future city and starts to question what makes anyone real."),
    ("Interstellar", 2014, "Christopher Nolan", 169, 8.6, "scifi", ["scifi", "drama"],
     ["epic", "tearjerker"],
     "A father leaves his kids behind to find humanity a new home, and time itself becomes the story's cruelest obstacle."),
    ("Arrival", 2016, "Denis Villeneuve", 116, 7.9, "scifi", ["scifi", "drama"],
     ["cerebral", "tearjerker"],
     "A linguist tries to talk to aliens before the world's militaries decide to shoot first."),
    ("2001: A Space Odyssey", 1968, "Stanley Kubrick", 149, 8.3, "scifi", ["scifi"],
     ["cerebral", "epic"],
     "From bone tools to star gates, a nearly wordless history of intelligence and the machines that might replace it."),
    ("Inception", 2010, "Christopher Nolan", 148, 8.8, "scifi", ["scifi", "thriller"],
     ["mind-bending", "cerebral"],
     "A thief who steals secrets from dreams takes one last job: planting an idea instead of stealing one."),
    ("Dune", 2021, "Denis Villeneuve", 155, 8.0, "scifi", ["scifi", "drama"],
     ["epic", "cerebral"],
     "A duke's son is thrown into a desert planet's politics, religion, and the only resource the galaxy actually needs."),
    ("E.T. the Extra-Terrestrial", 1982, "Steven Spielberg", 115, 7.9, "scifi", ["scifi", "drama"],
     ["heartwarming", "nostalgic"],
     "A stranded alien and a lonely kid become best friends, and a flying bicycle becomes cinema history."),
    ("Star Wars: A New Hope", 1977, "George Lucas", 121, 8.6, "scifi", ["scifi", "fantasy"],
     ["epic", "nostalgic"],
     "A farm boy, a smuggler, and a princess take on an empire, and the modern blockbuster is born."),

    ("Before Sunrise", 1995, "Richard Linklater", 101, 8.1, "romance", ["romance", "drama"],
     ["romantic", "cozy"],
     "Two strangers meet on a train and spend one night walking Vienna, talking about everything that matters to them."),
    ("Eternal Sunshine of the Spotless Mind", 2004, "Michel Gondry", 108, 8.3, "romance", ["romance", "drama"],
     ["mind-bending", "tearjerker"],
     "An ex-couple erase each other from memory, and the movie argues gently that maybe they shouldn't have."),
    ("Pride & Prejudice", 2005, "Joe Wright", 129, 7.8, "romance", ["romance", "drama"],
     ["romantic", "cozy"],
     "A headstrong woman and a proud, awkward landowner slowly talk themselves out of their own worst assumptions."),
    ("When Harry Met Sally...", 1989, "Rob Reiner", 96, 7.7, "romance", ["romance", "comedy"],
     ["romantic", "funny"],
     "Can men and women ever just be friends? Twelve years of near-misses later, the movie has an answer."),
    ("La La Land", 2016, "Damien Chazelle", 128, 8.0, "romance", ["romance", "drama"],
     ["romantic", "tearjerker"],
     "A jazz pianist and an actress fall in love in Los Angeles while their ambitions quietly pull them apart."),
    ("Notting Hill", 1999, "Roger Michell", 124, 7.2, "romance", ["romance", "comedy"],
     ["romantic", "cozy"],
     "A bookshop owner falls for the most famous actress in the world, which turns out to complicate things."),

    ("Se7en", 1995, "David Fincher", 127, 8.6, "thriller", ["thriller", "horror"],
     ["dark", "edge-of-seat"],
     "Two detectives chase a killer staging murders around the seven deadly sins, right up to an ending that still stings."),
    ("No Country for Old Men", 2007, "Joel and Ethan Coen", 122, 8.2, "thriller", ["thriller", "drama"],
     ["dark", "cerebral"],
     "A hunter finds two million dollars at a drug deal gone wrong, and a hitman with a coin decides what happens next."),
    ("Gone Girl", 2014, "David Fincher", 149, 8.1, "thriller", ["thriller", "drama"],
     ["dark", "edge-of-seat"],
     "A husband becomes the prime suspect when his wife vanishes on their anniversary, and nothing about the case is what it looks like."),
    ("The Silence of the Lambs", 1991, "Jonathan Demme", 118, 8.6, "thriller", ["thriller", "horror"],
     ["dark", "edge-of-seat"],
     "A trainee FBI agent trades information with an imprisoned cannibal to catch a serial killer still out there."),
    ("Prisoners", 2013, "Denis Villeneuve", 153, 8.1, "thriller", ["thriller", "drama"],
     ["dark", "edge-of-seat"],
     "A father takes the search for his missing daughter into his own hands, and the movie asks how far that should go."),
    ("Zodiac", 2007, "David Fincher", 157, 7.7, "thriller", ["thriller", "drama"],
     ["cerebral", "dark"],
     "A cartoonist becomes obsessed with an unsolved serial killer case that slowly consumes his entire life."),

    ("Spirited Away", 2001, "Hayao Miyazaki", 125, 8.6, "animation", ["animation", "fantasy"],
     ["cozy", "epic"],
     "A girl wanders into a bathhouse for spirits and has to work her way free before she forgets her own name."),
    ("Toy Story", 1995, "John Lasseter", 81, 8.3, "animation", ["animation", "comedy"],
     ["heartwarming", "nostalgic"],
     "A cowboy doll's jealousy of the new spaceman toy launches the film that started modern computer animation."),
    ("Spider-Man: Into the Spider-Verse", 2018, "Bob Persichetti, Peter Ramsey, Rodney Rothman", 117, 8.4, "animation", ["animation", "action"],
     ["epic", "funny"],
     "Six Spider-people from six universes have to team up, and the animation reinvents what a superhero movie can look like."),
    ("WALL-E", 2008, "Andrew Stanton", 98, 8.4, "animation", ["animation", "scifi"],
     ["heartwarming", "cozy"],
     "A lonely trash-compacting robot falls for a sleek probe sent to check if Earth can support life again."),
    ("The Iron Giant", 1999, "Brad Bird", 86, 8.1, "animation", ["animation", "scifi"],
     ["heartwarming", "tearjerker"],
     "A boy befriends a giant robot from space and has to convince it — and the paranoid government agent chasing it — that it doesn't have to be a weapon."),
    ("Coco", 2017, "Lee Unkrich, Adrian Molina", 105, 8.4, "animation", ["animation", "fantasy"],
     ["heartwarming", "tearjerker"],
     "A boy who loves music crosses into the Land of the Dead to find the great-great-grandfather his family never talks about."),
    ("Up", 2009, "Pete Docter", 96, 8.3, "animation", ["animation", "drama"],
     ["tearjerker", "heartwarming"],
     "A widower ties thousands of balloons to his house to finally take the trip he and his wife always planned."),

    ("The Lord of the Rings: The Fellowship of the Ring", 2001, "Peter Jackson", 178, 8.9, "fantasy", ["fantasy", "action"],
     ["epic", "cerebral"],
     "A hobbit inherits a ring that has to be destroyed, and eight companions set out with him to make sure it happens."),
    ("Pan's Labyrinth", 2006, "Guillermo del Toro", 118, 8.2, "fantasy", ["fantasy", "drama"],
     ["dark", "cerebral"],
     "A girl retreats into a labyrinth of monsters and impossible tasks to escape her stepfather's fascist household."),
    ("The Princess Bride", 1987, "Rob Reiner", 98, 8.0, "fantasy", ["fantasy", "romance"],
     ["funny", "romantic"],
     "True love, a pirate, a giant, and a Sicilian who should never have gotten involved in a land war in Asia."),
    ("Harry Potter and the Prisoner of Azkaban", 2004, "Alfonso Cuaron", 142, 7.9, "fantasy", ["fantasy"],
     ["cozy", "epic"],
     "A convicted murderer escapes and seems to be hunting Harry, in the series' darkest and most atmospheric entry yet."),
    ("Big Fish", 2003, "Tim Burton", 125, 8.0, "fantasy", ["fantasy", "drama"],
     ["tearjerker", "quirky"],
     "A son tries to separate fact from myth in his dying father's tall tales, and finds the truth matters less than he thought."),

    ("Free Solo", 2018, "Jimmy Chin, Elizabeth Chai Vasarhelyi", 100, 8.1, "documentary", ["documentary"],
     ["edge-of-seat", "inspiring"],
     "A climber attempts to scale a 3,000-foot rock face with no rope and no margin for error, on camera."),
    ("Won't You Be My Neighbor?", 2018, "Morgan Neville", 94, 8.4, "documentary", ["documentary"],
     ["heartwarming", "tearjerker"],
     "A look at the quiet, deliberate kindness behind a children's television host who took kids seriously."),
    ("Amy", 2015, "Asif Kapadia", 128, 7.8, "documentary", ["documentary"],
     ["heavy", "tearjerker"],
     "Built entirely from home video and concert footage, a portrait of a singer the public never really saw clearly."),
    ("13th", 2016, "Ava DuVernay", 100, 8.2, "documentary", ["documentary"],
     ["cerebral", "heavy"],
     "A history of the loophole in the 13th Amendment and the mass incarceration system it helped build."),
    ("Man on Wire", 2008, "James Marsh", 94, 7.9, "documentary", ["documentary"],
     ["inspiring", "edge-of-seat"],
     "The story of the tightrope walk between the Twin Towers, told like a heist film because that's basically what it was."),
]

def sql_num(v):
    return str(v)

lines = []
lines.append("-- ============================================================================")
lines.append("-- Movie Roulette — seed data (generated by scripts/gen_seed.py)")
lines.append("-- ============================================================================")
lines.append("")
lines.append("truncate table public.watchlist, public.movie_genres, public.movies, public.genres restart identity cascade;")
lines.append("")

lines.append("insert into public.genres (slug, name) values")
lines.append(",\n".join(f"  ({s(slug)}, {s(name)})" for slug, name in GENRES) + ";")
lines.append("")

lines.append("insert into public.movies (title, release_year, director, runtime_minutes, rating, primary_genre, mood_tags, synopsis) values")
rows = []
for title, year, director, runtime, rating, primary, genres, moods, blurb in MOVIES:
    rows.append(
        f"  ({s(title)}, {year}, {s(director)}, {runtime}, {rating}, {s(primary)}, {arr(moods)}, {s(blurb)})"
    )
lines.append(",\n".join(rows) + ";")
lines.append("")

lines.append("insert into public.movie_genres (movie_id, genre_slug) values")
mg_rows = []
for idx, (title, year, director, runtime, rating, primary, genres, moods, blurb) in enumerate(MOVIES, start=1):
    for g in genres:
        mg_rows.append(f"  ((select id from public.movies where title = {s(title)} and release_year = {year}), {s(g)})")
lines.append(",\n".join(mg_rows) + ";")
lines.append("")

print("\n".join(lines))
print(f"-- total movies: {len(MOVIES)}", file=__import__("sys").stderr)
