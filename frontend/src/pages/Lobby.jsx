import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import createSocket from "../socket";

export default function Lobby() {
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");

  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState(0);
  const [searching, setSearching] = useState(false);
  const [queueTime, setQueueTime] = useState(0);

  const [matchRequest, setMatchRequest] = useState(null); // { roomId, opponent }
  const [matchTimeLeft, setMatchTimeLeft] = useState(10);
  const [decisionMade, setDecisionMade] = useState(false); // informacja czy kliknąłem Akceptuj/Odrzuć

  const queueTimerRef = useRef(null);
  const matchTimerRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const s = createSocket({ userId, username });
    setSocket(s);

    s.on("onlineCount", setOnline);

    // --- KOLEJKA ---
    s.on("queueJoined", () => {
      setSearching(true);
      setQueueTime(0);

      queueTimerRef.current = setInterval(() => {
        setQueueTime(prev => prev + 1);
      }, 1000);
    });

    s.on("queueLeft", () => {
      setSearching(false);
      clearInterval(queueTimerRef.current);
      setQueueTime(0);
    });

    // --- MATCH REQUEST ---
    s.on("matchRequest", ({ roomId, opponent }) => {
      setMatchRequest({ roomId, opponent });
      setMatchTimeLeft(10);
      setDecisionMade(false);

      clearInterval(matchTimerRef.current);
      matchTimerRef.current = setInterval(() => {
        setMatchTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(matchTimerRef.current);
            setMatchRequest(null);
            setDecisionMade(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    // --- MATCH REJECTED ---
    s.on("matchRejected", ({ rejectedUserId }) => {
      setMatchRequest(null);
      setDecisionMade(false);
      if (userId !== rejectedUserId) {
        // jeśli nie odrzuciłem ja, zostaję w kolejce
        setSearching(true);
      } else {
        // jeśli ja odrzuciłem → już nie w kolejce
        setSearching(false);
      }
    });

    // --- MATCH TIMEOUT ---
    s.on("matchTimeout", ({ timeoutUserId }) => {
      setMatchRequest(null);
      setDecisionMade(false);
      if (userId === timeoutUserId) {
        setSearching(false); // timeout → wyrzucony z kolejki
      } else {
        setSearching(true); // przeciwnik timeout → ja nadal w kolejce
      }
    });

    // --- MATCH ACCEPTED ---
    s.on("matchAccepted", ({ roomId, players }) => {
      navigate(`/game/${roomId}`, { state: { players } });
    });

    return () => {
      s.disconnect();
      clearInterval(queueTimerRef.current);
      clearInterval(matchTimerRef.current);
    };
  }, []);

  const joinQueue = () => socket?.emit("joinQueue");
  const leaveQueue = () => socket?.emit("leaveQueue");
  const acceptMatch = () => {
    setDecisionMade(true);
    socket?.emit("acceptMatch", { roomId: matchRequest.roomId });
  };
  const rejectMatch = () => {
    setDecisionMade(true);
    socket?.emit("rejectMatch", { roomId: matchRequest.roomId });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Lobby</h1>

        <p className="text-gray-600">
          Online graczy: <span className="font-semibold text-blue-600">{online}</span>
        </p>

        {/* --- Brak matchRequest → pokazujemy kolejkę lub przycisk Zagraj --- */}
        {!matchRequest && (
          <>
            <button
              onClick={joinQueue}
              disabled={searching}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {searching ? "Szukanie przeciwnika..." : "Zagraj"}
            </button>

            {searching && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center text-gray-700">
                  <span>Czas w kolejce:</span>
                  <span className="font-semibold text-blue-600">{queueTime}s</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(queueTime * 5, 100)}%` }}
                  />
                </div>
                <button
                  onClick={leaveQueue}
                  className="w-full py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                >
                  Anuluj
                </button>
              </div>
            )}
          </>
        )}

        {/* --- MatchRequest → pokazujemy decyzję przeciwnika + timer --- */}
        {matchRequest && (
          <div className="p-4 bg-yellow-100 rounded-xl space-y-4">
            <p>
              Przeciwnik: <span className="font-semibold text-gray-800">{matchRequest.opponent}</span>
            </p>

            <p>
              Czas na decyzję: <span className="font-bold text-red-600">{matchTimeLeft}s</span>
            </p>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  decisionMade ? "bg-green-500" : "bg-red-500"
                }`}
                style={{ width: `${((10 - matchTimeLeft) / 10) * 100}%` }}
              />
            </div>

            <div className="flex gap-4 mt-2">
              <button
                onClick={acceptMatch}
                disabled={decisionMade}
                className="flex-1 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50"
              >
                Akceptuj
              </button>
              <button
                onClick={rejectMatch}
                disabled={decisionMade}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50"
              >
                Odrzuć
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
