"use client";
import React from "react";
import { getSoilReadings } from "../../lib/soil-readings.mjs";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    VStack,
    HStack,
    Text,
    Badge,
    Divider,
} from "@chakra-ui/react";
import {
    FaThermometerHalf,
    FaTint,
    FaFlask,
    FaBolt,
    FaLeaf
} from "react-icons/fa";

const PotDetailsModal = ({ isOpen, onClose, potId, potKey, potConfigs = {}, sensorData = {}, sensorConnected = false }) => {
    const configuredPot = potConfigs[potKey] || {};
    const soilSensor = configuredPot.soilSensor;

    const data = {
        id: configuredPot.id || potId,
        type: configuredPot.type || "Not configured",
        ...getSoilReadings(sensorData, soilSensor),
    };
    const format = (value, unit = "") => value === null ? "Unavailable" : `${value}${unit}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
            <ModalOverlay backdropFilter="blur(5px)" bg="blackAlpha.300" />
            <ModalContent
                mx={3}
                maxW="min(28rem, calc(100vw - 1.5rem))"
                bg="white"
                color="gray.800"
                borderRadius="2xl"
                boxShadow="xl"
                border="1px solid"
                borderColor="gray.100"
            >
                <ModalHeader borderBottom="1px solid" borderColor="gray.100" pb={4}>
                    <HStack justify="space-between" pr={6}>
                        <VStack align="start" spacing={0}>
                            <Text fontSize="xl" fontWeight="bold">Pot Details</Text>
                            <Text fontSize="sm" color="gray.500">ID: {data.id}</Text>
                        </VStack>
                        <Badge colorScheme={sensorConnected ? "green" : "gray"} px={2} borderRadius="full">
                            {sensorConnected ? "Connected" : "Disconnected"}
                        </Badge>
                    </HStack>
                </ModalHeader>
                <ModalCloseButton mt={2} />

                <ModalBody py={6}>
                    <VStack spacing={6} align="stretch">
                        {/* Plant Type */}
                        <HStack spacing={4} bg="gray.50" p={4} borderRadius="xl" border="1px solid" borderColor="gray.100">
                            <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center text-violet-600">
                                <FaLeaf size={24} />
                            </div>
                            <VStack align="start" spacing={0}>
                                <Text fontSize="xs" color="gray.500" textTransform="uppercase">Plant Type</Text>
                                <Text fontSize="md" fontWeight="semibold" color="gray.800">{data.type}</Text>
                            </VStack>
                        </HStack>

                        <VStack align="start" spacing={1}>
                            <Text fontSize="sm" fontWeight="semibold">
                                Soil Sensor: {soilSensor ? soilSensor : "Not assigned"}
                            </Text>
                            {soilSensor && (
                                <Text fontSize="xs" color="gray.500">
                                    H_S{soilSensor} · T_S{soilSensor} · C_S{soilSensor} · PH_S{soilSensor}
                                </Text>
                            )}
                        </VStack>

                        <Divider borderColor="gray.100" />

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <MetricItem
                                icon={<FaThermometerHalf />}
                                label="Temperature"
                                value={format(data.temp, " °C")}
                                color="orange.500"
                            />
                            <MetricItem
                                icon={<FaTint />}
                                label="Humidity"
                                value={format(data.humidity, " %")}
                                color="blue.500"
                            />
                            <MetricItem
                                icon={<FaFlask />}
                                label="PH Level"
                                value={format(data.ph)}
                                color="purple.500"
                            />
                            <MetricItem
                                icon={<FaBolt />}
                                label="Conductivity"
                                value={format(data.conductivity, " mS/cm")}
                                color="yellow.600"
                            />
                        </div>
                    </VStack>
                </ModalBody>

                <ModalFooter borderTop="1px solid" borderColor="gray.100">
                    <Button colorScheme="gray" variant="ghost" mr={3} onClick={onClose}>
                        Close
                    </Button>
                    <Button
                        colorScheme="purple"
                        onClick={onClose}
                    >
                        Done
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

const MetricItem = ({ icon, label, value, color }) => (
    <VStack align="start" p={3} bg="gray.50" borderRadius="xl" spacing={1} border="1px solid" borderColor="gray.100">
        <HStack color={color} spacing={2}>
            {icon}
            <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.500">
                {label}
            </Text>
        </HStack>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">{value}</Text>
    </VStack>
);

export default PotDetailsModal;
