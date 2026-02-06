import React, { useState, useEffect } from "react";
import { useAuthContext } from "../context/authContext";
import { useToast } from "@chakra-ui/react";
import { MdPower, MdPowerOff } from "react-icons/md";

const ControlButton = ({ field, isOn }) => {
  const { token } = useAuthContext();
  const toast = useToast();
  const [buttonState, setButtonState] = useState(isOn);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setButtonState(isOn);
  }, [isOn]);

  const handleChange = async () => {
    setIsLoading(true);
    try {
      const value = !buttonState;
      const response = await fetch("http://213.199.35.129:5002/api/admin/control", {
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
          title: `${field} ${value ? "activated" : "deactivated"}`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        setButtonState(value);
      } else {
        console.error("Error updating control:", data.message);
        toast({
          title: "Error updating control",
          description: data.message,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "top-right",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Connection error",
        description: "Failed to communicate with server",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleChange}
      disabled={isLoading}
      className={`
        relative w-full p-4 rounded-xl font-semibold text-left
        transition-all duration-300 ease-out
        ${isLoading ? 'opacity-60 cursor-wait' : 'cursor-pointer'}
        ${buttonState
          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40'
          : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300 hover:shadow-md'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`
            p-2 rounded-lg
            ${buttonState
              ? 'bg-white/20'
              : 'bg-gray-100'
            }
          `}>
            {buttonState ? (
              <MdPower size={20} className={buttonState ? 'text-white' : 'text-green-500'} />
            ) : (
              <MdPowerOff size={20} className="text-gray-400" />
            )}
          </div>
          <span className="font-medium">{field}</span>
        </div>

        {/* Toggle Indicator */}
        <div className={`
          relative w-12 h-6 rounded-full transition-all duration-300
          ${buttonState
            ? 'bg-white/30'
            : 'bg-gray-200'
          }
        `}>
          <div className={`
            absolute top-1 w-4 h-4 rounded-full transition-all duration-300
            ${buttonState
              ? 'left-7 bg-white'
              : 'left-1 bg-gray-400'
            }
          `}></div>
        </div>
      </div>

      {/* Status Label */}
      <div className={`
        mt-2 text-xs font-medium uppercase tracking-wider
        ${buttonState ? 'text-green-100' : 'text-gray-400'}
      `}>
        {isLoading ? 'Updating...' : (buttonState ? 'Active' : 'Inactive')}
      </div>
    </button>
  );
};

export default ControlButton;
