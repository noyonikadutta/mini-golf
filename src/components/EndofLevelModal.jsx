// EndOfLevelModal.jsx
export default function EndOfLevelModal({ onNext, onRetry, onMainMenu }) {
  return (
    <div style={{position:'absolute',top:'40%',left:'40%',background:'#000',color:'#fff',padding:20}}>
      <button onClick={onNext}>Next</button>
      <button onClick={onRetry}>Retry</button>
      <button onClick={onMainMenu}>Menu</button>
    </div>
  );
}