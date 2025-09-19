import React from "react";
import "./EndofLevelModal.css";

export default function EndOfLevelModal({ strokes, onNext, onRetry, onMainMenu }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="eol-title">
      <div className="modal-card">
        <h2 id="eol-title" className="modal-title">Hole Complete! 🎉</h2>
        <div className="modal-sub">Nice shot! Here’s your result:</div>
        <div className="modal-strokes">Strokes: {strokes ?? 0}</div>
        <div className="modal-buttons">
          <button className="modal-btn next" onClick={onNext}>Next Hole</button>
          <button className="modal-btn retry" onClick={onRetry}>Retry</button>
          <button className="modal-btn menu" onClick={onMainMenu}>Main Menu</button>
        </div>
      </div>
    </div>
  );
}
