import React, { useState } from "react";
import { useAuthContext } from "../context/authContext";
import { useToast } from "@chakra-ui/react";
import { Switch, FormControl, FormLabel } from '@chakra-ui/react';
const ControlButton = ({ field, isOn }) => {
  const { token } = useAuthContext();
  const toast = useToast();
  const [buttonState, setButtonState] = useState(isOn); // Initial state is passed as a prop

  const handleChange = async () => {
    try {
      const value = !buttonState; // Toggle the state locally
      const response = await fetch("http://localhost:5002/api/admin/control", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ field, value }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: `State updated successfully to ${value ? "ON" : "OFF"}`,
          status: "success",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
        setButtonState(value); // Update local state on successful response
      } else {
        console.error("Error updating control:", data.message);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };
  return (
    <FormControl display="flex" alignItems="center">
      <FormLabel htmlFor={`switch-${field}`} mb="0">
        {field}
      </FormLabel>
      <Switch
        id={`switch-${field}`}
        colorScheme="green"
        size="lg"
        isChecked={buttonState}
        onChange={handleChange}
      />
    </FormControl>
  );
};


export default ControlButton;
