// src/components/HUD.jsx
import React from "react";

export default function HUD({ hole, par, strokes }) {
  const style = { position: "absolute", top: 20, left: 20, background: "rgba(0,0,0,0.5)", padding: "10px 20px", borderRadius: 8, color: "#fff", fontFamily: "sans-serif" };
  return (
    <div style={style}>
      <div>Hole: {hole}</div>
      <div>Par: {par}</div>
      <div>Strokes: {strokes}</div>
    </div>
  );
}
