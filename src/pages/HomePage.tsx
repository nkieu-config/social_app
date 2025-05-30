import { useState, useEffect } from 'react';
import axios from 'axios';
import CreatePostForm from '../components/CreatePostForm';
import PostCard from '../components/PostCard';

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

const HomePage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPosts();
  }, [page]);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await axios.get(`http://localhost:3001/api/posts/feed/following?page=${page}&limit=10`);
      
      const newPosts = response.data.posts;
      const totalPages = response.data.pagination.totalPages;
      
      setPosts(prev => page === 1 ? newPosts : [...prev, ...newPosts]);
      setHasMore(page < totalPages);
      
      // Fetch like status for each post
      const postIds = newPosts.map((post: Post) => post.id);
      await fetchLikeStatus(postIds);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
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

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const handlePostCreated = () => {
    setPage(1);
    fetchPosts();
  };

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts(prev => prev.filter(post => post.id !== deletedPostId));
  };

  return (
    <div className="p-4 pb-20 md:pb-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Home</h1>
      </div>

      <CreatePostForm onPostCreated={handlePostCreated} />

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {posts.length === 0 && !isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h3 className="text-xl font-medium mb-2">No posts yet</h3>
          <p className="text-gray-600 mb-4">
            Your feed is empty. Follow other users to see their posts here, or create your first post!
          </p>
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
    </div>
  );
};

export default HomePage;