import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import PostCard from "../components/PostCard";
import { MessageCircle, Calendar, UserPlus, UserMinus } from "lucide-react";
import { format } from "date-fns";

interface User {
  id: string;
  username: string;
  fullName?: string;
  bio?: string;
  avatar?: string;
  createdAt: string;
  _count: {
    posts: number;
    followers: number;
    following: number;
  };
}

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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const ProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const { isUserOnline } = useSocket();

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (username) {
      fetchUserProfile();
      fetchUserPosts();
      checkFollowStatus();
    }
  }, [username, page]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/users/${username}`);
      setUser(response.data);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/posts/user/${username}?page=${page}&limit=10`
      );

      const newPosts = response.data.posts;
      const totalPages = response.data.pagination.totalPages;

      setPosts((prev) => (page === 1 ? newPosts : [...prev, ...newPosts]));
      setHasMore(page < totalPages);

      // Fetch like status for each post
      const postIds = newPosts.map((post: Post) => post.id);
      await fetchLikeStatus(postIds);
    } catch (error) {
      console.error("Error fetching user posts:", error);
    }
  };

  const fetchLikeStatus = async (postIds: string[]) => {
    try {
      const likePromises = postIds.map((id) =>
        axios.get(`${API_URL}/likes/${id}/check`)
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
      console.error("Error fetching like status:", error);
    }
  };

  const checkFollowStatus = async () => {
    if (!username || !currentUser || username === currentUser.username) return;

    try {
      const response = await axios.get(`${API_URL}/users/${username}`);
      const userId = response.data.id;

      const followResponse = await axios.get(
        `${API_URL}/follows/${userId}/check`
      );
      setIsFollowing(followResponse.data.following);
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  const handleFollow = async () => {
    if (!user || !currentUser) return;

    setFollowLoading(true);

    try {
      if (isFollowing) {
        await axios.delete(`${API_URL}/follows/${user.id}`);
        setIsFollowing(false);
      } else {
        await axios.post(`${API_URL}/follows`, { followingId: user.id });
        setIsFollowing(true);
      }

      // Update follower count
      fetchUserProfile();
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== deletedPostId));
  };

  if (isLoading && !user) {
    return (
      <div className="p-4 flex justify-center">
        <div className="spinner w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error || "User not found"}
        </div>
      </div>
    );
  }

  const isCurrentUser = currentUser?.username === username;
  const joinDate = new Date(user.createdAt);
  const formattedJoinDate = format(joinDate, "MMMM yyyy");
  const isOnline = user.id && isUserOnline(user.id);

  return (
    <div className="p-4 pb-20 md:pb-4">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="relative">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-24 h-24 rounded-full border-2 border-white shadow"
                />
              )}
              {isOnline && (
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold">
                {user.fullName || user.username}
              </h1>
              <p className="text-gray-600 mb-2">@{user.username}</p>

              {user.bio && <p className="text-gray-800 mb-4">{user.bio}</p>}

              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 mb-4">
                <div className="text-center">
                  <div className="font-bold">{user._count.posts}</div>
                  <div className="text-gray-600 text-sm">Posts</div>
                </div>

                <div className="text-center">
                  <div className="font-bold">{user._count.followers}</div>
                  <div className="text-gray-600 text-sm">Followers</div>
                </div>

                <div className="text-center">
                  <div className="font-bold">{user._count.following}</div>
                  <div className="text-gray-600 text-sm">Following</div>
                </div>

                <div className="flex items-center text-gray-600 text-sm">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Joined {formattedJoinDate}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {!isCurrentUser && (
                <>
                  <Link
                    to={`/messages/${user.id}`}
                    className="flex items-center px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 transition"
                  >
                    <MessageCircle className="w-5 h-5 mr-1" />
                    <span>Message</span>
                  </Link>

                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`flex items-center px-4 py-2 rounded-full transition ${
                      isFollowing
                        ? "bg-gray-100 hover:bg-gray-200 text-gray-800"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="w-5 h-5 mr-1" />
                        <span>Unfollow</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5 mr-1" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {isCurrentUser && (
                <Link
                  to="/settings"
                  className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 transition"
                >
                  Edit Profile
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Posts */}
      <div>
        <h2 className="text-xl font-bold mb-4">Posts</h2>

        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No posts yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
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
                  className="px-6 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
