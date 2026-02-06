'use client'
import { useState } from 'react';
import protectedRoute from "../components/protectedRoute";
import { Control } from "../components/Control";
import Navbar from "../components/Navbar";
import { FaLock, FaExclamationTriangle } from "react-icons/fa";
import { MdOutlineSensors } from "react-icons/md";

const ControlPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (attempts >= MAX_ATTEMPTS) {
      setError('Maximum attempts reached. Please try again later.');
      return;
    }

    const correctPassword = process.env.NEXT_PUBLIC_CONTROL_PASSWORD || "1234";
    if (password === correctPassword.toString()) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setAttempts(prev => prev + 1);
      const remainingAttempts = MAX_ATTEMPTS - (attempts + 1);
      setError(`Incorrect password. ${remainingAttempts} attempts remaining.`);
      setPassword('');
    }
  };

  // Locked state
  if (attempts >= MAX_ATTEMPTS) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="modern-card p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center">
            <FaExclamationTriangle size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Access Locked
          </h2>
          <p className="text-gray-600">
            Maximum login attempts reached. Please try again later or contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  // Password prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="modern-card p-8 max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 flex items-center justify-center">
              <FaLock size={24} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              Control Panel Access
            </h2>
            <p className="text-gray-500 mt-1">Enter password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="modern-input"
                placeholder="Enter control panel password"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                <FaExclamationTriangle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full modern-btn modern-btn-primary flex items-center justify-center gap-2"
            >
              <MdOutlineSensors size={18} />
              Access Control Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Control panel
  return (
    <div className="min-h-screen" style={{ paddingTop: "90px" }}>
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white">Control Panel</h1>
          <p className="text-blue-200 mt-1">Manage and monitor devices in real-time</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="modern-card">
          <Control />
        </div>
      </div>
    </div>
  );
};

export default protectedRoute(ControlPage);
