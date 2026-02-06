'use client'
import { useState, useEffect } from "react";

export default function Slider() {
  const [currentImage, setCurrentImage] = useState(0);
  const images = ["cnestenC.png", "greenpark.png", "iresen1.png", "fst.png"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prevImage) => (prevImage + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 text-white p-6 flex flex-col items-center h-full">
      {/* Title */}
      <h3 className="text-lg font-semibold mb-2 text-center text-white/90">
        Our Partners
      </h3>

      {/* Dots Indicator */}
      <div className="flex gap-2 mb-4">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImage(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentImage
                ? "bg-white w-6"
                : "bg-white/40 hover:bg-white/60"
              }`}
          />
        ))}
      </div>

      {/* Image Slider */}
      <div className="relative w-full h-64 overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm">
        {images.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Partner ${index + 1}`}
            className={`
              absolute inset-0 w-full h-full object-contain p-4
              transition-all duration-700 ease-in-out
              ${index === currentImage
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95"
              }
            `}
          />
        ))}
      </div>
    </div>
  );
}
