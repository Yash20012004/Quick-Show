import axios, { Axios } from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
//API to get now playing movies from TMDI API
import axiosInstance from '../configs/axiosConfig.js'; // adjust the path if needed
export const getNowPlayingMovies = async (req, res) => {
  try {
    const { data } = await axiosInstance.get(
      'https://api.themoviedb.org/3/movie/now_playing',
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
      }
    );

    const movies = data.results;

    res.status(200).json({ success: true, movies });
  } catch (error) {
    console.error('Error fetching now playing movies:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch movies' });
  }
};
// API to add new show to database
export const addShow = async (req, res) => {
  try {
    const { movieId, showInput, showPrice } = req.body;
    let movie = await Movie.findById(movieId);

    // If movie not found in DB, fetch from TMDB and add to DB
    if (!movie) {
      const [movieDetailResponse, movieCreditResponse] = await Promise.all([
        axiosInstance.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        }),
        axiosInstance.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        }),
      ]);

      const movieApiData = movieDetailResponse.data;
      const movieCreditsData = movieCreditResponse.data;

      const movieDetails = {
        _id: movieId,
        title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path: movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        genres: movieApiData.genres,
        casts: movieCreditsData.cast,
        release_date: movieApiData.release_date,
        original_language: movieApiData.original_language,
        tagline: movieApiData.tagline || "",
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
      };

      movie = await Movie.create(movieDetails);
    }

    // ✅ Create shows regardless of whether movie was new or already existed
    const showsToCreate = [];
    for (const show of showInput) {
      const showDate = show.date;
      for (const time of show.time) {
        const dateTimeString = `${showDate}T${time}`;
        const showDateTime = new Date(dateTimeString);

        // Check if a show with this movie and datetime already exists
        const existingShow = await Show.findOne({
          movie: movieId,
          showDateTime,
        });

        if (!existingShow) {
          showsToCreate.push({
            movie: movieId,
            showDateTime,
            showPrice,
            occupiedSeats: {},
          });
        }
      }
    }

    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    res.json({ success: true, message: "Show(s) added successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all shows from DateBase
export const getShows = async (req, res) => {
  try {
    // 1. Get all upcoming shows
    const shows = await Show.find({
      showDateTime: { $gte: new Date() }
    }).sort({ showDateTime: 1 });
    console.log("🔍 Upcoming shows found:", shows.length);  // Add this line
    // 2. Get unique movie IDs from the shows
    const uniqueMovieIds = [...new Set(shows.map(show => show.movie))];

    // 3. Fetch the corresponding movie documents
    const movies = await Movie.find({
      _id: { $in: uniqueMovieIds }
    });

    // 4. Return movie list
    res.json({ success: true, shows: movies });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
// API to get single Show from the db
export const getShow=async (req,res)=>{
    try {
        const {movieId}=req.params;
        //get all upcoming shows for the movie
        const shows=await Show.find({movie:movieId,showDateTime:{$gte:new Date()}})

        const movie=await Movie.findById(movieId);
        const dateTime={};

        shows.forEach((show)=>{
            const date=show.showDateTime.toISOString().split("T")[0];
            if(!dateTime[date]){
                dateTime[date]=[]
            }
            dateTime[date].push({time:show.showDateTime,showId:show._id})
        })
        
        res.json({success:true,movie,dateTime})
    } catch (error) {
        console.error(error);
        res.json({success:false,message:error.message});
    }
}