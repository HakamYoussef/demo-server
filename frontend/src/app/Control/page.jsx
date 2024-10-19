'use client'
import { useState } from 'react';

const ControlPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check if maximum attempts reached
    if (attempts >= MAX_ATTEMPTS) {
      setError('Maximum attempts reached. Please try again later.');
      return;
    }

    // Check password against environment variable
    if (password === process.env.NEXT_PUBLIC_CONTROL_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setAttempts(prev => prev + 1);
      const remainingAttempts = MAX_ATTEMPTS - (attempts + 1);
      setError(`Incorrect password. ${remainingAttempts} attempts remaining.`);
      
      // Clear password field after failed attempt
      setPassword('');
    }
  };

  // If max attempts reached, show locked message
  if (attempts >= MAX_ATTEMPTS) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-4 space-y-2 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center text-red-600">
            Access Locked
          </h2>
          <p className="text-center text-gray-600">
            Maximum login attempts reached. Please try again later or contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-4 space-y-2 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center text-gray-900">
            Control Panel Access
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Enter Control Panel Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Access Control Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    // Your actual Control page content here
    <div className="p-4">
      <Control />
    </div>
  );
};
export default protectedRoute(ControlPage);

