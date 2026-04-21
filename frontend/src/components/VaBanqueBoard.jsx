import { useState, useEffect } from "react";

export default function VaBanqueBoard({ 
  board, 
  currentTurn, 
  myUsername, 
  players,
  onQuestionSelect,
  gameId,
  onGameOver
}) {
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const isMyTurn = currentTurn === myUsername;


  const allUsed = board.every(cat =>
    Object.values(cat.questions).every(q => q.used)
  );

  useEffect(() => {
    if (allUsed && onGameOver) {
      onGameOver();
    }
  }, [allUsed]);

  const handleQuestionClick = (categoryId, difficulty, questionData) => {
    if (!isMyTurn) return;
    if (questionData.used) return;
    setSelectedQuestion({ categoryId, difficulty });
    onQuestionSelect(categoryId, difficulty, questionData);
  };

  return (
    <div className="min-h-screen bg-blue-950 p-4">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Header */}
        <div className="text-center py-2">
          <h1 className="text-4xl font-black tracking-widest text-yellow-400 uppercase drop-shadow-lg">
            VA<span className="text-white">BANQUE</span>
          </h1>
        </div>

        {/* Wyniki graczy */}
        <div className="grid grid-cols-2 gap-3">
          {players.map(player => {
            const isActive = player.username === currentTurn;
            const isMe = player.username === myUsername;
            return (
              <div
                key={player.userId}
                className={`rounded-xl p-4 border-2 transition-all ${
                  isActive
                    ? 'bg-blue-900 border-orange-400 shadow-md shadow-orange-500/30'
                    : 'bg-blue-900/60 border-blue-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <span className="text-orange-400 text-lg animate-pulse">▶</span>
                    )}
                    <p className={`font-black text-base ${isActive ? 'text-yellow-400' : 'text-white'}`}>
                      {player.username}
                      {isMe && (
                        <span className="text-orange-400 ml-2 text-xs font-normal">(Ty)</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 text-3xl font-black leading-none">{player.score}</p>
                    <p className="text-blue-400 text-xs uppercase tracking-wider">pkt</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Plansza */}
        <div className="rounded-2xl overflow-hidden border-4 border-orange-500 shadow-2xl shadow-orange-900/40">
          <div className="grid grid-cols-5">

            {/* Nagłówki kategorii */}
            {board.map((category) => (
              <div
                key={category.categoryId}
                className="bg-blue-900 border border-blue-800 px-2 py-3 flex items-center justify-center min-h-[64px]"
              >
                <h3 className="text-white font-black text-center text-xs uppercase tracking-wide leading-tight">
                  {category.categoryName}
                </h3>
              </div>
            ))}

            {/* Wiersze pytań: 100–500 */}
            {[100, 200, 300, 400, 500].map(difficulty =>
              board.map((category) => {
                const questionData = category.questions[difficulty];
                const isUsed = questionData?.used;
                const isSelected =
                  selectedQuestion?.categoryId === category.categoryId &&
                  selectedQuestion?.difficulty === difficulty;

                return (
                  <button
                    key={`${category.categoryId}-${difficulty}`}
                    onClick={() => handleQuestionClick(category.categoryId, difficulty, questionData)}
                    disabled={isUsed || !isMyTurn}
                    className={`
                      h-14 w-full font-black text-2xl border border-blue-800 transition-all duration-100
                      ${isUsed
                        ? 'bg-blue-950 border-blue-900 cursor-not-allowed'
                        : isMyTurn
                          ? 'bg-blue-900 text-yellow-400 hover:bg-blue-800 hover:text-orange-300 hover:border-orange-400 cursor-pointer active:scale-95 active:bg-blue-700'
                          : 'bg-blue-900 text-yellow-400/40 cursor-not-allowed'
                      }
                      ${isSelected ? 'ring-2 ring-inset ring-orange-400 text-orange-300' : ''}
                    `}
                  >
                    {isUsed ? '' : difficulty}
                  </button>
                );
              })
            )}

          </div>
        </div>

      </div>
    </div>
  );
}