import { useState, FormEvent, ChangeEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { Image, X } from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

interface CreatePostFormProps {
  onPostCreated: () => void;
}

const CreatePostForm = ({ onPostCreated }: CreatePostFormProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!content.trim() && !imageUrl.trim()) {
      setError("Post cannot be empty");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await axios.post(`${API_URL}/posts`, {
        content: content.trim(),
        imageUrl: imageUrl.trim() || null,
      });

      // Reset form
      setContent("");
      setImageUrl("");

      // Notify parent to refresh posts
      onPostCreated();
    } catch (error) {
      console.error("Error creating post:", error);
      setError("Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
  };

  const clearImageUrl = () => {
    setImageUrl("");
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start space-x-3">
          {user?.avatar && (
            <img
              src={user.avatar}
              alt={user.username}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div className="flex-1">
            <textarea
              placeholder="What's happening?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition"
              rows={3}
            />

            {imageUrl && (
              <div className="mt-2 relative">
                <div className="flex items-center border border-gray-200 rounded-lg p-2 bg-gray-50">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/150?text=Invalid+Image";
                    }}
                  />
                  <span className="ml-2 text-sm text-gray-600 truncate flex-1">
                    {imageUrl}
                  </span>
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={clearImageUrl}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Image URL"
                    value={imageUrl}
                    onChange={handleImageUrlChange}
                    className="absolute opacity-0 pointer-events-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt("Enter image URL:");
                      if (url) setImageUrl(url);
                    }}
                    className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition"
                  >
                    <Image className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || (!content.trim() && !imageUrl.trim())}
                className={`px-4 py-2 rounded-full font-medium text-white ${
                  isSubmitting || (!content.trim() && !imageUrl.trim())
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 transition"
                }`}
              >
                {isSubmitting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePostForm;
