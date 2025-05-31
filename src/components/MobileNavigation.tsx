import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { Home, Compass, Bell, MessageCircle, User } from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const MobileNavigation = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    // Fetch unread counts
    const fetchUnreadCounts = async () => {
      try {
        const [messagesRes, notificationsRes] = await Promise.all([
          axios.get(`${API_URL}/messages/unread/count`),
          axios.get(`${API_URL}/notifications/unread/count`),
        ]);

        setUnreadMessages(messagesRes.data.count);
        setUnreadNotifications(notificationsRes.data.count);
      } catch (error) {
        console.error("Error fetching unread counts:", error);
      }
    };

    fetchUnreadCounts();

    // Set up interval to refresh counts
    const intervalId = setInterval(fetchUnreadCounts, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/", icon: <Home className="w-6 h-6" />, label: "Home" },
    {
      path: "/explore",
      icon: <Compass className="w-6 h-6" />,
      label: "Explore",
    },
    {
      path: "/notifications",
      icon: (
        <div className="relative">
          <Bell className="w-6 h-6" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </div>
      ),
      label: "Notifications",
    },
    {
      path: "/messages",
      icon: (
        <div className="relative">
          <MessageCircle className="w-6 h-6" />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
        </div>
      ),
      label: "Messages",
    },
    {
      path: user ? `/profile/${user.username}` : "/profile",
      icon: <User className="w-6 h-6" />,
      label: "Profile",
    },
  ];

  return (
    <div className="bg-white border-t border-gray-200 px-2 py-2">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center p-2 rounded-md ${
              isActive(item.path) ? "text-blue-600" : "text-gray-600"
            }`}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MobileNavigation;
