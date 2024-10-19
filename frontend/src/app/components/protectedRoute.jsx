"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../context/authContext.jsx";

const protectedRoute = (WrappedComponent) => {
  const Wrapper = (props) => {
    const { userId, token } = useAuthContext();
    const router = useRouter();

    useEffect(() => {
      if (!userId || !token) {
        router.push("/");
      }
    }, [userId, router]);

    return userId ? <WrappedComponent {...props} /> : null;
  };

  return Wrapper;
};

export default protectedRoute;