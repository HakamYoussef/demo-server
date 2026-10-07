"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../context/authContext.jsx";

const protectedRoute = (WrappedComponent) => {
  const Wrapper = (props) => {
    const { userId, token, isAuthLoading } = useAuthContext();
    const router = useRouter();

    useEffect(() => {
      if (!isAuthLoading && (!userId || !token)) {
        router.replace("/");
      }
    }, [isAuthLoading, userId, token, router]);

    if (isAuthLoading || !userId || !token) return null;
    return <WrappedComponent {...props} />;
  };

  return Wrapper;
};

export default protectedRoute;