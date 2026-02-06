'use client';
import React from "react";
import Navbar from "@/app/components/Navbar";
import Eaul from "../liveData/Eaul";
import EauChart from "../charts/EauChart";
import Sections from "../components/Sections";
import protectedRoute from "../components/protectedRoute";
import Slider from "../components/slider";

const Page = () => {
  return (
    <div className="min-h-screen" style={{ paddingTop: "90px" }}>
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500 py-8 px-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
            CR SEAPI
          </h1>
          <p className="text-blue-100 text-lg font-medium">
            Agro Experimental Intelligent Station - Water Monitoring
          </p>
        </div>
      </div>

      {/* Section Navigation */}
      <Sections />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Data Section - Takes 2 columns */}
          <div className="lg:col-span-2 modern-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-cyan-600 rounded-full"></div>
              <h2 className="text-xl font-bold text-gray-800">Live Sensor Data</h2>
              <div className="ml-auto flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                <span className="text-sm text-gray-500 font-medium">Live</span>
              </div>
            </div>
            <Eaul />
          </div>

          {/* Partners Slider Section */}
          <div className="modern-card overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Project Partners</h2>
            </div>
            <Slider />
          </div>
        </div>

        {/* Charts Section */}
        <div className="mt-6 modern-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-8 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-800">Historical Water Data Charts</h2>
          </div>
          <EauChart />
        </div>
      </div>
    </div>
  );
};

export default protectedRoute(Page);
