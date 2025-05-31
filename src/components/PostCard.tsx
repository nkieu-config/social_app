import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

interface User {
  id: string;
  username: string;
  fullName?: string;
  avatar?: string;
}

interface PostCardProps {
  id: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  user: User;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  onDelete?: () => void;
}

const PostCard = ({
  id,
  content,
  imageUrl,
  createdAt,
  user,
  likesCount,
  commentsCount,
  isLiked: initialIsLiked = false,
  onDelete,
}: PostCardProps) => {
  const { user: currentUser } = useAuth();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likes, setLikes] = useState(likesCount);
  const [showOptions, setShowOptions] = useState(false);

  const toggleLike = async () => {
    try {
      if (isLiked) {
        await axios.delete(`${API_URL}/likes/${id}`);
        setLikes((prev) => prev - 1);
      } else {
        await axios.post(`${API_URL}/likes`, { postId: id });
        setLikes((prev) => prev + 1);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/posts/${id}`);
      if (onDelete) onDelete();
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const isOwner = currentUser?.id === user.id;
  const formattedDate = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
  });

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex justify-between">
        <Link to={`/profile/${user.username}`} className="flex items-center">
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

        <div className="relative">
          {isOwner && (
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
                    onClick={handleDelete}
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

      <Link to={`/post/${id}`} className="block mt-3">
        <p className="text-gray-800 whitespace-pre-line">{content}</p>

        {imageUrl && (
          <div className="mt-3">
            <img
              src={imageUrl}
              alt="Post"
              className="rounded-lg max-h-96 w-auto"
              onError={(e) => {
                e.currentTarget.src =
                  "https://via.placeholder.com/800x400?text=Image+Not+Available";
              }}
            />
          </div>
        )}
      </Link>

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
            <span>{likes}</span>
          </button>

          <Link
            to={`/post/${id}`}
            className="flex items-center space-x-1 hover:text-blue-500"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{commentsCount}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
