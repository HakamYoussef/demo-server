'use client';
import React from "react";
import Soll from "../liveData/Soll";
import SolChart from "../charts/SolChart";
import protectedRoute from "../components/protectedRoute";
import Navbar from "@/app/components/Navbar";
import Sections from "../components/Sections";
import Slider from "../components/slider";

const Page = () => {
  return (
    <div className="min-h-screen" style={{ paddingTop: "90px" }}>
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 py-8 px-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
            CR SEAPI
          </h1>
          <p className="text-amber-100 text-lg font-medium">
            Agro Experimental Intelligent Station - Soil Monitoring
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
              <div className="w-2 h-8 bg-gradient-to-b from-amber-400 to-orange-600 rounded-full"></div>
              <h2 className="text-xl font-bold text-gray-800">Live Sensor Data</h2>
              <div className="ml-auto flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                <span className="text-sm text-gray-500 font-medium">Live</span>
              </div>
            </div>
            <Soll />
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
            <div className="w-2 h-8 bg-gradient-to-b from-orange-400 to-amber-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-800">Historical Soil Data Charts</h2>
          </div>
          <SolChart />
        </div>
      </div>
    </div>
  );
};

export default protectedRoute(Page);
