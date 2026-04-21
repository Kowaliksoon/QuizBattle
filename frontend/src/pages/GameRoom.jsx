import { useEffect, useState, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import createSocket from "../socket";
import VaBanqueBoard from "../components/VaBanqueBoard";

export default function GameRoom() {
	const { state } = useLocation();
	const { roomId: urlRoomId } = useParams();
	const navigate = useNavigate();

	const players = state?.players || [];
	const roomId = state?.roomId || urlRoomId || "defaultRoom";
	const backendStarter = state?.starter;
	const userId = localStorage.getItem("userId");
	const username = localStorage.getItem("username");

	const [socket, setSocket] = useState(null);
	const [starter, setStarter] = useState(null);
	const [currentHighlight, setCurrentHighlight] = useState(0);
	const [animating, setAnimating] = useState(false);

	const [showReadyUp, setShowReadyUp] = useState(false);
	const [countdown, setCountdown] = useState(10);
	const [isReady, setIsReady] = useState(false);
	const [opponentReady, setOpponentReady] = useState(false);
	const [gameStarting, setGameStarting] = useState(false);

	const [gamePhase, setGamePhase] = useState("wheel");
	const [boardData, setBoardData] = useState(null);
	const [gamePlayers, setGamePlayers] = useState([]);
	const [currentTurn, setCurrentTurn] = useState(null);
	const [gameId, setGameId] = useState(null);


	const [activeQuestion, setActiveQuestion] = useState(null);
	const [buzzerOpen, setBuzzerOpen] = useState(false);
	const [buzzeredBy, setBuzzeredBy] = useState(null);
	const [answerTimeLeft, setAnswerTimeLeft] = useState(15);
	const [selectedAnswer, setSelectedAnswer] = useState(null);
	const [answerResult, setAnswerResult] = useState(null);
	const [answerTimerActive, setAnswerTimerActive] = useState(false);
	const [gameOver, setGameOver] = useState(null); 

	const intervalRef = useRef(null);
	const stepRef = useRef(0);
	const countdownRef = useRef(null);
	const audioContextRef = useRef(null);
	const socketRef = useRef(null);
	const answerTimerRef = useRef(null);
	const boardDataRef = useRef(null);
	const gamePhaseRef = useRef("wheel");


	useEffect(() => {
		gamePhaseRef.current = gamePhase;
	}, [gamePhase]);

	useEffect(() => {
		if (!userId || !username) return;

		const s = createSocket({ userId, username });
		setSocket(s);
		socketRef.current = s;

		s.on("playersReadyUpdate", ({ readyPlayers }) => {
			setIsReady(readyPlayers.includes(username));
			setOpponentReady(readyPlayers.some(name => name !== username));
		});

		s.on("gameStart", () => {
			isLeavingRef.current = true;
			setGameStarting(true);
			setGamePhase("starting");
		});

		s.on("boardReady", ({ gameId, board, currentTurn, players }) => {
			isLeavingRef.current = true;
			setGameId(gameId);
			setBoardData(board);
			boardDataRef.current = board;
			setCurrentTurn(currentTurn);
			setGamePlayers(players);
			setGamePhase("board");
		});

		s.on(
			"questionOpened",
			({
				categoryName,
				difficulty,
				question,
				answers,
				selectedBy,
				categoryId,
			}) => {
				if (boardDataRef.current) {
					const updated = boardDataRef.current.map(cat => {
						if (cat.categoryId !== categoryId) return cat;
						return {
							...cat,
							questions: {
								...cat.questions,
								[difficulty]: { ...cat.questions[difficulty], used: true },
								[String(difficulty)]: {
									...(cat.questions[String(difficulty)] ||
										cat.questions[difficulty]),
									used: true,
								},
							},
						};
					});
					boardDataRef.current = updated;
					setBoardData(updated);
				}
				setActiveQuestion({
					categoryName,
					difficulty,
					question,
					answers,
					selectedBy,
				});
				setBuzzerOpen(false);
				setBuzzeredBy(null);
				setSelectedAnswer(null);
				setAnswerResult(null);
				setAnswerTimeLeft(15);
				setAnswerTimerActive(false);
				setGamePhase("question");
			},
		);

		s.on("buzzerOpen", () => {
			setBuzzerOpen(true);
		});

		s.on("buzzerPressed", ({ byUsername }) => {
			setBuzzeredBy(byUsername);
			setBuzzerOpen(false);
			if (byUsername === username) {
				setAnswerTimerActive(true);
				setAnswerTimeLeft(15);
			}
		});

		s.on(
			"answerResult",
			({
				byUsername,
				answerIndex,
				correctIndex,
				isCorrect,
				points,
				timeout,
				noBuzzer,
				updatedPlayers,
				nextTurn,
			}) => {
				setAnswerResult({
					byUsername,
					answerIndex,
					correctIndex,
					isCorrect,
					points,
					timeout,
					noBuzzer,
				});
				setSelectedAnswer(answerIndex);
				setAnswerTimerActive(false);
				setGamePlayers(updatedPlayers);
				setCurrentTurn(nextTurn);

				setTimeout(() => {
					setGamePhase("board");
					setActiveQuestion(null);
					setBuzzeredBy(null);
					setSelectedAnswer(null);
					setAnswerResult(null);
					setBuzzerOpen(false);
					setAnswerTimeLeft(15);
				}, 3000);
			},
		);

		s.on("gameOver", ({ players, winner, rpChange, newRP, newRank }) => {
			isLeavingRef.current = true;


    
			const phase = gamePhaseRef.current;
			if (phase === "wheel" || phase === "readyUp" || phase === "starting") {
				localStorage.removeItem(`starter_${roomId}`);
				localStorage.removeItem(`starterAnimated_${roomId}`);
				navigate("/lobby", { replace: true });
				return;
			}

			setGameOver({ players, winner, rpChange, newRP, newRank });
			setGamePhase("gameOver");
		});

		return () => s.disconnect();
	}, [userId, username, roomId]);

	const isLeavingRef = useRef(false);

	useEffect(() => {
		const legitimate = sessionStorage.getItem("gameEnteredLegitimately");
		if (!legitimate) {
			navigate("/lobby", { replace: true });
			return;
		}
		sessionStorage.removeItem("gameEnteredLegitimately");
	}, []);

	useEffect(() => {
		if (!answerTimerActive) {
			if (answerTimerRef.current) clearInterval(answerTimerRef.current);
			return;
		}
		answerTimerRef.current = setInterval(() => {
			setAnswerTimeLeft(prev => {
				if (prev <= 1) {
					clearInterval(answerTimerRef.current);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(answerTimerRef.current);
	}, [answerTimerActive]);

	useEffect(() => {
		return () => {
			if (!isLeavingRef.current) {
				socketRef.current?.emit("leaveGameRoom", { roomId });
			}
		};
	}, [roomId]);

	const playTickSound = () => {
		if (!audioContextRef.current)
			audioContextRef.current = new (
				window.AudioContext || window.webkitAudioContext
			)();
		const ctx = audioContextRef.current;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.frequency.value = 800;
		osc.type = "sine";
		gain.gain.setValueAtTime(0.1, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
		osc.start(ctx.currentTime);
		osc.stop(ctx.currentTime + 0.05);
	};

	const playWinSound = () => {
		if (!audioContextRef.current)
			audioContextRef.current = new (
				window.AudioContext || window.webkitAudioContext
			)();
		const ctx = audioContextRef.current;
		[523.25, 659.25, 783.99].forEach((freq, i) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.frequency.value = freq;
			osc.type = "sine";
			const t = ctx.currentTime + i * 0.1;
			gain.gain.setValueAtTime(0.15, t);
			gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
			osc.start(t);
			osc.stop(t + 0.5);
		});
	};

	useEffect(() => {
		if (players.length < 2) return;
		const savedStarter = localStorage.getItem(`starter_${roomId}`);
		const animatedBefore = localStorage.getItem(`starterAnimated_${roomId}`);
		if (savedStarter && animatedBefore) {
			setStarter(savedStarter);
			setCurrentHighlight(
				players.indexOf(savedStarter) >= 0 ? players.indexOf(savedStarter) : 0,
			);
			setShowReadyUp(true);
			setGamePhase("readyUp");
			return;
		}
		const startAnimation = () => {
			setAnimating(true);
			setGamePhase("wheel");
			stepRef.current = 0;
			const totalSteps = 40;
			const animate = () => {
				stepRef.current++;
				const step = stepRef.current;
				setCurrentHighlight(prev => {
					try {
						playTickSound();
					} catch (e) {}
					return (prev + 1) % players.length;
				});
				if (step >= totalSteps) {
					clearInterval(intervalRef.current);
					setTimeout(() => {
						const finalIndex = players.indexOf(backendStarter);
						setCurrentHighlight(finalIndex >= 0 ? finalIndex : 0);
						setStarter(backendStarter);
						setAnimating(false);
						try {
							playWinSound();
						} catch (e) {}
						localStorage.setItem(`starter_${roomId}`, backendStarter);
						localStorage.setItem(`starterAnimated_${roomId}`, "true");
						setTimeout(() => {
							setShowReadyUp(true);
							setGamePhase("readyUp");
						}, 1500);
					}, 400);
					return;
				}
				const progress = step / totalSteps;
				let delay =
					progress < 0.3
						? 200 - (progress / 0.3) * 120
						: progress < 0.6
							? 80
							: 80 + ((progress - 0.6) / 0.4) * 420;
				intervalRef.current = setTimeout(animate, delay);
			};
			animate();
		};
		const timeout = setTimeout(startAnimation, 500);
		return () => {
			clearTimeout(timeout);
			if (intervalRef.current) clearTimeout(intervalRef.current);
		};
	}, [players, roomId, backendStarter]);

	useEffect(() => {
		if (!showReadyUp || gameStarting) return;
		countdownRef.current = setInterval(() => {
			setCountdown(prev => {
				if (prev <= 1) {
					clearInterval(countdownRef.current);
					socketRef.current?.emit("playerReady", { roomId });
					setIsReady(true);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => {
			if (countdownRef.current) clearInterval(countdownRef.current);
		};
	}, [showReadyUp, gameStarting, roomId]);

	useEffect(() => {
		if (isReady && opponentReady && socketRef.current && !gameStarting) {
			clearInterval(countdownRef.current);
			socketRef.current.emit("bothReady", { roomId });
		}
	}, [isReady, opponentReady, gameStarting, roomId]);

	const handleReady = () => {
		if (!isReady && socketRef.current) {
			setIsReady(true);
			socketRef.current.emit("playerReady", { roomId });
		}
	};

	const handleQuestionSelect = (categoryId, difficulty, questionData) => {
		socketRef.current?.emit("questionSelected", {
			gameId,
			roomId,
			categoryId,
			difficulty,
			questionId: questionData.questionId,
		});
	};

	const handleBuzzerPress = () => {
		if (!buzzerOpen || buzzeredBy) return;
		socketRef.current?.emit("buzzerPress", { roomId });
	};

	const handleAnswerSelect = answerIndex => {
		if (buzzeredBy !== username || selectedAnswer !== null) return;
		setSelectedAnswer(answerIndex);
		socketRef.current?.emit("submitAnswer", { roomId, answerIndex });
	};




	if (gamePhase === "gameOver" && gameOver) {
		const isWinner = gameOver.winner === username;
		const sorted = [...gameOver.players].sort((a, b) => b.score - a.score);

		return (
			<div className='min-h-screen bg-blue-950 flex items-center justify-center p-4'>
				<div className='w-full max-w-md space-y-5'>
					<div className='text-center'>
						<h1 className='text-4xl font-black tracking-widest uppercase text-yellow-400 drop-shadow-lg'>
							VA<span className='text-white'>BANQUE</span>
						</h1>
						<p className='text-blue-300 text-xs uppercase tracking-widest mt-1'>
							Koniec gry
						</p>
					</div>

					{/* Wynik końcowy */}
					<div
						className={`text-center py-5 px-6 rounded-2xl border-4 font-black text-2xl uppercase tracking-widest ${
							isWinner
								? "bg-yellow-400/10 border-yellow-400 text-yellow-400"
								: "bg-blue-900 border-blue-700 text-blue-300"
						}`}>
						{isWinner ? "🏆 Wygrałeś!" : `🥈 Wygrał ${gameOver.winner}`}
					</div>

					{/* Tabela wyników */}
					<div className='bg-blue-900 rounded-2xl border-2 border-orange-500 overflow-hidden'>
						<div className='bg-blue-950 px-5 py-3 border-b-2 border-orange-500/50'>
							<p className='text-blue-300 text-xs uppercase tracking-widest font-semibold'>
								Wyniki końcowe
							</p>
						</div>
						<div className='divide-y divide-blue-800'>
							{sorted.map((player, idx) => (
								<div
									key={player.userId}
									className='flex items-center justify-between px-5 py-4'>
									<div className='flex items-center gap-3'>
										<span
											className={`text-xl font-black ${idx === 0 ? "text-yellow-400" : "text-blue-500"}`}>
											{idx === 0 ? "🥇" : "🥈"}
										</span>
										<p
											className={`font-black uppercase tracking-wide ${player.username === username ? "text-yellow-400" : "text-white"}`}>
											{player.username}
											{player.username === username && (
												<span className='text-orange-400 ml-2 text-xs font-normal'>
													(Ty)
												</span>
											)}
										</p>
									</div>
									<p
										className={`text-3xl font-black ${idx === 0 ? "text-yellow-400" : "text-blue-300"}`}>
										{player.score}
									</p>
								</div>
							))}
						</div>
					</div>

					{/* Przycisk powrotu */}
					<button
						onClick={() => {
							isLeavingRef.current = true;
							localStorage.removeItem(`starter_${roomId}`);
							localStorage.removeItem(`starterAnimated_${roomId}`);
							navigate("/lobby");
						}}
						className='w-full py-3 rounded-xl bg-indigo-700 border-2 border-indigo-500 text-yellow-400 font-black uppercase tracking-widest hover:bg-indigo-600 hover:border-orange-400 hover:text-orange-300 transition-all cursor-pointer shadow-lg'>
						🎮 Wróć do lobby
					</button>
				</div>
			</div>
		);
	}

	if (gamePhase === "starting") {
		return (
			<div
				className='fixed inset-0 z-50 flex items-center justify-center bg-blue-950'
				style={{ animation: "fadeOut 0.5s ease-in-out 2.5s forwards" }}>
				<div className='text-center space-y-4'>
					<div className='text-6xl animate-bounce'>🎮</div>
					<h2 className='text-5xl font-black text-yellow-400 animate-pulse tracking-widest uppercase'>
						GRA SIĘ ZACZYNA!
					</h2>
					<div className='flex justify-center gap-3 mt-4'>
						{[0, 0.2, 0.4].map((d, i) => (
							<div
								key={i}
								className='w-3 h-3 bg-yellow-400 rounded-full animate-bounce'
								style={{ animationDelay: `${d}s` }}
							/>
						))}
					</div>
				</div>
				<style>{`@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }`}</style>
			</div>
		);
	}


	if (gamePhase === "question" && activeQuestion) {
		const isBuzzered = buzzeredBy === username;
		const isAnswering = isBuzzered && selectedAnswer === null && !answerResult;
		const canBuzz = buzzerOpen && !buzzeredBy;

		return (
			<div className='min-h-screen bg-blue-950 flex flex-col items-center justify-center p-4'>
				<div className='w-full max-w-2xl space-y-4'>
					<div className='text-center'>
						<h1 className='text-3xl font-black tracking-widest uppercase text-yellow-400'>
							VA<span className='text-white'>BANQUE</span>
						</h1>
					</div>

					{/* Wyniki */}
					<div className='grid grid-cols-2 gap-3'>
						{gamePlayers.map(player => (
							<div
								key={player.userId}
								className='bg-blue-900 rounded-xl px-4 py-2 border-2 border-blue-700 flex items-center justify-between'>
								<p className='text-white font-black text-sm uppercase'>
									{player.username}
								</p>
								<p className='text-yellow-400 font-black text-xl'>
									{player.score}
								</p>
							</div>
						))}
					</div>

					{/* Karta pytania */}
					<div className='bg-blue-900 rounded-2xl border-4 border-orange-500 overflow-hidden shadow-2xl shadow-orange-900/30'>
						<div className='bg-blue-950 px-5 py-3 border-b-2 border-orange-500/50 flex items-center justify-between'>
							<span className='text-blue-300 text-xs uppercase tracking-widest font-semibold'>
								{activeQuestion.categoryName}
							</span>
							<span className='text-yellow-400 font-black text-lg'>
								{activeQuestion.difficulty} PKT
							</span>
						</div>

						<div className='px-6 py-6 text-center'>
							<p className='text-white text-xl font-black leading-snug'>
								{activeQuestion.question}
							</p>
						</div>

						<div className='grid grid-cols-2 gap-3 px-5 pb-5'>
							{activeQuestion.answers.map((answer, idx) => {
								let style =
									"bg-blue-950 border-2 border-blue-800 text-blue-500 cursor-not-allowed";
								if (answerResult) {
									if (idx === answerResult.correctIndex)
										style =
											"bg-green-500/20 border-2 border-green-500 text-green-300";
									else if (
										idx === answerResult.answerIndex &&
										!answerResult.isCorrect
									)
										style =
											"bg-red-500/20 border-2 border-red-500 text-red-300";
									else
										style =
											"bg-blue-950 border-2 border-blue-900 text-blue-700";
								} else if (isAnswering) {
									style =
										"bg-indigo-700 border-2 border-indigo-500 text-yellow-400 hover:bg-indigo-600 hover:border-orange-400 hover:text-orange-300 cursor-pointer";
								}
								return (
									<button
										key={idx}
										onClick={() => handleAnswerSelect(idx)}
										disabled={!isAnswering}
										className={`rounded-xl px-4 py-3 text-sm font-black uppercase tracking-wide text-left transition-all duration-100 ${style}`}>
										<span className='text-xs opacity-50 mr-2'>
											{String.fromCharCode(65 + idx)}.
										</span>
										{answer}
									</button>
								);
							})}
						</div>
					</div>

					{/* Buzzer / status */}
					{!answerResult && (
						<div className='space-y-3'>
							{buzzeredBy && (
								<div
									className={`text-center py-2.5 px-5 rounded-xl border-2 font-black text-sm uppercase tracking-widest ${
										isBuzzered
											? "bg-orange-500/20 border-orange-500 text-orange-300"
											: "bg-blue-900 border-blue-700 text-blue-300"
									}`}>
									🔔 {buzzeredBy} odpowiada!
									{isBuzzered && (
										<span
											className={`ml-3 ${answerTimeLeft <= 5 ? "text-red-400 animate-pulse" : "text-yellow-400"}`}>
											{answerTimeLeft}s
										</span>
									)}
								</div>
							)}
							{!buzzeredBy && (
								<button
									onClick={handleBuzzerPress}
									disabled={!canBuzz}
									className={`w-full py-5 rounded-xl font-black text-2xl uppercase tracking-widest border-2 transition-all duration-100
                    ${
											canBuzz
												? "bg-orange-500 border-orange-400 text-white hover:bg-orange-400 active:scale-95 cursor-pointer shadow-lg shadow-orange-500/40 animate-pulse"
												: "bg-blue-900 border-blue-800 text-blue-700 cursor-not-allowed"
										}`}>
									{canBuzz ? "🔔 BUZZER!" : "⏳ Czekaj..."}
								</button>
							)}
						</div>
					)}

					{/* Wynik */}
					{answerResult && (
						<div
							className={`text-center py-4 px-6 rounded-2xl border-2 font-black text-base uppercase tracking-widest ${
								answerResult.isCorrect
									? "bg-green-500/20 border-green-500 text-green-400"
									: "bg-red-500/20 border-red-500 text-red-400"
							}`}>
							{answerResult.noBuzzer
								? `😶 Nikt nie wcisnął buzzera! Tura bez zmian.`
								: answerResult.timeout
									? `⏰ ${answerResult.byUsername} nie zdążył! -${answerResult.points} pkt`
									: answerResult.isCorrect
										? `✅ ${answerResult.byUsername} odpowiedział poprawnie! +${answerResult.points} pkt`
										: `❌ ${answerResult.byUsername} pomylił się! -${answerResult.points} pkt`}
						</div>
					)}
				</div>
			</div>
		);
	}

	if (gamePhase === "board" && boardData) {
		return (
			<VaBanqueBoard
				board={boardData}
				currentTurn={currentTurn}
				myUsername={username}
				players={gamePlayers}
				onQuestionSelect={handleQuestionSelect}
				gameId={gameId}
				onGameOver={() => {
					const sorted = [...gamePlayers].sort((a, b) => b.score - a.score);
					const winner = sorted[0]?.username;
					setGameOver({ players: sorted, winner });
					setGamePhase("gameOver");
				}}
			/>
		);
	}


	return (
		<div className='min-h-screen bg-blue-950 flex items-center justify-center p-4'>
			<div className='max-w-2xl w-full space-y-5'>
				<div className='text-center'>
					<h1 className='text-4xl font-black tracking-widest uppercase text-yellow-400 drop-shadow-lg mb-1'>
						VA<span className='text-white'>BANQUE</span>
					</h1>
					<p className='text-blue-300 text-sm uppercase tracking-widest font-semibold'>
						{animating
							? "🎲 Losowanie..."
							: showReadyUp
								? "⏰ Przygotuj się!"
								: starter
									? "🎮 Wynik losowania"
									: "Przygotowanie..."}
					</p>
					{starter && !animating && !showReadyUp && (
						<p className='text-lg text-yellow-400 font-black animate-pulse mt-1 uppercase tracking-wider'>
							{starter} rozpoczyna!
						</p>
					)}
				</div>

				<div className='grid grid-cols-2 gap-4'>
					{players.map((player, idx) => {
						const isHighlighted = currentHighlight === idx;
						const isStarter = !animating && starter === player;
						const isCurrentPlayer = player === username;
						return (
							<div
								key={player}
								className={`relative bg-blue-900 p-6 rounded-2xl text-center transition-all duration-200 transform border-2
                ${
									isHighlighted && animating
										? "border-yellow-400 scale-105 shadow-2xl shadow-yellow-500/30 bg-blue-800"
										: isStarter
											? "border-orange-500 shadow-xl shadow-orange-500/20"
											: "border-blue-700"
								}`}>
								<div
									className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-2xl font-black transition-all duration-200
                  ${
										isHighlighted && animating
											? "bg-yellow-400 text-blue-950 shadow-lg scale-110"
											: isStarter
												? "bg-indigo-700 border-2 border-orange-500 text-yellow-400"
												: "bg-blue-950 border-2 border-blue-700 text-blue-300"
									}`}>
									{player.charAt(0).toUpperCase()}
								</div>
								<p
									className={`text-xl font-black mb-2 uppercase tracking-wide ${isHighlighted && animating ? "text-yellow-400" : isStarter ? "text-white" : "text-blue-200"}`}>
									{player}
									{isCurrentPlayer && (
										<span className='text-xs text-blue-400 ml-1 normal-case font-normal'>
											(Ty)
										</span>
									)}
								</p>
								{animating && isHighlighted && (
									<div className='inline-flex items-center gap-1.5 px-4 py-1.5 bg-yellow-400/20 border border-yellow-400 rounded-full animate-pulse'>
										<span>⚡</span>
										<p className='text-yellow-400 font-black text-sm uppercase'>
											Może ty?
										</p>
									</div>
								)}
								{isStarter && !showReadyUp && (
									<div className='inline-flex items-center gap-1.5 px-4 py-1.5 bg-orange-500/20 border border-orange-500 rounded-full'>
										<span>🎮</span>
										<p className='text-orange-300 font-black text-sm uppercase'>
											Rozpoczyna grę!
										</p>
									</div>
								)}
								{showReadyUp && (
									<div className='mt-2'>
										{(isCurrentPlayer && isReady) ||
										(!isCurrentPlayer && opponentReady) ? (
											<div className='inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-500/20 border border-green-500 rounded-full'>
												<svg
													className='w-4 h-4 text-green-400'
													fill='none'
													stroke='currentColor'
													viewBox='0 0 24 24'>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														strokeWidth={3}
														d='M5 13l4 4L19 7'
													/>
												</svg>
												<p className='text-green-400 font-black text-sm uppercase'>
													Gotowy!
												</p>
											</div>
										) : (
											<div className='inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-950 border border-blue-700 rounded-full'>
												<div className='w-4 h-4 border-2 border-blue-600 border-t-blue-300 rounded-full animate-spin'></div>
												<p className='text-blue-400 font-bold text-sm uppercase'>
													Czeka...
												</p>
											</div>
										)}
									</div>
								)}
								{isHighlighted && animating && (
									<div className='absolute inset-0 rounded-2xl animate-ping bg-yellow-400 opacity-10 pointer-events-none' />
								)}
								{isStarter && !showReadyUp && (
									<>
										<div
											className='absolute top-3 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-bounce'
											style={{ animationDelay: "0ms" }}
										/>
										<div
											className='absolute top-3 right-1/4 w-2 h-2 bg-orange-400 rounded-full animate-bounce'
											style={{ animationDelay: "150ms" }}
										/>
										<div
											className='absolute top-6 left-1/3 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce'
											style={{ animationDelay: "300ms" }}
										/>
										<div
											className='absolute top-6 right-1/3 w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce'
											style={{ animationDelay: "450ms" }}
										/>
										<div
											className='absolute bottom-6 left-1/4 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-bounce'
											style={{ animationDelay: "600ms" }}
										/>
										<div
											className='absolute bottom-6 right-1/4 w-1.5 h-1.5 bg-orange-300 rounded-full animate-bounce'
											style={{ animationDelay: "750ms" }}
										/>
									</>
								)}
							</div>
						);
					})}
				</div>

				{showReadyUp && (
					<div className='space-y-4'>
						<div className='text-center'>
							<div className='inline-flex items-center gap-4 px-6 py-3 bg-blue-900 rounded-2xl border-2 border-orange-500/50 shadow-xl'>
								<p className='text-blue-300 text-xs font-semibold uppercase tracking-widest'>
									Gra za
								</p>
								<div
									className={`text-3xl font-black leading-none ${countdown <= 3 ? "text-red-400 animate-pulse" : "text-yellow-400"}`}>
									{countdown}s
								</div>
							</div>
						</div>
						{!isReady ? (
							<button
								onClick={handleReady}
								className='w-full py-3 rounded-xl bg-indigo-700 border-2 border-indigo-500 text-yellow-400 text-base font-black hover:bg-indigo-600 hover:border-orange-400 hover:text-orange-300 transition-all uppercase tracking-widest shadow-lg cursor-pointer'>
								✓ JESTEM GOTOWY!
							</button>
						) : (
							<div className='w-full py-3 rounded-xl bg-blue-900 border-2 border-blue-700 text-base font-bold text-center uppercase tracking-widest'>
								<div className='flex items-center justify-center gap-2'>
									<svg
										className='w-4 h-4 text-green-400'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={3}
											d='M5 13l4 4L19 7'
										/>
									</svg>
									<span className='text-green-400'>
										Czekamy na przeciwnika...
									</span>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
