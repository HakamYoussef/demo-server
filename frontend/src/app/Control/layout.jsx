import Navbar from "../components/Navbar";

export default function ControlLayout({ children }) {
  return (
    <div className="min-h-screen pt-[80px]">
      <Navbar />
      {children}
    </div>
  );
}
