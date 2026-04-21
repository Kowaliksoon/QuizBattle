import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import createSocket from "../socket";
import SuggestTab from "../components/SuggestTab";

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

  const [activeTab, setActiveTab] = useState("play");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedGame, setExpandedGame] = useState(null);

  const [myRank, setMyRank] = useState({ rp: 0, rank: "🌱 Rookie" });
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const queueTimerRef = useRef(null);
  const matchTimerRef = useRef(null);

  useEffect(() => {
    if (!userId) return;


    fetchMyRank();

    const s = createSocket({ userId, username });
    setSocket(s);

    s.on("onlineCount", setOnline);

    s.on("queueJoined", () => {
      setSearching(true);
      setQueueTime(0);
      queueTimerRef.current = setInterval(() => setQueueTime(prev => prev + 1), 1000);
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
      if (userId !== rejectedUserId) setSearching(true);
      else setSearching(false);
    });

    s.on("matchTimeout", ({ timeoutUserId }) => {
      setMatchRequest(null);
      setDecisionMade(false);
      if (userId === timeoutUserId) setSearching(false);
      else setSearching(true);
    });

    s.on("matchAccepted", ({ roomId, players, starter }) => {
      sessionStorage.setItem("gameEnteredLegitimately", "true");
      navigate(`/game/${roomId}`, { state: { roomId, players, starter } });
    });

    return () => {
      s.disconnect();
      clearInterval(queueTimerRef.current);
      clearInterval(matchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
    if (activeTab === "leaderboard") fetchLeaderboard();
    if (activeTab === "profile") fetchMyRank();
  }, [activeTab]);

  const fetchMyRank = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/rank/${userId}`);
      const data = await res.json();
      setMyRank(data);
    } catch (err) {
      console.error("Błąd ładowania rangi:", err);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/history/${userId}`);
      const data = await res.json();
      setHistory(data.games || []);
    } catch (err) {
      console.error("Błąd ładowania historii:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const res = await fetch("http://localhost:3000/api/leaderboard");
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error("Błąd ładowania rankingu:", err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

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

  const stats = history.reduce((acc, game) => {
    const me = game.players.find(p => p.userId === userId);
    if (!me) return acc;
    acc.played++;
    if (game.winner === username) acc.wins++;
    else acc.losses++;
    acc.totalScore += me.score || 0;
    return acc;
  }, { played: 0, wins: 0, losses: 0, totalScore: 0 });

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const RANK_THRESHOLDS = [
    { name: "🌱 Rookie",            minRP: 0    },
    { name: "📚 Apprentice",        minRP: 200  },
    { name: "🎓 Scholar",           minRP: 500  },
    { name: "🧠 Intellectual",      minRP: 1000 },
    { name: "🏆 Knowledge Master",  minRP: 1800 },
    { name: "💎 Encyclopedia",      minRP: 3000 },
    { name: "🌟 Legend",            minRP: 5000 },
  ];

  const getNextRank = (rp) => {
    const next = RANK_THRESHOLDS.find(r => r.minRP > rp);
    return next || null;
  };

  const getRankColor = (rank) => {
    if (rank.includes("Legend")) return "text-yellow-300";
    if (rank.includes("Encyclopedia")) return "text-cyan-300";
    if (rank.includes("Knowledge Master")) return "text-yellow-400";
    if (rank.includes("Intellectual")) return "text-purple-400";
    if (rank.includes("Scholar")) return "text-blue-400";
    if (rank.includes("Apprentice")) return "text-green-400";
    return "text-gray-400";
  };

  const myPosition = leaderboard.findIndex(p => p.userId === userId) + 1;
  const nextRank = getNextRank(myRank.rp);

  return (
    <div className="min-h-screen bg-blue-950 flex items-center justify-center p-3 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-800 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-indigo-800 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-blue-900 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-4">
          <h1 className="text-4xl font-black tracking-widest text-yellow-400 uppercase drop-shadow-lg">
            VA<span className="text-white">BANQUE</span>
          </h1>
          <p className="text-blue-300 text-sm font-medium mt-1">Pokaż swoją wiedzę!</p>
        </div>

        <div className="bg-blue-900 rounded-2xl shadow-2xl border-2 border-orange-500 overflow-hidden">
          {/* Stats bar */}
          <div className="bg-blue-950 px-4 py-3 border-b-2 border-orange-500/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-blue-200 font-semibold text-xs uppercase tracking-wider">Gracze online</span>
              </div>
              <span className="text-yellow-400 font-black text-lg">{online}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b-2 border-blue-800">
            {[
              { id: "play",        label: "🎮 Graj" },
              { id: "leaderboard", label: "🏅 Ranking" },
              { id: "history",     label: "📋 Historia" },
              { id: "profile",     label: "👤 Profil" },
              { id: "suggest", label: "💡 Zgłoś" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 font-black text-xs uppercase tracking-widest transition-all duration-150 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-blue-950 text-yellow-400 border-b-2 border-yellow-400"
                    : "bg-blue-900 text-blue-400 hover:text-blue-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5">

            {/* ===== TAB: GRAJ ===== */}
            {activeTab === "play" && (
              <div className="space-y-4">
                {/* Ranga gracza */}
                <div className="bg-blue-950 rounded-xl p-3 border border-blue-800 flex items-center justify-between">
                  <div>
                    <p className="text-blue-400 text-xs uppercase tracking-widest">Twoja ranga</p>
                    <p className={`font-black text-sm mt-0.5 ${getRankColor(myRank.rank)}`}>{myRank.rank}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-400 text-xs uppercase tracking-widest">RP</p>
                    <p className="text-yellow-400 font-black text-lg">{myRank.rp}</p>
                  </div>
                </div>

                {!matchRequest && (
                  <div className="space-y-4">
                    {!searching ? (
                      <button
                        onClick={joinQueue}
                        className="w-full py-4 rounded-xl bg-indigo-700 border-2 border-indigo-500 text-yellow-400 text-xl font-black uppercase tracking-wider shadow-xl transition-all duration-150 hover:bg-indigo-600 hover:border-orange-400 hover:text-orange-300 active:scale-95 cursor-pointer"
                      >
                        🎮 ZAGRAJ TERAZ
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center space-y-2">
                          <div className="flex justify-center items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
                            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                          <h3 className="text-white text-lg font-black uppercase tracking-wide">Szukamy przeciwnika...</h3>
                          <p className="text-blue-300 text-sm">W kolejce od: <span className="text-yellow-400 font-black">{queueTime}s</span></p>
                        </div>
                        <div className="relative h-3 bg-blue-950 rounded-full overflow-hidden border border-blue-800">
                          <div
                            className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(queueTime * 5, 100)}%` }}
                          ></div>
                        </div>
                        <button
                          onClick={leaveQueue}
                          className="w-full py-3 rounded-xl bg-blue-950 border-2 border-red-500/70 text-red-400 font-bold hover:border-red-400 hover:text-red-300 transition-all text-sm uppercase tracking-wider cursor-pointer"
                        >
                          ✕ Anuluj wyszukiwanie
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {matchRequest && (
                  <div className="space-y-3">
                    <div className="text-center pb-3 border-b border-blue-800">
                      <div className="inline-block px-3 py-0.5 bg-green-500/20 border border-green-500 rounded-full text-green-400 font-black text-xs uppercase tracking-wider animate-pulse mb-1">
                        ⚡ Znaleziono przeciwnika!
                      </div>
                      <h2 className="text-white text-base font-black uppercase tracking-wide">Gotowy na pojedynek?</h2>
                    </div>

                    <div className="bg-blue-950 rounded-xl p-3 border-2 border-orange-500/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Twój przeciwnik</span>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-green-400 text-xs font-black">ONLINE</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-700 border-2 border-orange-500 flex items-center justify-center text-yellow-400 text-lg font-black shadow-lg">
                          {matchRequest.opponent.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white text-base font-black">{matchRequest.opponent}</p>
                          <p className="text-blue-400 text-xs">Gracz VaBanque</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <div className="relative w-14 h-14">
                        <svg className="transform -rotate-90 w-14 h-14">
                          <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="5" fill="none" className="text-blue-950" />
                          <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="5" fill="none"
                            className={`${matchTimeLeft <= 3 ? 'text-red-500' : 'text-yellow-400'} transition-all duration-1000`}
                            strokeDasharray={`${2 * Math.PI * 24}`}
                            strokeDashoffset={`${2 * Math.PI * 24 * (1 - matchTimeLeft / 10)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-yellow-400 font-black text-sm">{matchTimeLeft}s</span>
                      </div>
                      {decisionMade && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-950 rounded-full border border-green-500">
                          <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-400 font-bold text-xs">Czekamy na przeciwnika...</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={acceptMatch} disabled={decisionMade}
                        className={`py-2.5 rounded-xl bg-blue-950 border-2 border-green-500 text-green-400 text-sm font-black uppercase tracking-wide transition-all duration-150 ${decisionMade ? "opacity-40 cursor-not-allowed" : "hover:bg-green-500/20 hover:text-green-300 cursor-pointer"}`}>
                        ✓ AKCEPTUJ
                      </button>
                      <button onClick={rejectMatch} disabled={decisionMade}
                        className={`py-2.5 rounded-xl bg-blue-950 border-2 border-red-500 text-red-400 text-sm font-black uppercase tracking-wide transition-all duration-150 ${decisionMade ? "opacity-40 cursor-not-allowed" : "hover:bg-red-500/20 hover:text-red-300 cursor-pointer"}`}>
                        ✕ ODRZUĆ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== TAB: RANKING ===== */}
            {activeTab === "leaderboard" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-blue-300 text-xs uppercase tracking-widest font-semibold">Top 20 graczy</p>
                  <button onClick={fetchLeaderboard} className="text-blue-500 hover:text-blue-300 text-xs uppercase tracking-wider cursor-pointer transition-colors">↻ Odśwież</button>
                </div>

                {leaderboardLoading && (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-yellow-400 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-blue-500 text-xs uppercase tracking-widest">Ładowanie...</p>
                  </div>
                )}

                {!leaderboardLoading && leaderboard.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-blue-600 text-sm uppercase tracking-widest">Brak danych</p>
                  </div>
                )}

                {!leaderboardLoading && leaderboard.map((player, idx) => {
                  const isMe = player.userId === userId;
                  const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;

                  return (
                    <div key={player.userId}
                      className={`rounded-xl px-4 py-3 flex items-center gap-3 border-2 transition-all ${
                        isMe
                          ? "bg-indigo-900/50 border-yellow-500/70"
                          : "bg-blue-950 border-blue-800"
                      }`}
                    >
                      <div className="w-7 text-center flex-shrink-0">
                        {medal
                          ? <span className="text-lg">{medal}</span>
                          : <span className="text-blue-500 font-black text-sm">#{idx + 1}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-sm truncate ${isMe ? "text-yellow-400" : "text-white"}`}>
                          {player.username} {isMe && <span className="text-xs text-blue-400">(Ty)</span>}
                        </p>
                        <p className={`text-xs ${getRankColor(player.rank)}`}>{player.rank}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-yellow-400 font-black text-sm">{player.rp} RP</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ===== TAB: HISTORIA ===== */}
            {activeTab === "history" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-blue-300 text-xs uppercase tracking-widest font-semibold">Ostatnie gry</p>
                  <button onClick={fetchHistory} className="text-blue-500 hover:text-blue-300 text-xs uppercase tracking-wider cursor-pointer transition-colors">↻ Odśwież</button>
                </div>

                {historyLoading && (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-yellow-400 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-blue-500 text-xs uppercase tracking-widest">Ładowanie...</p>
                  </div>
                )}

                {!historyLoading && history.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-blue-600 text-sm uppercase tracking-widest">Brak rozegranych gier</p>
                  </div>
                )}

                {!historyLoading && history.map((game) => {
                  const me = game.players.find(p => p.userId === userId);
                  const opponent = game.players.find(p => p.userId !== userId);
                  const won = game.winner === username;
                  const isExpanded = expandedGame === game._id;

                  return (
                    <div key={game._id} className={`rounded-xl border-2 overflow-hidden transition-all ${won ? "border-yellow-500/50" : "border-blue-800"}`}>
                      <button
                        onClick={() => setExpandedGame(isExpanded ? null : game._id)}
                        className="w-full bg-blue-950 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-blue-900/80 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-base ${won ? "text-yellow-400" : "text-blue-500"}`}>{won ? "🏆" : "💀"}</span>
                          <div className="text-left">
                            <p className="text-white text-xs font-black uppercase tracking-wide">
                              {me?.username} <span className="text-blue-500">vs</span> {opponent?.username}
                            </p>
                            <p className="text-blue-500 text-xs">{game.finishedAt ? formatDate(game.finishedAt) : "—"}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className={`text-lg font-black leading-none ${won ? "text-yellow-400" : "text-blue-300"}`}>
                              {me?.score} <span className="text-blue-600 text-xs">:</span> {opponent?.score}
                            </p>
                            <p className={`text-xs font-black uppercase ${won ? "text-yellow-500" : "text-red-500"}`}>
                              {won ? "WYGRANA" : "PRZEGRANA"}
                            </p>
                          </div>
                          <span className={`text-blue-500 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 py-3 bg-blue-900/50 grid grid-cols-2 gap-3">
                          {game.players.map(p => (
                            <div key={p.userId} className="text-center">
                              <p className="text-white text-sm font-black">{p.username}</p>
                              <p className="text-yellow-400 text-lg font-black">{p.score} pkt</p>
                              <p className="text-green-400 text-xs">✓ {p.correctAnswers} poprawnych</p>
                              <p className="text-red-400 text-xs">✗ {p.wrongAnswers} błędnych</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ===== TAB: PROFIL ===== */}
            {activeTab === "profile" && (
              <div className="space-y-4">
                {/* Avatar + nick + ranga */}
                <div className="flex items-center gap-4 bg-blue-950 rounded-xl p-4 border-2 border-orange-500/50">
                  <div className="w-14 h-14 rounded-full bg-indigo-700 border-2 border-orange-500 flex items-center justify-center text-yellow-400 text-2xl font-black shadow-lg flex-shrink-0">
                    {username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-black text-lg uppercase tracking-wide">{username}</p>
                    <p className={`text-sm font-black ${getRankColor(myRank.rank)}`}>{myRank.rank}</p>
                    <p className="text-blue-400 text-xs">{myRank.rp} RP {myPosition > 0 && `· #${myPosition} w rankingu`}</p>
                  </div>
                </div>

                {/* Pasek postępu do następnej rangi */}
                {nextRank && (
                  <div className="bg-blue-950 rounded-xl p-3 border border-blue-800">
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-blue-400 text-xs uppercase tracking-widest">Następna ranga</p>
                      <p className={`text-xs font-black ${getRankColor(nextRank.name)}`}>{nextRank.name}</p>
                    </div>
                    <div className="relative h-2.5 bg-blue-900 rounded-full overflow-hidden border border-blue-700">
                      {(() => {
                        const currentThreshold = RANK_THRESHOLDS.filter(r => r.minRP <= myRank.rp).pop();
                        const progress = ((myRank.rp - currentThreshold.minRP) / (nextRank.minRP - currentThreshold.minRP)) * 100;
                        return (
                          <div
                            className="absolute inset-y-0 left-0 bg-yellow-400 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        );
                      })()}
                    </div>
                    <p className="text-blue-500 text-xs mt-1 text-right">{myRank.rp} / {nextRank.minRP} RP</p>
                  </div>
                )}

                {!nextRank && (
                  <div className="bg-blue-950 rounded-xl p-3 border border-yellow-500/50 text-center">
                    <p className="text-yellow-400 font-black text-sm">🌟 Maksymalna ranga osiągnięta!</p>
                  </div>
                )}

                {/* Statystyki */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-950 rounded-xl p-3 border-2 border-blue-800 text-center">
                    <p className="text-yellow-400 text-3xl font-black leading-none">{stats.played}</p>
                    <p className="text-blue-400 text-xs uppercase tracking-widest mt-1">Gier</p>
                  </div>
                  <div className="bg-blue-950 rounded-xl p-3 border-2 border-blue-800 text-center">
                    <p className="text-green-400 text-3xl font-black leading-none">{stats.wins}</p>
                    <p className="text-blue-400 text-xs uppercase tracking-widest mt-1">Wygranych</p>
                  </div>
                  <div className="bg-blue-950 rounded-xl p-3 border-2 border-blue-800 text-center">
                    <p className="text-red-400 text-3xl font-black leading-none">{stats.losses}</p>
                    <p className="text-blue-400 text-xs uppercase tracking-widest mt-1">Przegranych</p>
                  </div>
                  <div className="bg-blue-950 rounded-xl p-3 border-2 border-blue-800 text-center">
                    <p className="text-orange-400 text-3xl font-black leading-none">
                      {stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0}%
                    </p>
                    <p className="text-blue-400 text-xs uppercase tracking-widest mt-1">Win rate</p>
                  </div>
                </div>

                <div className="bg-blue-950 rounded-xl p-3 border-2 border-orange-500/30 flex items-center justify-between">
                  <p className="text-blue-300 text-xs uppercase tracking-widest font-semibold">Łączne punkty</p>
                  <p className="text-yellow-400 font-black text-2xl">{stats.totalScore}</p>
                </div>
              </div>
            )}

            {/* ===== TAB: ZGŁOŚ ===== */}
          {activeTab === "suggest" && (
            <SuggestTab userId={userId} username={username} />
          )}

          </div>
        </div>

        <div className="text-center mt-3 space-y-2">
          <p className="text-blue-400 text-xs">
            Zalogowany jako <span className="font-black text-white">{username}</span>
          </p>
          <div className="flex gap-2 justify-center">
            {["test1|Player1", "test2|Player2", "test3|Player3"].map(pair => {
              const [id, name] = pair.split("|");
              return (
                <button key={id}
                  onClick={() => { localStorage.setItem("userId", id); localStorage.setItem("username", name); window.location.reload(); }}
                  className="px-2 py-1 bg-blue-900 hover:bg-blue-800 rounded text-xs text-blue-200 border border-blue-700"
                >
                  🎮 {name}
                </button>
              );
            })}
          </div>
          <p className="text-blue-600 text-xs italic">(Przyciski do testów - usuń w produkcji)</p>
        </div>
      </div>
    </div>
  );
}