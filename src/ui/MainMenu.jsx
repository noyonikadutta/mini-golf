import { useNavigate } from "react-router-dom";
import "./MainMenu.css";

export default function MainMenu() {
  const navigate = useNavigate();

  const levels = [1, 2, 3]; // Added Level 3

  return (
    <div className="menu-container">
      <div className="menu-card">
        <h1 className="menu-title">🏌️ MiniGolf Studio</h1>
        <p className="menu-sub">Choose your level</p>

        <div className="menu-grid">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => navigate(`/game/${level}`)}
              className="menu-btn"
            >
              Level {level}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("loggedIn");
            navigate("/login");
          }}
          className="menu-logout"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
