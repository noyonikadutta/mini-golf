import React from "react";
import "./ScoreBadge.css";

export default function ScoreBadge({ hole, par, strokes }) {
  return (
    <div className="score-badge" aria-label="Score HUD">
      <div className="stat">
        <span className="label">Hole</span>
        <span className="value">{hole ?? "-"}</span>
      </div>
      <div className="sep" />
      <div className="stat">
        <span className="label">Par</span>
        <span className="value">{par ?? "-"}</span>
      </div>
      <div className="sep" />
      <div className="stat">
        <span className="label">Strokes</span>
        <span className="value">{strokes ?? 0}</span>
      </div>
    </div>
  );
}
