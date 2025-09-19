// src/components/EndOfLevelModal.jsx
import React from "react";

export default function EndOfLevelModal({ strokes, onNext, onRetry, onMainMenu }) {
  const style = { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", color: "#fff", fontFamily: "sans-serif" };
  const box = { background: "#202d3b", padding: 40, borderRadius: 10, textAlign: "center" };
  const btn = { margin: 10, padding: "10px 20px", cursor: "pointer", borderRadius: 5, background: "#009593", border: "none", color: "#fff" };
  return (
    <div style={style}>
      <div style={box}>
        <h2>Hole Complete!</h2>
        <p>Strokes: {strokes}</p>
        <button style={btn} onClick={onNext}>Next Hole</button>
        <button style={btn} onClick={onRetry}>Retry</button>
        <button style={btn} onClick={onMainMenu}>Main Menu</button>
      </div>
    </div>
  );
}
