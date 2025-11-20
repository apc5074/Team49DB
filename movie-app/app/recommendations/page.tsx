"use client";

import React, { useState, useEffect } from 'react';
import { Film, TrendingUp, Users, Star, ArrowUpDown, Sparkle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface Movie {
  mov_uid: number;
  title: string;
  duration: number;
  age_rating: string;
  watch_count?: number;
  friend_count?: number;
  total_watches?: number;
  avg_rating: number;
  earliest_release?: string;
}

interface ApiResponse {
  movies: Movie[];
  hasFollowing?: boolean;
  error?: string;
}

type SortOption = 'watches' | 'rating';

export default function MovieDashboard() {
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [followingMovies, setFollowingMovies] = useState<Movie[]>([]);
  const [newReleases, setNewReleases] = useState<Movie[]>([]);
  const [personalizedMovies, setPersonalizedMovies] = useState<Movie[]>([]);
  const [trendingSortBy, setTrendingSortBy] = useState<SortOption>('watches');
  const [friendsSortBy, setFriendsSortBy] = useState<SortOption>('watches');
  const [releasesSortBy, setReleasesSortBy] = useState<SortOption>('watches');
  const [loading, setLoading] = useState({ 
    popular: true, 
    following: true, 
    releases: true,
    personalized: true
  });
  const [error, setError] = useState<Record<string, string>>({});
  const [hasFollowing, setHasFollowing] = useState(false);

  useEffect(() => {
    fetchPopularMovies(trendingSortBy);
  }, [trendingSortBy]);

  useEffect(() => {
    fetchFollowingMovies(friendsSortBy);
  }, [friendsSortBy]);

  useEffect(() => {
    fetchNewReleases(releasesSortBy);
  }, [releasesSortBy]);

  useEffect(() => {
    fetchPersonalizedMovies();
  }, []);

  const fetchPopularMovies = async (sortBy: SortOption) => {
    setLoading(prev => ({ ...prev, popular: true }));
    try {
      const response = await fetch(`/api/recommendations/popular-recent?sortBy=${sortBy}`);
      const data: ApiResponse = await response.json();
      
      if (response.ok && data.movies) {
        setPopularMovies(data.movies);
      } else {
        setError(prev => ({ ...prev, popular: data.error || 'Failed to load' }));
      }
    } catch (err) {
      setError(prev => ({ ...prev, popular: 'Failed to load popular movies' }));
    } finally {
      setLoading(prev => ({ ...prev, popular: false }));
    }
  };

  const fetchFollowingMovies = async (sortBy: SortOption) => {
    setLoading(prev => ({ ...prev, following: true }));
    try {
      const response = await fetch(`/api/recommendations/popular-following?sortBy=${sortBy}`);
      const data: ApiResponse = await response.json();
      
      if (response.ok && data.movies) {
        setFollowingMovies(data.movies);
        setHasFollowing(data.hasFollowing || false);
      } else if (response.status === 401) {
        setError(prev => ({ ...prev, following: 'Please log in to see this section' }));
      } else {
        setError(prev => ({ ...prev, following: data.error || 'Failed to load' }));
      }
    } catch (err) {
      setError(prev => ({ ...prev, following: 'Failed to load following movies' }));
    } finally {
      setLoading(prev => ({ ...prev, following: false }));
    }
  };

  const fetchNewReleases = async (sortBy: SortOption) => {
    setLoading(prev => ({ ...prev, releases: true }));
    try {
      const response = await fetch(`/api/recommendations/new-releases?sortBy=${sortBy}`);
      const data: ApiResponse = await response.json();
      
      if (response.ok && data.movies) {
        setNewReleases(data.movies);
      } else {
        setError(prev => ({ ...prev, releases: data.error || 'Failed to load' }));
      }
    } catch (err) {
      setError(prev => ({ ...prev, releases: 'Failed to load new releases' }));
    } finally {
      setLoading(prev => ({ ...prev, releases: false }));
    }
  };

  const fetchPersonalizedMovies = async () => {
    try {
      const response = await fetch('/api/recommendations/personalized');
      const data: ApiResponse = await response.json();
      
      if (response.ok && data.movies) {
        setPersonalizedMovies(data.movies);
      } else {
        setError(prev => ({ ...prev, personalized: data.error || 'Failed to load' }));
      }
    } catch (err) {
      setError(prev => ({ ...prev, personalized: 'Failed to load personalized movies' }));
    } finally {
      setLoading(prev => ({ ...prev, personalized: false }));
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600'; // Gold
      case 2:
        return 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500'; // Silver
      case 3:
        return 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800'; // Bronze
      default:
        return 'bg-gradient-to-b from-black/70 via-black/70 to-black'; // Default gradient
    }
  };

  const MovieCard: React.FC<{ 
    movie: Movie; 
    rank: number; 
    showReleaseDate?: boolean;
    showFriendStats?: boolean;
  }> = ({ 
    movie, 
    rank, 
    showReleaseDate = false,
    showFriendStats = false
  }) => (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className={`shrink-0 w-12 h-12 ${getRankStyle(rank)} rounded-lg flex items-center justify-center text-white font-bold text-lg`}>
        #{rank}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-lg truncate">{movie.title}</h3>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Film size={14} />
            {formatDuration(movie.duration)}
          </span>
          <span className="px-2 py-0.5 bg-gray-100 rounded">{movie.age_rating}</span>
          
          {showFriendStats ? (
            <>
              <span className="flex items-center gap-1 text-purple-600 font-medium">
                <Users size={14} />
                {movie.friend_count} {movie.friend_count === 1 ? 'friend' : 'friends'}
              </span>
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <TrendingUp size={14} />
                {movie.total_watches} {movie.total_watches === 1 ? 'watch' : 'watches'}
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1 text-blue-600 font-medium">
              <TrendingUp size={14} />
              {movie.watch_count} watches
            </span>
          )}
          
          {movie.avg_rating > 0 && (
            <span className="flex items-center gap-1 text-yellow-600">
              <Star size={14} fill="currentColor" />
              {movie.avg_rating.toFixed(1)}
            </span>
          )}
          {showReleaseDate && movie.earliest_release && (
            <span className="text-green-600 font-medium">
              Released {formatDate(movie.earliest_release)}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const Section: React.FC<{
    title: string;
    icon: React.ElementType;
    movies: Movie[];
    loading: boolean;
    error?: string;
    emptyMessage: string;
    showReleaseDate?: boolean;
    showFriendStats?: boolean;
    showSorting?: boolean;
    sortBy?: SortOption;
    onSortChange?: (sort: SortOption) => void;
    caption?: string;
  }> = ({ 
    title, 
    icon: Icon, 
    movies, 
    loading, 
    error, 
    emptyMessage, 
    showReleaseDate = false,
    showFriendStats = false,
    showSorting = false,
    sortBy = 'watches',
    onSortChange,
    caption
  }) => (
    <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon className="text-blue-600" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            {caption && (
              <p className="text-sm text-gray-500 mt-0.5">{caption}</p>
            )}
          </div>
        </div>
        {showSorting && onSortChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="w-4 h-4" />
                {sortBy === 'watches' ? 'Most Watched' : 'Highest Rated'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSortChange('watches')}>
                Most Watched
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange('rating')}>
                Highest Rated
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {movies.map((movie, idx) => (
            <MovieCard 
              key={movie.mov_uid} 
              movie={movie} 
              rank={idx + 1}
              showReleaseDate={showReleaseDate}
              showFriendStats={showFriendStats}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-linear-to-br from-gray-100 to-gray-200 p-6">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Recommendations</h1>
                <p className="text-gray-600">Discover trending movies, new releases, and movies we think you&apos;ll like</p>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title="Trending Now"
              icon={TrendingUp}
              movies={popularMovies}
              loading={loading.popular}
              error={error.popular}
              emptyMessage="No trending movies found in the last 90 days"
              showSorting={true}
              sortBy={trendingSortBy}
              onSortChange={setTrendingSortBy}
              caption="In the last 90 days"
            />
            
            <Section
              title="Popular with Friends"
              icon={Users}
              movies={followingMovies}
              loading={loading.following}
              error={error.following}
              emptyMessage={hasFollowing ? "Your friends haven't watched any movies yet" : "You're not following anyone yet. Start following users to see what they're watching!"}
              showSorting={true}
              sortBy={friendsSortBy}
              onSortChange={setFriendsSortBy}
              showFriendStats={true}
            />

            <Section
              title="New Releases This Month"
              icon={Star}
              movies={newReleases}
              loading={loading.releases}
              error={error.releases}
              emptyMessage="No new releases this month"
              showReleaseDate={true}
              showSorting={true}
              sortBy={releasesSortBy}
              onSortChange={setReleasesSortBy}
            />
            
            <Section
              title="Personalized Recommendations"
              icon={Sparkle}
              movies={personalizedMovies}
              loading={loading.personalized}
              error={error.personalized}
              emptyMessage="Watch more movies to get personalized recommendations"
            />
          </div>
        </div>
      </div>
    </>
  );
}