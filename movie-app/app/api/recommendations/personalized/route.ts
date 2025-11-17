// api/recommendations/personalized/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

interface PersonalizedMovie {
  mov_uid: number;
  title: string;
  duration: number;
  age_rating: string;
  watch_count: number;
  avg_rating: number;
}


/*
QUERY steps-

- count how many times a user has watched a movie from each genre

- find the max times a user has watched a certain genre


- Calculate the genre score for each movie
- We do this by dividing the amount of times the user has watched that genre by the max number of times they've watched any genre
- If the movie has multiple genres, the avg score is given

- Find all of the film contributors the user likes
- Do this by collecting all film contributors who were in a movie where the user it rated at least a 4 

- For each movie, give it a score based on how many of it's film contributors are liked by the user

- Get a count of each time the user has watched a movie with each age_rating 

- Find the maximum number of times that a user has watched movies of a specific age rating

- Give each movie an age_rating score based on how much the user likes that age_rating
- We do this by dividing the amount of times the user has watched that age_rating by the max number of times they've watched any age rating

- Check if the user has watched any movies

- Give each movie that the user has not watched a personal_score
- This is done by taking the average of the genre, film contributor, and age_rating scores
- If the user hasn't watched any movies, return nothing

- Find the 20 most similar users and give each a similarity score
- Do this by finding the 20 users with the most similar rankings of movies as the user

- Count how many similar users have seen the movie and rated it at least a 3

- For each movie, boost the score using the similar user counts

- Return the top 20 movies sorted by their scores, aong with their average rating and watch count
*/

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { rows } = await query<PersonalizedMovie>(
      `
      WITH 

      user_genre_counts AS (
        SELECT mg.genre_uid, COUNT(*) AS genre_watch_count
        FROM p320_49.watches w
        JOIN p320_49.movie_genre mg ON w.mov_uid = mg.mov_uid
        WHERE w.user_id = $1
        GROUP BY mg.genre_uid
      ),
      
      max_genre_count AS (
        SELECT MAX(genre_watch_count) AS max_count
        FROM user_genre_counts
      ),

      movie_genre_score AS (
        SELECT 
          m.mov_uid,
          COALESCE(AVG(ugc.genre_watch_count::float / mgc.max_count), 0.0) AS genre_score
        FROM p320_49.movie m
        JOIN p320_49.movie_genre mg ON m.mov_uid = mg.mov_uid
        LEFT JOIN user_genre_counts ugc ON mg.genre_uid = ugc.genre_uid
        CROSS JOIN max_genre_count mgc
        GROUP BY m.mov_uid
      ),

      user_top_contributors AS (
        SELECT DISTINCT fc.fc_uid
        FROM p320_49.rates r
        JOIN p320_49.casts_In ci ON r.mov_uid = ci.mov_uid
        JOIN p320_49.film_contributor fc ON ci.fc_uid = fc.fc_uid
        WHERE r.user_id = $1 AND r.rating_value >= 4
      ),

      movie_contributor_score AS (
        SELECT 
          m.mov_uid,
          COALESCE(
            COUNT(utc.fc_uid)::float / NULLIF(COUNT(fc.fc_uid),0),
            0.0
          ) AS film_contributor_score
        FROM p320_49.movie m
        JOIN p320_49.casts_in ci ON m.mov_uid = ci.mov_uid
        JOIN p320_49.film_contributor fc ON ci.fc_uid = fc.fc_uid
        LEFT JOIN user_top_contributors utc ON fc.fc_uid = utc.fc_uid
        GROUP BY m.mov_uid
      ),

      user_age_rating_counts AS (
        SELECT m.age_rating, COUNT(*) AS rating_count
        FROM p320_49.watches w
        JOIN p320_49.movie m ON w.mov_uid = m.mov_uid
        WHERE w.user_id = $1
        GROUP BY m.age_rating
      ),

      max_age_count AS (
        SELECT MAX(rating_count) AS max_count
        FROM user_age_rating_counts
      ),

      movie_age_score AS (
        SELECT 
          m.mov_uid,
          COALESCE(uarc.rating_count::float / mac.max_count, 0.0) AS age_rating_score
        FROM p320_49.movie m
        LEFT JOIN user_age_rating_counts uarc ON m.age_rating = uarc.age_rating
        CROSS JOIN max_age_count mac
      ),

      user_has_watches AS (
        SELECT EXISTS (
          SELECT 1 FROM p320_49.watches WHERE user_id = $1
        ) AS has_watches
      ),

      personal_movie_score AS (
        SELECT 
          m.mov_uid,
          (mg.genre_score + mc.film_contributor_score + ma.age_rating_score) / 3.0 AS final_score
        FROM p320_49.movie m
        JOIN movie_genre_score mg ON m.mov_uid = mg.mov_uid
        JOIN movie_contributor_score mc ON m.mov_uid = mc.mov_uid
        JOIN movie_age_score ma ON m.mov_uid = ma.mov_uid
        CROSS JOIN user_has_watches uhw
        WHERE uhw.has_watches = TRUE
          AND m.mov_uid NOT IN (
            SELECT mov_uid FROM watches WHERE user_id = $1
          )
      ),

      similar_users AS (
        SELECT *
        FROM (
          SELECT u.user_id,
            SUM(
              CASE 
                WHEN r1.rating_value IS NOT NULL AND r2.rating_value IS NOT NULL THEN
                  CASE
                    WHEN r1.rating_value = r2.rating_value THEN 1
                    WHEN abs(r1.rating_value - r2.rating_value) = 1 THEN 0.75
                    ELSE 0.25
                  END
                ELSE 0.5
              END
            ) AS similarity_score
          FROM p320_49.user u
          JOIN p320_49.watches w1 ON u.user_id = w1.user_id
          LEFT JOIN Rates r1 ON w1.mov_uid = r1.mov_uid AND r1.user_id = u.user_id
          LEFT JOIN Rates r2 ON w1.mov_uid = r2.mov_uid AND r2.user_id = $1
          WHERE u.user_id != $1
          GROUP BY u.user_id
          ORDER BY similarity_score DESC
        ) AS ordered_users
        LIMIT 20
      ),

      movie_similar_users_boost AS (
        SELECT wm.mov_uid, COUNT(*) AS num_similar_users
        FROM p320_49.watches wm
        JOIN similar_users su ON wm.user_id = su.user_id
        JOIN p320_49.rates r ON r.user_id = wm.user_id 
          AND r.mov_uid = wm.mov_uid
          AND r.rating_value >= 3
        GROUP BY wm.mov_uid
      ),

      final_recommendation AS (
        SELECT pms.mov_uid,
          pms.final_score * (1 + 0.1 * COALESCE(msub.num_similar_users, 0)) AS boosted_score
        FROM personal_movie_score pms
        LEFT JOIN movie_similar_users_boost msub ON pms.mov_uid = msub.mov_uid
      )

      SELECT 
        m.mov_uid,
        m.title,
        m.duration,
        m.age_rating,
        COUNT(w.user_id)::int AS watch_count,
        COALESCE(AVG(r.rating_value), 0)::float AS avg_rating,
        fr.boosted_score
      FROM final_recommendation fr
      JOIN p320_49.movie m ON fr.mov_uid = m.mov_uid
      LEFT JOIN p320_49.watches w ON m.mov_uid = w.mov_uid
      LEFT JOIN p320_49.rates r ON m.mov_uid = r.mov_uid
      GROUP BY m.mov_uid, m.title, m.duration, m.age_rating, fr.boosted_score
      ORDER BY fr.boosted_score DESC
      LIMIT 20;
      `,
      [me.userId]
    );

    return NextResponse.json({ movies: rows });
  } catch (err: any) {
    console.error("GET /api/recommendations/personalized error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}