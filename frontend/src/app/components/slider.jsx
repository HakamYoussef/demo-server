'use client'
import { useState, useEffect } from "react";

export default function Slider() {
  const [currentImage, setCurrentImage] = useState(0);
  const images = ["cnestenC.png", "greenpark.png", "iresen1.png", "fst.png"];

  // Auto-play images every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prevImage) => (prevImage + 1) % images.length);
    }, 2000); // Change image every 3 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-green-500 text-white rounded-tr-2xl rounded-br-2xl py-4 px-4 flex flex-col items-center">
      <div className="relative w-52 h-72 overflow-hidden">
        {images.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Slide ${index}`}
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ${
              index === currentImage ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
