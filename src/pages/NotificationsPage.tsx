import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, UserPlus, Check } from 'lucide-react';

interface Notification {
  id: string;
  notificationId: string;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'MESSAGE';
  isRead: boolean;
  createdAt: string;
  actor?: {
    id: string;
    username: string;
    avatar?: string;
  };
  entity?: {
    id: string;
    content?: string;
    imageUrl?: string;
  };
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      
      const response = await axios.get(`http://localhost:3001/api/notifications?page=${page}&limit=20`);
      
      const newNotifications = response.data.notifications;
      const totalPages = response.data.pagination.totalPages;
      
      setNotifications(prev => page === 1 ? newNotifications : [...prev, ...newNotifications]);
      setHasMore(page < totalPages);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('http://localhost:3001/api/notifications/read-all');
      
      // Update local state
      setNotifications(prev => prev.map(notification => ({
        ...notification,
        isRead: true
      })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await axios.put(`http://localhost:3001/api/notifications/${id}/read`);
      
      // Update local state
      setNotifications(prev => prev.map(notification => 
        notification.id === id ? { ...notification, isRead: true } : notification
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LIKE':
        return <Heart className="w-5 h-5 text-red-500\" fill="currentColor" />;
      case 'COMMENT':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'FOLLOW':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'MESSAGE':
        return <MessageCircle className="w-5 h-5 text-purple-500" />;
      default:
        return null;
    }
  };

  const getNotificationContent = (notification: Notification) => {
    const { type, actor, entity } = notification;
    
    if (!actor) return 'You have a new notification';
    
    switch (type) {
      case 'LIKE':
        return (
          <>
            <Link to={`/profile/${actor.username}`} className="font-medium hover:underline">
              @{actor.username}
            </Link>{' '}
            liked your post
          </>
        );
      case 'COMMENT':
        return (
          <>
            <Link to={`/profile/${actor.username}`} className="font-medium hover:underline">
              @{actor.username}
            </Link>{' '}
            commented on your post
          </>
        );
      case 'FOLLOW':
        return (
          <>
            <Link to={`/profile/${actor.username}`} className="font-medium hover:underline">
              @{actor.username}
            </Link>{' '}
            started following you
          </>
        );
      case 'MESSAGE':
        return (
          <>
            <Link to={`/profile/${actor.username}`} className="font-medium hover:underline">
              @{actor.username}
            </Link>{' '}
            sent you a message
          </>
        );
      default:
        return 'You have a new notification';
    }
  };

  const getNotificationLink = (notification: Notification) => {
    const { type, actor, entity } = notification;
    
    if (!actor) return '#';
    
    switch (type) {
      case 'LIKE':
      case 'COMMENT':
        return entity ? `/post/${entity.id}` : '#';
      case 'FOLLOW':
        return `/profile/${actor.username}`;
      case 'MESSAGE':
        return `/messages/${actor.id}`;
      default:
        return '#';
    }
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <div className="p-4 pb-20 md:pb-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        
        {notifications.some(n => !n.isRead) && (
          <button
            onClick={markAllAsRead}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <Check className="w-4 h-4 mr-1" />
            Mark all as read
          </button>
        )}
      </div>

      {isLoading && notifications.length === 0 ? (
        <div className="flex justify-center p-8">
          <div className="spinner w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => (
            <Link
              key={notification.id}
              to={getNotificationLink(notification)}
              className={`block ${notification.isRead ? 'bg-white' : 'bg-blue-50'} rounded-lg shadow p-4 transition hover:bg-gray-50`}
              onClick={() => !notification.isRead && markAsRead(notification.id)}
            >
              <div className="flex items-center">
                <div className="mr-4">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center">
                    {notification.actor?.avatar && (
                      <img 
                        src={notification.actor.avatar} 
                        alt={notification.actor.username} 
                        className="w-10 h-10 rounded-full mr-3"
                      />
                    )}
                    <div>
                      <p className="text-gray-800">
                        {getNotificationContent(notification)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  {notification.entity?.content && (
                    <div className="mt-2 ml-12 text-sm text-gray-600 line-clamp-2">
                      "{notification.entity.content}"
                    </div>
                  )}
                </div>
                
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            </Link>
          ))}

          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className={`px-6 py-2 rounded-full text-gray-800 ${
                  isLoading ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'
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

export default NotificationsPage;