// HUD.jsx
export default function HUD({ hole, par, strokes }) {
  return <div style={{position:'absolute',top:10,left:10,color:'#fff'}}>Hole: {hole} | Par: {par} | Strokes: {strokes}</div>;
}