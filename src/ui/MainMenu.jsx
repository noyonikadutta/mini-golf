import { useNavigate } from "react-router-dom";
import "./MainMenu.css";

export default function MainMenu() {
  const navigate = useNavigate();

  const levels = [1, 2, 3]; // Added Level 3

  return (
<<<<<<< HEAD
    <div className="auth-container">
      <div className="auth-card" role="region" aria-label="Main menu card">
        <div className="auth-top">
          <div className="logo-ball" aria-hidden="true" />
          <div>
            <div className="auth-title">MiniGolf Studio</div>
            <div className="auth-sub">Choose your level to start</div>
          </div>
        </div>
=======
    <div className="menu-container">
      <div className="menu-card">
        <h1 className="menu-title">🏌️ MiniGolf Studio</h1>
        <p className="menu-sub">Choose your level</p>
>>>>>>> 801d986 (Linked login page to menu)

        <div className="menu-grid">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => navigate(`/game/${level}`)}
<<<<<<< HEAD
              className="auth-btn btn-green"
=======
              className="menu-btn"
>>>>>>> 801d986 (Linked login page to menu)
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
<<<<<<< HEAD
          className="auth-btn btn-red"
=======
          className="menu-logout"
>>>>>>> 801d986 (Linked login page to menu)
        >
          Logout
        </button>
      </div>
    </div>
  );
}
