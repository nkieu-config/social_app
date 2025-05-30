import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useEffect, useState } from "react";
import {
  Home,
  Compass,
  Bell,
  MessageCircle,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import axios from "axios";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    // Fetch unread counts
    const fetchUnreadCounts = async () => {
      try {
        const [messagesRes, notificationsRes] = await Promise.all([
          axios.get("http://localhost:3001/api/messages/unread/count"),
          axios.get("http://localhost:3001/api/notifications/unread/count"),
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-3 ${
      isActive
        ? "text-blue-600 bg-blue-50 font-medium"
        : "text-gray-700 hover:bg-gray-100"
    } rounded-lg transition-colors`;

  return (
    <div className="fixed h-full w-64 lg:w-72 border-r border-gray-200 bg-white flex flex-col">
      <div className="px-6 py-6">
        <Link to="/" className="text-2xl font-bold text-blue-600">
          SocialApp
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <NavLink to="/" className={navLinkClasses}>
          <Home className="w-5 h-5 mr-3" />
          <span>Home</span>
        </NavLink>

        <NavLink to="/explore" className={navLinkClasses}>
          <Compass className="w-5 h-5 mr-3" />
          <span>Explore</span>
        </NavLink>

        <NavLink to="/notifications" className={navLinkClasses}>
          <div className="relative">
            <Bell className="w-5 h-5 mr-3" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </div>
          <span>Notifications</span>
        </NavLink>

        <NavLink to="/messages" className={navLinkClasses}>
          <div className="relative">
            <MessageCircle className="w-5 h-5 mr-3" />
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </div>
          <span>Messages</span>
        </NavLink>

        {user && (
          <NavLink to={`/profile/${user.username}`} className={navLinkClasses}>
            <User className="w-5 h-5 mr-3" />
            <span>Profile</span>
          </NavLink>
        )}

        <NavLink to="/settings" className={navLinkClasses}>
          <Settings className="w-5 h-5 mr-3" />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          {user?.avatar && (
            <img
              src={user.avatar}
              alt={user.username}
              className="w-10 h-10 rounded-full mr-3"
            />
          )}
          <div className="flex-1">
            <p className="font-medium">{user?.fullName || user?.username}</p>
            <p className="text-sm text-gray-500">@{user?.username}</p>
          </div>
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-gray-300"
            }`}
          ></div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-4 flex items-center text-gray-700 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-2" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
