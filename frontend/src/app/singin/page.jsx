'use client'
import { useAuthContext } from "../context/authContext";
import { useRouter } from "next/navigation";
import { useToast } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { FaRegEnvelope } from "react-icons/fa";
import {MdLockOutline} from "react-icons/md";
import { Spinner } from "@chakra-ui/react";
export default function Singin() {
  const router = useRouter();
  const toast = useToast();
  const { login, logout } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const images = ["cnestenC.png","greenpark.png", "iresen1.png", "fst.png"];
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://213.199.35.129:5002/api/users/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      setIsLoading(false);
      localStorage.setItem("userInfo", JSON.stringify(data));
      setCurrentUser(data);

      if (response.ok) {
        login(data.user._id, data.token);
        toast({
          title: "You logged in successfully",
          status: "success",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
        router.push("/air");
      } else {
        toast({
          title: `${data.message}`,
          status: "warning",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    } catch (err) {
      setIsLoading(false);
      console.log("Login error:", err);
    }
  };  
  // Auto play images every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prevImage) => (prevImage + 1) % images.length);
    }, 2000); // Change image every 3 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-100">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <div className="bg-white rounded-2xl shadow-2xl flex w-2/3 max-w-4xl">
          <div className="w-3/5 p-2">
            <div className="text-left font-bold mb-2">
                <span>Developed by </span> <span className="text-green-500">CNESTEN</span>
            </div>
            <div className="flex justify-center">
              <img src="cnesten.png" className="w-16 h-16" alt="CNESTEN logo" />
            </div>
            
            <div className="py-13">
                    <h2 className="text-2xl font-bold text-green-500 ">Sign in to account</h2>
                    <div className="border-2 w-32 border-green-500 inline-block mb-1"></div>
                    <p className="text-gray-400 my-3/5">use your account</p>
                    <div className="mt-2 flex flex-col items-center">
                    <div className="bg-gray-100 w-80 gap-1 p-2 flex mb-1"> 
                        <FaRegEnvelope className="text-gray-400 mx-1"/> 
                        <input
                         type="email"
                         value={email}
                         onChange={(e) => setEmail(e.target.value)} 
                         name="email" 
                         placeholder="Email" 
                         className="mx-1 bg-gray-100 outline-none text-sm flex-1" />    
                    </div>
                    <div className="bg-gray-100 w-80 gap-1 p-2 flex mt-1"> 
                        <MdLockOutline className="text-gray-400 mx-1"/> 
                        <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)} 
                        name="password" 
                        placeholder="Password" 
                        className="mx-1 bg-gray-100 outline-none text-sm flex-1" />    
                    </div>
                        <button
                        onClick={handleLogin}
                        disabled={isLoading} 
                        className="border-2 border-green-500 rounded-full mt-2 mb-1 px-12 py-2 inline-block font-semibold hover:bg-green-500 hover:text-white">
                        {isLoading ? <Spinner size="sm" /> : "SUBMIT"}
                        </button>

                        <div className="mt-2 w-5 border-2 border-black"></div>
                        <sub className="pt-2 text-sm">Agro-Photovoltaique Experimental Station</sub>
                    </div>
            </div>
          </div>

          {/* Slideshow Section */}
          <div className="w-3/5 bg-green-500 text-white rounded-tr-2xl rounded-br-2xl py-20 px-12">
            <h2 className="text-2xl font-bold mb-1">Green House Monitoring</h2>
            <div className="border-2 w-32 border-white inline-block mb-1"></div>
            <h2 className="font-bold">The partenrs of this project are : </h2>
            <div className="my-2 ml-2 mr-2 pr-2 relative w-52 h-72 overflow-hidden">
  {images.map((image, index) => (
    <img
      key={index}
      src={image}
      alt={`Slide ${index}`}
      className={`absolute w-full h-full object-contain transition-opacity duration-1000 ${
        index === currentImage ? "opacity-100" : "opacity-0"
      }`}
    />
  ))}
</div>

          </div>
        </div>
      </main>
    </div>
  );
}