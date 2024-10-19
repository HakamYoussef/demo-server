"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@chakra-ui/react";

const AuthContext = createContext();

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);

  const toast = useToast();

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    const storedId = localStorage.getItem("authId");
    if (storedToken) {
      setToken(storedToken);
    }
    if (storedId) {
      setUserId(storedId);
    }
  }, []);

  const login = (id, token) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("authId", id);
    setUserId(id);
    setToken(token);
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authId");
    toast({
      title: "You have successfully logged out",
      status: "success",
      duration: 5000,
      isClosable: true,
      position: "bottom",
    });
    setUserId(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ userId, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
