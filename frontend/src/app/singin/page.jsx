'use client'
import { useAuthContext } from "../context/authContext";
import { useRouter } from "next/navigation";
import { useToast, Spinner } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { FaRegEnvelope, FaLeaf, FaRadiation, FaCheck } from "react-icons/fa";
import { MdLockOutline } from "react-icons/md";

export default function Singin() {
  const router = useRouter();
  const toast = useToast();
  const { login } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedDashboard, setSelectedDashboard] = useState("agriculture"); // 'agriculture' or 'radiation'
  const images = ["cnestenC.png"];

  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        title: "Please enter email and password",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

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

      if (response.ok) {
        login(data.user._id, data.token);
        toast({
          title: "Login successful!",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "bottom",
        });

        // Navigate directly to selected dashboard
        if (selectedDashboard === "agriculture") {
          router.push("/air");
        } else {
          router.push("/radiation");
        }
      } else {
        toast({
          title: data.message || "Login failed",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    } catch (err) {
      setIsLoading(false);
      toast({
        title: "Connection error",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      console.log("Login error:", err);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prevImage) => (prevImage + 1) % images.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMmM1NWUiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>

      <div className="relative w-full max-w-5xl">
        <div className="modern-card overflow-hidden flex flex-col md:flex-row">

          {/* Left Side - Login Form */}
          <div className="w-full md:w-1/2 p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <img src="cnesten.png" className="w-20 h-20 object-contain" alt="CNESTEN logo" />
              </div>
              <p className="text-sm text-gray-500 mb-2">
                Developed by <span className="text-green-600 font-semibold">CNESTEN</span>
              </p>
              <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
              <div className="w-16 h-1 bg-gradient-to-r from-green-400 to-green-600 mx-auto mt-3 rounded-full"></div>
              <p className="text-gray-500 mt-3 text-sm">Sign in to access your dashboard</p>
            </div>

            {/* Login Form */}
            <div className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaRegEnvelope size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    name="email"
                    placeholder="Enter your email"
                    className="w-full py-3 px-12 border-2 border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-green-400 focus:bg-white transition-all duration-300"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <MdLockOutline size={20} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    name="password"
                    placeholder="Enter your password"
                    className="w-full py-3 px-12 border-2 border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-green-400 focus:bg-white transition-all duration-300"
                  />
                </div>
              </div>

              {/* Sign In Button */}
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full modern-btn modern-btn-primary py-4 text-lg flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Spinner size="sm" color="white" />
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
          </div>

          {/* Right Side - Dashboard Selection */}
          <div className="w-full md:w-1/2 bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 p-8 md:p-12 flex flex-col items-center justify-center text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>

            <div className="relative z-10 text-center w-full">
              <h2 className="text-3xl font-bold mb-2">IoT Monitoring</h2>
              <div className="w-16 h-1 bg-white/50 mx-auto mb-4 rounded-full"></div>
              <p className="text-green-100 mb-6 text-sm">Project Partners</p>

              {/* Partner Images Slideshow */}
              <div className="relative w-40 h-40 mx-auto bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-center mb-8">
                {images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Partner ${index}`}
                    className={`absolute w-28 h-28 object-contain transition-opacity duration-500 ${index === currentImage ? "opacity-100" : "opacity-0"
                      }`}
                  />
                ))}
              </div>

              {/* Dashboard Selection */}
              <p className="text-green-100 mb-4 text-sm font-medium">Select your dashboard:</p>
              <div className="space-y-3 w-full max-w-xs mx-auto">
                {/* Agriculture Option */}
                <button
                  onClick={() => setSelectedDashboard("agriculture")}
                  className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all duration-300 ${selectedDashboard === "agriculture"
                    ? "bg-white shadow-lg"
                    : "bg-white/20 hover:bg-white/30"
                    }`}
                >
                  <FaLeaf
                    size={20}
                    className={selectedDashboard === "agriculture" ? "text-green-600" : "text-white"}
                  />
                  <span className={`font-semibold flex-1 text-left ${selectedDashboard === "agriculture" ? "text-green-600" : "text-white"}`}>
                    Agricultural Monitoring
                  </span>
                  {selectedDashboard === "agriculture" && (
                    <FaCheck size={16} className="text-green-500" />
                  )}
                </button>

                {/* Radiation Option */}
                <button
                  onClick={() => setSelectedDashboard("radiation")}
                  className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all duration-300 ${selectedDashboard === "radiation"
                    ? "bg-white shadow-lg"
                    : "bg-white/20 hover:bg-white/30"
                    }`}
                >
                  <FaRadiation
                    size={20}
                    className={selectedDashboard === "radiation" ? "text-green-600" : "text-white"}
                  />
                  <span className={`font-semibold flex-1 text-left ${selectedDashboard === "radiation" ? "text-green-600" : "text-white"}`}>
                    Radiation Dashboard
                  </span>
                  {selectedDashboard === "radiation" && (
                    <FaCheck size={16} className="text-green-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}