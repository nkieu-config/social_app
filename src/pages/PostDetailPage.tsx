import { useState, useEffect, FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { Heart, ArrowLeft, MoreHorizontal } from "lucide-react";

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
  comments: Comment[];
  _count: {
    likes: number;
    comments: number;
  };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const PostDetailPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
      checkLikeStatus();
    }
  }, [postId, page]);

  const fetchPost = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/posts/${postId}`);
      setPost(response.data);
      setLikesCount(response.data._count.likes);
    } catch (err) {
      console.error("Error fetching post:", err);
      setError("Failed to load post.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/comments/post/${postId}?page=${page}&limit=10`
      );

      const newComments = response.data.comments;
      const totalPages = response.data.pagination.totalPages;

      setComments((prev) =>
        page === 1 ? newComments : [...prev, ...newComments]
      );
      setHasMore(page < totalPages);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const checkLikeStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/likes/${postId}/check`);
      setIsLiked(response.data.liked);
    } catch (error) {
      console.error("Error checking like status:", error);
    }
  };

  const toggleLike = async () => {
    try {
      if (isLiked) {
        await axios.delete(`${API_URL}/likes/${postId}`);
        setLikesCount((prev) => prev - 1);
      } else {
        await axios.post(`${API_URL}/likes`, { postId });
        setLikesCount((prev) => prev + 1);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await axios.post(`${API_URL}/comments`, {
        postId,
        content: newComment.trim(),
      });

      // Add new comment to top of list
      setComments((prev) => [response.data, ...prev]);

      // Update comment count in post
      if (post) {
        setPost({
          ...post,
          _count: {
            ...post._count,
            comments: post._count.comments + 1,
          },
        });
      }

      // Clear form
      setNewComment("");
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/comments/${commentId}`);

      // Remove comment from list
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));

      // Update comment count in post
      if (post) {
        setPost({
          ...post,
          _count: {
            ...post._count,
            comments: post._count.comments - 1,
          },
        });
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/posts/${postId}`);
      navigate("/");
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleLoadMoreComments = () => {
    setPage((prev) => prev + 1);
  };

  if (isLoading && !post) {
    return (
      <div className="p-4 flex justify-center">
        <div className="spinner w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error || "Post not found"}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 flex items-center text-blue-500 hover:underline"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Go Back
        </button>
      </div>
    );
  }

  const formattedDate = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
  });
  const isPostOwner = currentUser?.id === post.user.id;

  return (
    <div className="p-4 pb-20 md:pb-4">
      <div className="flex items-center mb-4">
        <button
          onClick={() => navigate(-1)}
          className="mr-2 p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Post</h1>
      </div>

      {/* Post */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between">
          <Link
            to={`/profile/${post.user.username}`}
            className="flex items-center"
          >
            {post.user.avatar && (
              <img
                src={post.user.avatar}
                alt={post.user.username}
                className="w-10 h-10 rounded-full mr-3"
              />
            )}
            <div>
              <h3 className="font-medium">
                {post.user.fullName || post.user.username}
              </h3>
              <p className="text-sm text-gray-500">@{post.user.username}</p>
            </div>
          </Link>

          <div className="relative">
            {isPostOwner && (
              <>
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                {showOptions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <button
                      onClick={handleDeletePost}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete Post
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-3">
          <p className="text-gray-800 whitespace-pre-line">{post.content}</p>

          {post.imageUrl && (
            <div className="mt-3">
              <img
                src={post.imageUrl}
                alt="Post"
                className="rounded-lg max-h-96 w-auto"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://via.placeholder.com/800x400?text=Image+Not+Available";
                }}
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-gray-500 text-sm">
          <span>{formattedDate}</span>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleLike}
              className={`flex items-center space-x-1 ${
                isLiked ? "text-red-500" : "hover:text-red-500"
              }`}
            >
              <Heart
                className="w-5 h-5"
                fill={isLiked ? "currentColor" : "none"}
              />
              <span>{likesCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comment Form */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form onSubmit={handleSubmitComment}>
          <div className="flex items-start space-x-3">
            {currentUser?.avatar && (
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div className="flex-1">
              <textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition"
                rows={2}
              />

              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className={`px-4 py-2 rounded-full font-medium text-white ${
                    isSubmitting || !newComment.trim()
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600 transition"
                  }`}
                >
                  {isSubmitting ? "Posting..." : "Comment"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Comments */}
      <div>
        <h2 className="text-lg font-medium mb-4">
          Comments ({post._count.comments})
        </h2>

        {comments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">
              No comments yet. Be the first to comment!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between">
                  <Link
                    to={`/profile/${comment.user.username}`}
                    className="flex items-center"
                  >
                    {comment.user.avatar && (
                      <img
                        src={comment.user.avatar}
                        alt={comment.user.username}
                        className="w-8 h-8 rounded-full mr-2"
                      />
                    )}
                    <span className="font-medium">
                      @{comment.user.username}
                    </span>
                  </Link>

                  {(currentUser?.id === comment.user.id ||
                    currentUser?.id === post.user.id) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <p className="mt-2 text-gray-800">{comment.content}</p>

                <div className="mt-2 text-xs text-gray-500">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleLoadMoreComments}
                  className="px-6 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 transition"
                >
                  Load More Comments
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetailPage;
