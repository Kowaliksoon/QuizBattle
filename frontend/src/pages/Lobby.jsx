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

  const [matchRequest, setMatchRequest] = useState(null);
  const [matchTimeLeft, setMatchTimeLeft] = useState(10);
  const [decisionMade, setDecisionMade] = useState(false);

  const queueTimerRef = useRef(null);
  const matchTimerRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const s = createSocket({ userId, username });
    setSocket(s);

    s.on("onlineCount", setOnline);

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

    s.on("matchRejected", ({ rejectedUserId }) => {
      setMatchRequest(null);
      setDecisionMade(false);
      if (userId !== rejectedUserId) {
        setSearching(true);
      } else {
        setSearching(false);
      }
    });

    s.on("matchTimeout", ({ timeoutUserId }) => {
      setMatchRequest(null);
      setDecisionMade(false);
      if (userId === timeoutUserId) {
        setSearching(false);
      } else {
        setSearching(true);
      }
    });

    s.on("matchAccepted", ({ roomId, players, starter }) => {
      navigate(`/game/${roomId}`, { state: { roomId, players, starter } });
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-black text-white mb-2 drop-shadow-2xl tracking-tight">
            Quiz<span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Battle</span>
          </h1>
          <p className="text-purple-200 text-lg font-medium">Pokaż swoją wiedzę!</p>
        </div>

        {/* Main card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Stats bar */}
          <div className="bg-gradient-to-r from-purple-600/50 to-pink-600/50 backdrop-blur-sm px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white font-semibold text-sm">Gracze online</span>
              </div>
              <span className="text-white font-bold text-2xl">{online}</span>
            </div>
          </div>

          <div className="p-8">
            {/* No match request - Show play button or queue */}
            {!matchRequest && (
              <div className="space-y-6">
                {!searching ? (
                  <button
                    onClick={joinQueue}
                    className="w-full py-6 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-2xl font-black hover:from-yellow-500 hover:to-orange-600 transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl relative overflow-hidden group"
                  >
                    <span className="relative z-10">🎮 ZAGRAJ TERAZ</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                ) : (
                  <div className="space-y-6">
                    {/* Searching animation */}
                    <div className="text-center space-y-4">
                      <div className="flex justify-center items-center gap-3">
                        <div className="w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
                        <div className="w-4 h-4 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-4 h-4 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <h3 className="text-white text-2xl font-bold">Szukamy przeciwnika...</h3>
                      <p className="text-purple-200 text-lg">W kolejce od: <span className="text-yellow-400 font-bold">{queueTime}s</span></p>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(queueTime * 5, 100)}%` }}
                      ></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </div>

                    {/* Cancel button */}
                    <button
                      onClick={leaveQueue}
                      className="w-full py-4 rounded-xl bg-red-500/20 border-2 border-red-500 text-red-300 font-bold hover:bg-red-500/30 transition-all"
                    >
                      ✕ Anuluj wyszukiwanie
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Match request - Opponent found! */}
            {matchRequest && (
              <div className="space-y-6 animate-fadeIn">
                {/* Opponent found header */}
                <div className="text-center space-y-3 pb-6 border-b border-white/10">
                  <div className="inline-block px-6 py-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full text-white font-bold text-sm uppercase tracking-wider animate-pulse">
                    ⚡ Znaleziono przeciwnika!
                  </div>
                  <h2 className="text-white text-3xl font-black">Gotowy na pojedynek?</h2>
                </div>

                {/* Opponent card */}
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-purple-200 text-sm font-semibold uppercase tracking-wide">Twój przeciwnik</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 text-xs font-bold">ONLINE</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                      {matchRequest.opponent.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-2xl font-bold">{matchRequest.opponent}</p>
                      <p className="text-purple-200 text-sm">Gracz QuizBattle</p>
                    </div>
                  </div>
                </div>

                {/* Timer */}
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-red-500/20 rounded-full border border-red-500/50">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-white font-bold text-xl">{matchTimeLeft}s</span>
                  </div>
                  
                  {/* Progress ring */}
                  <div className="flex justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="transform -rotate-90 w-32 h-32">
                        <circle
                          cx="64"
                          cy="64"
                          r="60"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-white/10"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="60"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className={`${matchTimeLeft <= 3 ? 'text-red-500' : 'text-yellow-400'} transition-all duration-1000`}
                          strokeDasharray={`${2 * Math.PI * 60}`}
                          strokeDashoffset={`${2 * Math.PI * 60 * (1 - matchTimeLeft / 10)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>

                  {decisionMade && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full border border-green-500">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-400 font-semibold">Czekamy na przeciwnika...</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    onClick={acceptMatch}
                    disabled={decisionMade}
                    className="py-5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-black hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
                  >
                    <span className="block text-2xl mb-1">✓</span>
                    AKCEPTUJ
                  </button>
                  <button
                    onClick={rejectMatch}
                    disabled={decisionMade}
                    className="py-5 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white text-lg font-black hover:from-red-600 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
                  >
                    <span className="block text-2xl mb-1">✕</span>
                    ODRZUĆ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6">
          <p className="text-purple-300 text-sm">
            Zalogowany jako <span className="font-bold text-white">{username}</span>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}