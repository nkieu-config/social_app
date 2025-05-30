import { useState, useEffect } from 'react';
import axios from 'axios';
import PostCard from '../components/PostCard';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    fullName?: string;
    avatar?: string;
  };
  _count: {
    likes: number;
    comments: number;
  };
}

interface User {
  id: string;
  username: string;
  fullName?: string;
  avatar?: string;
}

const ExplorePage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchExplorePosts();
  }, [page]);

  useEffect(() => {
    if (search.trim()) {
      searchUsers();
    } else {
      setUsers([]);
      setIsSearching(false);
    }
  }, [search]);

  const fetchExplorePosts = async () => {
    try {
      setIsLoading(true);
      
      const response = await axios.get(`http://localhost:3001/api/posts/explore/discover?page=${page}&limit=10`);
      
      const newPosts = response.data.posts;
      const totalPages = response.data.pagination.totalPages;
      
      setPosts(prev => page === 1 ? newPosts : [...prev, ...newPosts]);
      setHasMore(page < totalPages);
      
      // Fetch like status for each post
      const postIds = newPosts.map((post: Post) => post.id);
      await fetchLikeStatus(postIds);
    } catch (error) {
      console.error('Error fetching explore posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLikeStatus = async (postIds: string[]) => {
    try {
      const likePromises = postIds.map(id => 
        axios.get(`http://localhost:3001/api/likes/${id}/check`)
      );
      
      const responses = await Promise.all(likePromises);
      
      const newLikedPosts = new Set(likedPosts);
      
      responses.forEach((response, index) => {
        if (response.data.liked) {
          newLikedPosts.add(postIds[index]);
        }
      });
      
      setLikedPosts(newLikedPosts);
    } catch (error) {
      console.error('Error fetching like status:', error);
    }
  };

  const searchUsers = async () => {
    if (!search.trim()) return;
    
    setIsSearching(true);
    
    try {
      const response = await axios.get(`http://localhost:3001/api/users?search=${search}`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts(prev => prev.filter(post => post.id !== deletedPostId));
  };

  return (
    <div className="p-4 pb-20 md:pb-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Explore</h1>
        
        <div className="mt-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Search Results */}
      {search.trim() && (
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3">People</h2>
          {users.length > 0 ? (
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {users.map(user => (
                <Link
                  key={user.id}
                  to={`/profile/${user.username}`}
                  className="flex items-center p-4 hover:bg-gray-50 transition"
                >
                  {user.avatar && (
                    <img 
                      src={user.avatar} 
                      alt={user.username} 
                      className="w-10 h-10 rounded-full mr-3"
                    />
                  )}
                  <div>
                    <h3 className="font-medium">{user.fullName || user.username}</h3>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-gray-600">
                {isSearching ? 'Searching...' : 'No users found'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Explore Posts */}
      {!search.trim() && (
        <>
          <h2 className="text-lg font-medium mb-3">Discover</h2>
          
          {posts.length === 0 && !isLoading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">No posts to explore</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  content={post.content}
                  imageUrl={post.imageUrl}
                  createdAt={post.createdAt}
                  user={post.user}
                  likesCount={post._count.likes}
                  commentsCount={post._count.comments}
                  isLiked={likedPosts.has(post.id)}
                  onDelete={() => handlePostDeleted(post.id)}
                />
              ))}

              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className={`px-6 py-2 rounded-full text-white ${
                      isLoading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {isLoading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExplorePage;