import { useEffect, useState, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";

export default function GameRoom() {
  const { state } = useLocation();
  const { roomId: urlRoomId } = useParams();
  
  const players = state?.players || [];
  const roomId = state?.roomId || urlRoomId || "defaultRoom";
  const backendStarter = state?.starter; // 🎯 Starter z backendu!

  const [starter, setStarter] = useState(null);
  const [currentHighlight, setCurrentHighlight] = useState(0);
  const [animating, setAnimating] = useState(false);

  const intervalRef = useRef(null);
  const stepRef = useRef(0);
  
  // Audio Context dla dźwięków
  const audioContextRef = useRef(null);

  // Funkcja do odtworzenia dźwięku "tick"
  const playTickSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 800; // Wysoki dźwięk
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  };

  // Funkcja do odtworzenia dźwięku zwycięstwa
  const playWinSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    
    // Trzy nuty w akordzie (C-E-G)
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const startTime = ctx.currentTime + i * 0.1;
      gainNode.gain.setValueAtTime(0.15, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.5);
    });
  };

  useEffect(() => {
    if (players.length < 2) return;

    // Sprawdzamy localStorage
    const savedStarter = localStorage.getItem(`starter_${roomId}`);
    const animatedBefore = localStorage.getItem(`starterAnimated_${roomId}`);

    if (savedStarter && animatedBefore) {
      setStarter(savedStarter);
      const starterIndex = players.indexOf(savedStarter);
      setCurrentHighlight(starterIndex >= 0 ? starterIndex : 0);
      return;
    }

    // START ANIMACJI z przyspieszeniem i zwalnianiem
    const startAnimation = () => {
      setAnimating(true);
      stepRef.current = 0;

      const totalSteps = 40; // więcej kroków = płynniejsza animacja
      
      const animate = () => {
        stepRef.current++;
        const step = stepRef.current;
        
        // Przesuwamy highlight
        setCurrentHighlight((prev) => {
          const next = (prev + 1) % players.length;
          
          // Odtwarzamy dźwięk tick przy każdym skoku
          try {
            playTickSound();
          } catch (error) {
            // Ignorujemy błędy audio (np. autoplay policy)
          }
          
          return next;
        });

        if (step >= totalSteps) {
          // KONIEC ANIMACJI
          clearInterval(intervalRef.current);
          
          setTimeout(() => {
            // ✅ Używamy startera z backendu (nie losujemy!)
            const finalIndex = players.indexOf(backendStarter);
            const chosen = backendStarter;
            
            setCurrentHighlight(finalIndex >= 0 ? finalIndex : 0);
            setStarter(chosen);
            setAnimating(false);

            // Odtwarzamy dźwięk zwycięstwa
            try {
              playWinSound();
            } catch (error) {
              // Ignorujemy błędy audio
            }

            localStorage.setItem(`starter_${roomId}`, chosen);
            localStorage.setItem(`starterAnimated_${roomId}`, "true");
          }, 400);
          return;
        }

        // Obliczamy opóźnienie z przyspieszeniem/zwalnianiem
        // Faza 1 (0-30%): Szybkie przyspieszenie (200ms → 80ms)
        // Faza 2 (30-60%): Stała prędkość (80ms)
        // Faza 3 (60-100%): Stopniowe zwalnianie (80ms → 500ms)
        let delay;
        const progress = step / totalSteps;
        
        if (progress < 0.3) {
          // Przyspieszenie
          delay = 200 - (progress / 0.3) * 120; // 200ms → 80ms
        } else if (progress < 0.6) {
          // Stała prędkość
          delay = 80;
        } else {
          // Zwalnianie
          const slowProgress = (progress - 0.6) / 0.4;
          delay = 80 + slowProgress * 420; // 80ms → 500ms
        }

        intervalRef.current = setTimeout(animate, delay);
      };

      animate();
    };

    const timeout = setTimeout(startAnimation, 500);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [players, roomId, backendStarter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8">
        {/* TYTUŁ */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            {animating ? "🎲 Losowanie..." : starter ? "🎮 Gra rozpoczęta!" : "Przygotowanie..."}
          </h1>
          {starter && !animating && (
            <p className="text-2xl text-indigo-600 font-semibold animate-pulse">
              {starter} rozpoczyna!
            </p>
          )}
        </div>

        {/* KARTY GRACZY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {players.map((player, idx) => {
            const isHighlighted = currentHighlight === idx;
            const isStarter = !animating && starter === player;

            return (
              <div
                key={player}
                className={`relative bg-white p-10 rounded-3xl text-center transition-all duration-200 transform
                  ${isHighlighted && animating
                    ? "border-[6px] border-yellow-400 scale-110 shadow-2xl bg-gradient-to-br from-yellow-50 to-orange-50"
                    : isStarter
                    ? "border-[6px] border-green-500 scale-105 shadow-2xl bg-gradient-to-br from-green-50 to-emerald-50"
                    : "border-4 border-gray-200 scale-100 shadow-lg"
                  }`}
              >
                {/* Avatar */}
                <div className={`w-28 h-28 mx-auto mb-6 rounded-full flex items-center justify-center text-5xl font-bold transition-all duration-200
                  ${isHighlighted && animating
                    ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-xl scale-110"
                    : isStarter
                    ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-xl"
                    : "bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600"
                  }`}>
                  {player.charAt(0).toUpperCase()}
                </div>

                {/* Nazwa gracza */}
                <p className={`text-3xl font-bold mb-4 transition-colors duration-200
                  ${isHighlighted && animating
                    ? "text-orange-600"
                    : isStarter
                    ? "text-green-600"
                    : "text-gray-800"
                  }`}>
                  {player}
                </p>

                {/* Status podczas animacji */}
                {animating && isHighlighted && (
                  <div className="mt-4">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-100 rounded-full animate-pulse">
                      <span className="text-3xl">⚡</span>
                      <p className="text-yellow-700 font-bold text-lg">
                        Może ty?
                      </p>
                    </div>
                  </div>
                )}

                {/* Status po zakończeniu */}
                {isStarter && (
                  <div className="mt-4">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 rounded-full">
                      <span className="text-3xl">🎮</span>
                      <p className="text-green-700 font-bold text-lg">
                        Rozpoczynasz grę!
                      </p>
                    </div>
                  </div>
                )}

                {/* Efekt świetlny podczas podświetlenia */}
                {isHighlighted && animating && (
                  <div className="absolute inset-0 rounded-3xl animate-ping bg-yellow-400 opacity-20 pointer-events-none" />
                )}

                {/* Konfetti dla zwycięzcy */}
                {isStarter && (
                  <>
                    <div className="absolute top-4 left-1/4 w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="absolute top-4 right-1/4 w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="absolute top-8 left-1/3 w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <div className="absolute top-8 right-1/3 w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
                    <div className="absolute bottom-8 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
                    <div className="absolute bottom-8 right-1/4 w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '750ms' }} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}