"use client";
import React from "react";
import Pot from "./Pot";

const Table = ({ tableId, rows = 4, columns = 3, potConfigs = {}, onPotClick }) => {
    // Generate pots based on rows and columns
    const pots = Array.from({ length: rows * columns }, (_, i) => {
        const key = `${tableId - 1}-${i}`;
        const config = potConfigs[key] || {};
        return {
            id: config.id || `T${tableId}-P${i + 1}`,
            type: config.type || "Unknown",
        };
    });

    return (
        <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 hover:border-violet-300 transition-colors duration-300">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                    <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">
                        T{tableId}
                    </span>
                    Table {tableId}
                </h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {rows}×{columns} Grid
                </span>
            </div>

            <div
                className="grid gap-3"
                style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
            >
                {pots.map((pot) => (
                    <Pot
                        key={pot.id}
                        potId={pot.id}
                        plantType={pot.type}
                        onClick={onPotClick}
                    />
                ))}
            </div>
        </div>
    );
};

export default Table;
