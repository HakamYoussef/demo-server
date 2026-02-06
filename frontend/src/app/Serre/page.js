"use client";
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import PotDetailsModal from "../components/Serre/PotDetailsModal";
import SerreTable from "../components/Serre/Table";
import { useDisclosure } from "@chakra-ui/react";

const SerrePage = () => {
    const [selectedPotId, setSelectedPotId] = useState(null);
    const { isOpen, onOpen, onClose } = useDisclosure();

    // Configuration state
    const [config, setConfig] = useState({
        numberOfTables: 5,
        matrixRows: 4,
        matrixColumns: 3,
        potConfigs: {},
    });

    // Load configuration from localStorage
    useEffect(() => {
        const savedConfig = localStorage.getItem("serreConfig");
        if (savedConfig) {
            try {
                const parsedConfig = JSON.parse(savedConfig);
                setConfig(parsedConfig);
            } catch (error) {
                console.error("Error loading serre config:", error);
            }
        }
    }, []);

    const handlePotClick = (potId) => {
        setSelectedPotId(potId);
        onOpen();
    };

    const tables = Array.from({ length: config.numberOfTables }, (_, i) => i + 1);
    const totalPots = config.numberOfTables * config.matrixRows * config.matrixColumns;

    return (
        <div className="min-h-screen" style={{ paddingTop: "90px" }}>
            <Navbar />

            {/* Header Band */}
            <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-800 py-8 px-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-white">Our Serre</h1>
                    <p className="text-violet-100 mt-1">Layout of our serre</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="modern-card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-2 h-8 bg-gradient-to-b from-violet-400 to-violet-600 rounded-full"></div>
                        <h2 className="text-xl font-bold text-gray-800">Serre Layout</h2>
                        <div className="ml-auto">
                            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                                {config.numberOfTables} Tables / {totalPots} Pots
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-8">
                        {tables.map((tableId) => (
                            <SerreTable
                                key={tableId}
                                tableId={tableId}
                                rows={config.matrixRows}
                                columns={config.matrixColumns}
                                potConfigs={config.potConfigs}
                                onPotClick={handlePotClick}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Details Modal */}
            <PotDetailsModal
                isOpen={isOpen}
                onClose={onClose}
                potId={selectedPotId}
                potConfigs={config.potConfigs}
            />
        </div>
    );
};

export default SerrePage;
