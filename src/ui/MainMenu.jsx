import { useNavigate } from "react-router-dom";
import "./MainMenu.css";

export default function MainMenu() {
  const navigate = useNavigate();

  const levels = [1, 2, 3];

  return (
    <div className="auth-container">
      <div className="auth-card" role="region" aria-label="Main menu card">
        <div className="auth-top">
          <div className="logo-ball" aria-hidden="true" />
          <div>
            <div className="auth-title">MiniGolf Studio</div>
            <div className="auth-sub">Choose your level to start</div>
          </div>
        </div>

        <div className="level-buttons">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => navigate(`/game/${level}`)}
              className="auth-btn btn-green"
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
          className="auth-btn btn-red logout-btn"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
