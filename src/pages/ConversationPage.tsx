import { useState, useEffect, useRef, FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { format } from "date-fns";
import { ArrowLeft, Send } from "lucide-react";

interface User {
  id: string;
  username: string;
  fullName?: string;
  avatar?: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  senderId: string;
  receiverId: string;
  sender: {
    id: string;
    username: string;
    avatar?: string;
  };
}

const ConversationPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const { socket, isUserOnline } = useSocket();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
      fetchMessages();
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [userId, page]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message: Message) => {
      if (message.senderId === userId) {
        setMessages((prev) => [...prev, message]);

        // Mark as read immediately
        socket.emit("message:read", { messageId: message.id });
      }
    };

    const handleMessageRead = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, isRead: true } : message
        )
      );
    };

    const handleTypingIndicator = ({
      userId: typingUserId,
      isTyping,
    }: {
      userId: string;
      isTyping: boolean;
    }) => {
      if (typingUserId === userId) {
        setUserTyping(isTyping);
      }
    };

    // Set up socket listeners
    socket.on("message:receive", handleReceiveMessage);
    socket.on("message:read", handleMessageRead);
    socket.on("message:typing", handleTypingIndicator);

    // Clean up listeners on unmount
    return () => {
      socket.off("message:receive", handleReceiveMessage);
      socket.off("message:read", handleMessageRead);
      socket.off("message:typing", handleTypingIndicator);
    };
  }, [socket, userId]);

  const fetchUserDetails = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/users/${userId}`
      );
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      setIsLoading(true);

      const response = await axios.get(
        `http://localhost:3001/api/messages/conversation/${userId}?page=${page}&limit=20`
      );

      const newMessages = response.data.messages;
      const totalPages = response.data.pagination.totalPages;

      setMessages((prev) =>
        page === 1 ? newMessages : [...newMessages, ...prev]
      );
      setHasMore(page < totalPages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!isTyping && socket) {
      setIsTyping(true);
      socket.emit("message:typing", { receiverId: userId, isTyping: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (socket) {
        socket.emit("message:typing", { receiverId: userId, isTyping: false });
      }
    }, 3000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !userId || !currentUser) return;

    try {
      // Send via API
      const response = await axios.post("http://localhost:3001/api/messages", {
        receiverId: userId,
        content: newMessage.trim(),
      });

      // Add to messages immediately
      setMessages((prev) => [...prev, response.data]);

      // Clear input
      setNewMessage("");

      // Clear typing indicator
      setIsTyping(false);
      if (socket) {
        socket.emit("message:typing", { receiverId: userId, isTyping: false });
      }

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const loadMoreMessages = () => {
    setPage((prev) => prev + 1);
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return format(date, "h:mm a");
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    if (date > weekAgo) {
      return format(date, "EEE h:mm a");
    }

    return format(date, "MMM d, h:mm a");
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="p-4 flex justify-center">
        <div className="spinner w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="flex items-center p-4">
          <button
            onClick={() => navigate("/messages")}
            className="p-2 mr-2 rounded-full hover:bg-gray-100 md:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {user && (
            <Link
              to={`/profile/${user.username}`}
              className="flex items-center"
            >
              <div className="relative">
                {user.avatar && (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                )}
                <div
                  className={`absolute bottom-0 right-2 w-3 h-3 rounded-full border-2 border-white ${
                    isUserOnline(user.id) ? "bg-green-500" : "bg-gray-300"
                  }`}
                ></div>
              </div>
              <div>
                <h2 className="font-medium">
                  {user.fullName || user.username}
                </h2>
                <p className="text-sm text-gray-500">
                  {isUserOnline(user.id) ? "Online" : "Offline"}
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {hasMore && (
          <div className="flex justify-center mb-4">
            <button
              onClick={loadMoreMessages}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
            >
              Load earlier messages
            </button>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((message, index) => {
            const isSender = message.senderId === currentUser?.id;

            const showDateSeparator =
              index === 0 ||
              new Date(messages[index - 1].createdAt).toDateString() !==
                new Date(message.createdAt).toDateString();

            return (
              <div key={message.id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-4">
                    <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                      {format(new Date(message.createdAt), "MMMM d, yyyy")}
                    </div>
                  </div>
                )}

                <div
                  className={`flex ${
                    isSender ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs md:max-w-md ${
                      isSender
                        ? "bg-blue-500 text-white"
                        : "bg-white text-gray-800"
                    } rounded-lg p-3 shadow`}
                  >
                    <p>{message.content}</p>
                    <div className="flex items-center justify-end mt-1">
                      <span
                        className={`text-xs ${
                          isSender ? "text-blue-100" : "text-gray-500"
                        }`}
                      >
                        {formatMessageDate(message.createdAt)}
                      </span>
                      {isSender && (
                        <span className="text-xs ml-1">
                          {message.isRead ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {userTyping && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 rounded-lg p-3 shadow">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`px-4 py-2 rounded-r-lg ${
              !newMessage.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConversationPage;
