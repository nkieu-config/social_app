import { useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    bio: user?.bio || '',
    avatar: user?.avatar || ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const handleProfileChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    setProfileSuccess('');
    setProfileError('');
    setIsProfileLoading(true);
    
    try {
      const response = await axios.put('http://localhost:3001/api/users/profile', profileData);
      
      // Update user in context
      updateUser(response.data.user);
      
      setProfileSuccess('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setProfileError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    setPasswordSuccess('');
    setPasswordError('');
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    setIsPasswordLoading(true);
    
    try {
      await axios.put('http://localhost:3001/api/users/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordSuccess('Password updated successfully');
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordError(error.response?.data?.message || 'Failed to update password');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <div className="p-4 pb-20 md:pb-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
        
        {profileSuccess && (
          <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
            {profileSuccess}
          </div>
        )}
        
        {profileError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
            {profileError}
          </div>
        )}
        
        <form onSubmit={handleProfileSubmit}>
          <div className="mb-4">
            <label htmlFor="fullName" className="block text-gray-700 mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={profileData.fullName}
              onChange={handleProfileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="bio" className="block text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={profileData.bio}
              onChange={handleProfileChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="avatar" className="block text-gray-700 mb-2">
              Avatar URL
            </label>
            <input
              id="avatar"
              name="avatar"
              type="text"
              value={profileData.avatar}
              onChange={handleProfileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter the URL of your profile picture
            </p>
            
            {profileData.avatar && (
              <div className="mt-2">
                <p className="text-sm text-gray-700 mb-1">Preview:</p>
                <img
                  src={profileData.avatar}
                  alt="Avatar preview"
                  className="w-16 h-16 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/150?text=Invalid+Image';
                  }}
                />
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isProfileLoading}
            className={`px-6 py-2 rounded-lg font-medium text-white ${
              isProfileLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            } transition`}
          >
            {isProfileLoading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Password Settings</h2>
        
        {passwordSuccess && (
          <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
            {passwordSuccess}
          </div>
        )}
        
        {passwordError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
            {passwordError}
          </div>
        )}
        
        <form onSubmit={handlePasswordSubmit}>
          <div className="mb-4">
            <label htmlFor="currentPassword" className="block text-gray-700 mb-2">
              Current Password
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-gray-700 mb-2">
              New Password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isPasswordLoading}
            className={`px-6 py-2 rounded-lg font-medium text-white ${
              isPasswordLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            } transition`}
          >
            {isPasswordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;