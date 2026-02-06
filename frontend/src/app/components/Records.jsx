"use client";
import React, { useState, useEffect } from "react";
import { FaCalendarAlt, FaClock } from "react-icons/fa";

const Records = ({ option, env, startDate, endDate, data }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatHeure = (dateString) => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  if (Object.keys(data).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <FaCalendarAlt size={48} className="mb-3 opacity-50" />
        <p className="text-lg font-medium">No records found</p>
        <p className="text-sm">Try adjusting your search criteria</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-xl border border-gray-200">
      <table className="modern-table w-full">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="rounded-tl-xl">
              <div className="flex items-center gap-2">
                <FaCalendarAlt size={12} />
                Date
              </div>
            </th>
            <th>
              <div className="flex items-center gap-2">
                <FaClock size={12} />
                Time
              </div>
            </th>
            <th className="rounded-tr-xl">{option} Values</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(data).map((key, index) => {
            const record = data[key];
            const filteredKeys = Object.keys(record)
              .filter((recordKey) => recordKey.startsWith(option) && recordKey.includes(env));

            if (filteredKeys.length === 0) return null;

            return (
              <tr key={key} className="animate-fadeIn" style={{ animationDelay: `${index * 0.02}s` }}>
                <td className="font-medium text-gray-800">
                  {formatDate(record.timestamp)}
                </td>
                <td className="text-gray-600">
                  {formatHeure(record.timestamp)}
                </td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    {filteredKeys.map((hKey) => (
                      <span
                        key={hKey}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                      >
                        <span className="text-xs font-medium text-gray-500">{hKey}:</span>
                        <span className="text-sm font-bold text-green-600">{record[hKey]}</span>
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Records;
