import { Routes, Route, Navigate } from "react-router-dom";
import Signup from "./auth/Signup";
import Login from "./auth/Login";
import MainMenu from "./ui/MainMenu";
import Canvas3D from "./scene/Canvas3D";
import Canvas3D_Level2 from "./scene/Canvas3D_Level2";
import Canvas3D_Level3 from "./scene/Canvas3D_Level3";

export default function App() {
  const loggedIn = localStorage.getItem("loggedIn") === "true";

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signup" />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login setLoggedIn={() => {}} />} />

      {/* Protected routes */}
      <Route
        path="/menu"
        element={loggedIn ? <MainMenu /> : <Navigate to="/signup" />}
      />
      <Route
        path="/game/1"
        element={loggedIn ? <Canvas3D /> : <Navigate to="/signup" />}
      />
      <Route
        path="/game/2"
        element={loggedIn ? <Canvas3D_Level2 /> : <Navigate to="/signup" />}
      />
      <Route
        path="/game/3"
        element={loggedIn ? <Canvas3D_Level3 /> : <Navigate to="/signup" />}
      />
    </Routes>
  );
}
