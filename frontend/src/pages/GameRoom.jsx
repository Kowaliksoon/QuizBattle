import { useLocation } from "react-router-dom";

export default function GameRoom() {
  const location = useLocation();
  const players = location.state?.players || [];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="grid grid-cols-2 gap-6 max-w-lg w-full">
        {players.map((p) => (
          <div key={p.id} className="bg-white p-6 rounded-xl shadow-xl text-center">
            <h2 className="text-xl font-bold">{p.username}</h2>
            <p>ID: {p.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
