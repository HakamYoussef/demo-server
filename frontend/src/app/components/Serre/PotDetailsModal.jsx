"use client";
import React from "react";
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

const PotDetailsModal = ({ isOpen, onClose, potId, potConfigs = {} }) => {
    // Get configured pot data or use mock data
    const configuredPot = potConfigs[potId] || {};

    const getMockData = (id) => ({
        id: configuredPot.id || id,
        type: configuredPot.type || (id?.split('-')[1] % 2 === 0 ? "Tomato (Solanum lycopersicum)" : "Lettuce (Lactuca sativa)"),
        temp: (22 + Math.random() * 5).toFixed(1),
        humidity: (60 + Math.random() * 15).toFixed(1),
        ph: (6.0 + Math.random() * 1.5).toFixed(1),
        conductivity: (1.2 + Math.random() * 0.8).toFixed(2),
        health: "Good",
    });

    const data = getMockData(potId);

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
            <ModalOverlay backdropFilter="blur(5px)" bg="blackAlpha.300" />
            <ModalContent
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
                        <Badge colorScheme="purple" px={2} borderRadius="full">Healthy</Badge>
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

                        <Divider borderColor="gray.100" />

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <MetricItem
                                icon={<FaThermometerHalf />}
                                label="Temperature"
                                value={`${data.temp} °C`}
                                color="orange.500"
                            />
                            <MetricItem
                                icon={<FaTint />}
                                label="Humidity"
                                value={`${data.humidity} %`}
                                color="blue.500"
                            />
                            <MetricItem
                                icon={<FaFlask />}
                                label="PH Level"
                                value={data.ph}
                                color="purple.500"
                            />
                            <MetricItem
                                icon={<FaBolt />}
                                label="Conductivity"
                                value={`${data.conductivity} mS/cm`}
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
