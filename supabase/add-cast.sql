-- ============================================================================
-- One-off update: add each movie's top-billed cast to an existing database.
-- (Fresh setups get this from schema.sql + seed.sql instead.) Safe to re-run.
-- ============================================================================

alter table public.movies add column if not exists cast_members text[] not null default '{}';

update public.movies set cast_members = ARRAY['Bruce Willis', 'Alan Rickman', 'Bonnie Bedelia', 'Reginald VelJohnson']::text[] where title = 'Die Hard' and release_year = 1988;
update public.movies set cast_members = ARRAY['Tom Hardy', 'Charlize Theron', 'Nicholas Hoult', 'Hugh Keays-Byrne']::text[] where title = 'Mad Max: Fury Road' and release_year = 2015;
update public.movies set cast_members = ARRAY['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss', 'Hugo Weaving']::text[] where title = 'The Matrix' and release_year = 1999;
update public.movies set cast_members = ARRAY['Arnold Schwarzenegger', 'Linda Hamilton', 'Edward Furlong', 'Robert Patrick']::text[] where title = 'Terminator 2: Judgment Day' and release_year = 1991;
update public.movies set cast_members = ARRAY['Keanu Reeves', 'Michael Nyqvist', 'Alfie Allen', 'Willem Dafoe']::text[] where title = 'John Wick' and release_year = 2014;
update public.movies set cast_members = ARRAY['Harrison Ford', 'Karen Allen', 'Paul Freeman', 'John Rhys-Davies']::text[] where title = 'Raiders of the Lost Ark' and release_year = 1981;
update public.movies set cast_members = ARRAY['Keanu Reeves', 'Sandra Bullock', 'Dennis Hopper', 'Jeff Daniels']::text[] where title = 'Speed' and release_year = 1994;
update public.movies set cast_members = ARRAY['Tom Cruise', 'Henry Cavill', 'Rebecca Ferguson', 'Simon Pegg']::text[] where title = 'Mission: Impossible - Fallout' and release_year = 2018;
update public.movies set cast_members = ARRAY['Robert Hays', 'Julie Hagerty', 'Leslie Nielsen', 'Lloyd Bridges']::text[] where title = 'Airplane!' and release_year = 1980;
update public.movies set cast_members = ARRAY['Jonah Hill', 'Michael Cera', 'Christopher Mintz-Plasse', 'Seth Rogen']::text[] where title = 'Superbad' and release_year = 2007;
update public.movies set cast_members = ARRAY['Bill Murray', 'Andie MacDowell', 'Chris Elliott', 'Stephen Tobolowsky']::text[] where title = 'Groundhog Day' and release_year = 1993;
update public.movies set cast_members = ARRAY['Ralph Fiennes', 'Tony Revolori', 'Saoirse Ronan', 'Adrien Brody']::text[] where title = 'The Grand Budapest Hotel' and release_year = 2014;
update public.movies set cast_members = ARRAY['Kristen Wiig', 'Maya Rudolph', 'Rose Byrne', 'Melissa McCarthy']::text[] where title = 'Bridesmaids' and release_year = 2011;
update public.movies set cast_members = ARRAY['Peter Sellers', 'George C. Scott', 'Sterling Hayden', 'Slim Pickens']::text[] where title = 'Dr. Strangelove' and release_year = 1964;
update public.movies set cast_members = ARRAY['Will Ferrell', 'Christina Applegate', 'Paul Rudd', 'Steve Carell']::text[] where title = 'Anchorman: The Legend of Ron Burgundy' and release_year = 2004;
update public.movies set cast_members = ARRAY['Marilyn Monroe', 'Tony Curtis', 'Jack Lemmon', 'Joe E. Brown']::text[] where title = 'Some Like It Hot' and release_year = 1959;
update public.movies set cast_members = ARRAY['Marlon Brando', 'Al Pacino', 'James Caan', 'Diane Keaton']::text[] where title = 'The Godfather' and release_year = 1972;
update public.movies set cast_members = ARRAY['Tom Hanks', 'Robin Wright', 'Gary Sinise', 'Sally Field']::text[] where title = 'Forrest Gump' and release_year = 1994;
update public.movies set cast_members = ARRAY['Liam Neeson', 'Ben Kingsley', 'Ralph Fiennes', 'Embeth Davidtz']::text[] where title = 'Schindler''s List' and release_year = 1993;
update public.movies set cast_members = ARRAY['Henry Fonda', 'Lee J. Cobb', 'Martin Balsam', 'E.G. Marshall']::text[] where title = '12 Angry Men' and release_year = 1957;
update public.movies set cast_members = ARRAY['Tim Robbins', 'Morgan Freeman', 'Bob Gunton', 'William Sadler']::text[] where title = 'The Shawshank Redemption' and release_year = 1994;
update public.movies set cast_members = ARRAY['Daniel Day-Lewis', 'Paul Dano', 'Kevin J. O''Connor', 'Ciarán Hinds']::text[] where title = 'There Will Be Blood' and release_year = 2007;
update public.movies set cast_members = ARRAY['Mahershala Ali', 'Naomie Harris', 'Trevante Rhodes', 'Ashton Sanders']::text[] where title = 'Moonlight' and release_year = 2016;
update public.movies set cast_members = ARRAY['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong', 'Choi Woo-shik']::text[] where title = 'Parasite' and release_year = 2019;
update public.movies set cast_members = ARRAY['Jack Nicholson', 'Shelley Duvall', 'Danny Lloyd', 'Scatman Crothers']::text[] where title = 'The Shining' and release_year = 1980;
update public.movies set cast_members = ARRAY['Daniel Kaluuya', 'Allison Williams', 'Bradley Whitford', 'Catherine Keener']::text[] where title = 'Get Out' and release_year = 2017;
update public.movies set cast_members = ARRAY['Toni Collette', 'Alex Wolff', 'Milly Shapiro', 'Gabriel Byrne']::text[] where title = 'Hereditary' and release_year = 2018;
update public.movies set cast_members = ARRAY['Sigourney Weaver', 'Tom Skerritt', 'John Hurt', 'Ian Holm']::text[] where title = 'Alien' and release_year = 1979;
update public.movies set cast_members = ARRAY['Emily Blunt', 'John Krasinski', 'Millicent Simmonds', 'Noah Jupe']::text[] where title = 'A Quiet Place' and release_year = 2018;
update public.movies set cast_members = ARRAY['Ellen Burstyn', 'Max von Sydow', 'Linda Blair', 'Jason Miller']::text[] where title = 'The Exorcist' and release_year = 1973;
update public.movies set cast_members = ARRAY['Anthony Perkins', 'Janet Leigh', 'Vera Miles', 'John Gavin']::text[] where title = 'Psycho' and release_year = 1960;
update public.movies set cast_members = ARRAY['Harrison Ford', 'Rutger Hauer', 'Sean Young', 'Daryl Hannah']::text[] where title = 'Blade Runner' and release_year = 1982;
update public.movies set cast_members = ARRAY['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine']::text[] where title = 'Interstellar' and release_year = 2014;
update public.movies set cast_members = ARRAY['Amy Adams', 'Jeremy Renner', 'Forest Whitaker', 'Michael Stuhlbarg']::text[] where title = 'Arrival' and release_year = 2016;
update public.movies set cast_members = ARRAY['Keir Dullea', 'Gary Lockwood', 'William Sylvester', 'Douglas Rain']::text[] where title = '2001: A Space Odyssey' and release_year = 1968;
update public.movies set cast_members = ARRAY['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy']::text[] where title = 'Inception' and release_year = 2010;
update public.movies set cast_members = ARRAY['Timothée Chalamet', 'Rebecca Ferguson', 'Oscar Isaac', 'Zendaya']::text[] where title = 'Dune' and release_year = 2021;
update public.movies set cast_members = ARRAY['Henry Thomas', 'Drew Barrymore', 'Dee Wallace', 'Robert MacNaughton']::text[] where title = 'E.T. the Extra-Terrestrial' and release_year = 1982;
update public.movies set cast_members = ARRAY['Mark Hamill', 'Harrison Ford', 'Carrie Fisher', 'Alec Guinness']::text[] where title = 'Star Wars: A New Hope' and release_year = 1977;
update public.movies set cast_members = ARRAY['Ethan Hawke', 'Julie Delpy']::text[] where title = 'Before Sunrise' and release_year = 1995;
update public.movies set cast_members = ARRAY['Jim Carrey', 'Kate Winslet', 'Kirsten Dunst', 'Mark Ruffalo']::text[] where title = 'Eternal Sunshine of the Spotless Mind' and release_year = 2004;
update public.movies set cast_members = ARRAY['Keira Knightley', 'Matthew Macfadyen', 'Rosamund Pike', 'Donald Sutherland']::text[] where title = 'Pride & Prejudice' and release_year = 2005;
update public.movies set cast_members = ARRAY['Billy Crystal', 'Meg Ryan', 'Carrie Fisher', 'Bruno Kirby']::text[] where title = 'When Harry Met Sally...' and release_year = 1989;
update public.movies set cast_members = ARRAY['Ryan Gosling', 'Emma Stone', 'John Legend', 'J.K. Simmons']::text[] where title = 'La La Land' and release_year = 2016;
update public.movies set cast_members = ARRAY['Julia Roberts', 'Hugh Grant', 'Rhys Ifans', 'Emma Chambers']::text[] where title = 'Notting Hill' and release_year = 1999;
update public.movies set cast_members = ARRAY['Brad Pitt', 'Morgan Freeman', 'Gwyneth Paltrow', 'Kevin Spacey']::text[] where title = 'Se7en' and release_year = 1995;
update public.movies set cast_members = ARRAY['Tommy Lee Jones', 'Javier Bardem', 'Josh Brolin', 'Kelly Macdonald']::text[] where title = 'No Country for Old Men' and release_year = 2007;
update public.movies set cast_members = ARRAY['Ben Affleck', 'Rosamund Pike', 'Neil Patrick Harris', 'Tyler Perry']::text[] where title = 'Gone Girl' and release_year = 2014;
update public.movies set cast_members = ARRAY['Jodie Foster', 'Anthony Hopkins', 'Scott Glenn', 'Ted Levine']::text[] where title = 'The Silence of the Lambs' and release_year = 1991;
update public.movies set cast_members = ARRAY['Hugh Jackman', 'Jake Gyllenhaal', 'Viola Davis', 'Paul Dano']::text[] where title = 'Prisoners' and release_year = 2013;
update public.movies set cast_members = ARRAY['Jake Gyllenhaal', 'Mark Ruffalo', 'Robert Downey Jr.', 'Anthony Edwards']::text[] where title = 'Zodiac' and release_year = 2007;
update public.movies set cast_members = ARRAY['Rumi Hiiragi', 'Miyu Irino', 'Mari Natsuki', 'Bunta Sugawara']::text[] where title = 'Spirited Away' and release_year = 2001;
update public.movies set cast_members = ARRAY['Tom Hanks', 'Tim Allen', 'Don Rickles', 'Annie Potts']::text[] where title = 'Toy Story' and release_year = 1995;
update public.movies set cast_members = ARRAY['Shameik Moore', 'Hailee Steinfeld', 'Jake Johnson', 'Mahershala Ali']::text[] where title = 'Spider-Man: Into the Spider-Verse' and release_year = 2018;
update public.movies set cast_members = ARRAY['Ben Burtt', 'Elissa Knight', 'Jeff Garlin', 'Fred Willard']::text[] where title = 'WALL-E' and release_year = 2008;
update public.movies set cast_members = ARRAY['Eli Marienthal', 'Jennifer Aniston', 'Harry Connick Jr.', 'Vin Diesel']::text[] where title = 'The Iron Giant' and release_year = 1999;
update public.movies set cast_members = ARRAY['Anthony Gonzalez', 'Gael García Bernal', 'Benjamin Bratt', 'Alanna Ubach']::text[] where title = 'Coco' and release_year = 2017;
update public.movies set cast_members = ARRAY['Ed Asner', 'Jordan Nagai', 'Christopher Plummer', 'Bob Peterson']::text[] where title = 'Up' and release_year = 2009;
update public.movies set cast_members = ARRAY['Elijah Wood', 'Ian McKellen', 'Viggo Mortensen', 'Sean Astin']::text[] where title = 'The Lord of the Rings: The Fellowship of the Ring' and release_year = 2001;
update public.movies set cast_members = ARRAY['Ivana Baquero', 'Sergi López', 'Maribel Verdú', 'Doug Jones']::text[] where title = 'Pan''s Labyrinth' and release_year = 2006;
update public.movies set cast_members = ARRAY['Cary Elwes', 'Robin Wright', 'Mandy Patinkin', 'André the Giant']::text[] where title = 'The Princess Bride' and release_year = 1987;
update public.movies set cast_members = ARRAY['Daniel Radcliffe', 'Rupert Grint', 'Emma Watson', 'Gary Oldman']::text[] where title = 'Harry Potter and the Prisoner of Azkaban' and release_year = 2004;
update public.movies set cast_members = ARRAY['Ewan McGregor', 'Albert Finney', 'Billy Crudup', 'Jessica Lange']::text[] where title = 'Big Fish' and release_year = 2003;
update public.movies set cast_members = ARRAY['Alex Honnold', 'Tommy Caldwell', 'Sanni McCandless']::text[] where title = 'Free Solo' and release_year = 2018;
update public.movies set cast_members = ARRAY['Fred Rogers', 'Joanne Rogers', 'François Clemmons']::text[] where title = 'Won''t You Be My Neighbor?' and release_year = 2018;
update public.movies set cast_members = ARRAY['Amy Winehouse', 'Mitch Winehouse', 'Mark Ronson']::text[] where title = 'Amy' and release_year = 2015;
update public.movies set cast_members = ARRAY['Angela Davis', 'Michelle Alexander', 'Cory Booker', 'Bryan Stevenson']::text[] where title = '13th' and release_year = 2016;
update public.movies set cast_members = ARRAY['Philippe Petit', 'Jean-Louis Blondeau', 'Annie Allix']::text[] where title = 'Man on Wire' and release_year = 2008;

-- The joined view expands m.* when it's created, so rebuild it to pick up
-- the new column.
drop view if exists public.movies_with_genres;
create view public.movies_with_genres as
select
  m.*,
  coalesce(
    array_agg(mg.genre_slug order by mg.genre_slug) filter (where mg.genre_slug is not null),
    '{}'
  ) as genre_slugs
from public.movies m
left join public.movie_genres mg on mg.movie_id = m.id
group by m.id;
