// app/Control/layout.jsx
import Navbar from "../components/Navbar";

export default function ControlLayout({ children }) {
  return (
    <body style={{paddingTop: "80px"}}>
      <div className="min-h-screen">
      <Navbar />
      {children}
    </div>
    </body>
    
  );
}