import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { Search } from 'lucide-react';

interface Conversation {
  id: string;
  username: string;
  fullName?: string;
  avatar?: string;
  last_message_content: string;
  last_message_time: string;
  last_message_sender: string;
  unread_count: number;
}

interface User {
  id: string;
  username: string;
  fullName?: string;
  avatar?: string;
}

const MessagesPage = () => {
  const { isUserOnline } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchUsers, setSearchUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchConversations();

    // Set up socket listener for new messages
    const handleNewMessage = () => {
      fetchConversations();
    };

    // Cleanup
    return () => {
      // Remove socket listeners if needed
    };
  }, []);

  useEffect(() => {
    if (search.trim()) {
      searchForUsers();
    } else {
      setSearchUsers([]);
    }
  }, [search]);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('http://localhost:3001/api/messages/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchForUsers = async () => {
    try {
      setIsSearching(true);
      const response = await axios.get(`http://localhost:3001/api/users?search=${search}`);
      setSearchUsers(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-4 pb-20 md:pb-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search for people to message..."
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
          {searchUsers.length > 0 ? (
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {searchUsers.map(user => (
                <Link
                  key={user.id}
                  to={`/messages/${user.id}`}
                  className="flex items-center p-4 hover:bg-gray-50 transition"
                >
                  <div className="relative">
                    {user.avatar && (
                      <img 
                        src={user.avatar} 
                        alt={user.username} 
                        className="w-12 h-12 rounded-full mr-4"
                      />
                    )}
                    <div className={`absolute bottom-0 right-3 w-3 h-3 rounded-full border-2 border-white ${
                      isUserOnline(user.id) ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                  </div>
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

      {/* Conversations */}
      {!search.trim() && (
        <div>
          <h2 className="text-lg font-medium mb-3">Recent</h2>
          
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="spinner w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">No conversations yet</p>
              <p className="text-sm text-gray-500 mt-2">Search for people to start messaging</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {conversations.map(conversation => (
                <Link
                  key={conversation.id}
                  to={`/messages/${conversation.id}`}
                  className="flex items-center p-4 hover:bg-gray-50 transition"
                >
                  <div className="relative">
                    {conversation.avatar && (
                      <img 
                        src={conversation.avatar} 
                        alt={conversation.username} 
                        className="w-12 h-12 rounded-full mr-4"
                      />
                    )}
                    <div className={`absolute bottom-0 right-3 w-3 h-3 rounded-full border-2 border-white ${
                      isUserOnline(conversation.id) ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium truncate">
                        {conversation.fullName || conversation.username}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(conversation.last_message_time), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.last_message_sender === conversation.id ? '' : 'You: '}
                      {conversation.last_message_content}
                    </p>
                  </div>
                  
                  {conversation.unread_count > 0 && (
                    <div className="ml-3 bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                      {conversation.unread_count}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessagesPage;