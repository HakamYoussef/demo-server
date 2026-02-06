"use client";
import React from "react";
import { Tooltip } from "@chakra-ui/react";

const Pot = ({ potId, plantType, onClick }) => {
    return (
        <Tooltip label={`Pot ${potId}: ${plantType}`} hasArrow placement="top" bg="gray.800" color="white">
            <div
                onClick={() => onClick(potId)}
                className="aspect-square bg-white border border-gray-200 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 hover:border-violet-500 hover:shadow-md hover:-translate-y-1 group"
            >
                <div className="text-xl transform transition-transform group-hover:scale-110">
                    🌱
                </div>
            </div>
        </Tooltip>
    );
};

export default Pot;
