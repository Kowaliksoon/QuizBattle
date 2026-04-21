import mongoose from "mongoose";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import User from "./models/User.js";
import Category from "./models/Category.js";
import Question from "./models/Question.js";
import Game from "./models/Game.js";
import Rank, { getRank, getRankLevel, calculateRP } from "./models/Rank.js";
import adminRoutes from "./routes/admin.js";
import gameRoutes from "./routes/Game.js";
import Suggestion from "./models/Suggestion.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const onlineUsers = new Map();
const queue = [];
const matches = {};
const gameRooms = {};


async function generateGameBoard() {
	try {
		const allCategories = await Category.find();

		const validCategories = [];
		for (const category of allCategories) {
			let isValid = true;
			for (const difficulty of [100, 200, 300, 400, 500]) {
				const count = await Question.countDocuments({
					category: category._id,
					difficulty,
				});
				if (count === 0) {
					isValid = false;
					break;
				}
			}
			if (isValid) validCategories.push(category);
		}

		console.log(
			`📚 Kategorii z kompletem pytań: ${validCategories.length}/${allCategories.length}`,
		);

		if (validCategories.length < 5) {
			throw new Error(
				`Za mało kompletnych kategorii! Masz ${validCategories.length}, potrzebujesz minimum 5.`,
			);
		}

		const selectedCategories = validCategories
			.sort(() => 0.5 - Math.random())
			.slice(0, 5);
		const boardData = [];

		for (const category of selectedCategories) {
			const categoryQuestions = {};
			for (const difficulty of [100, 200, 300, 400, 500]) {
				const questions = await Question.find({
					category: category._id,
					difficulty,
				});
				const q = questions[Math.floor(Math.random() * questions.length)];
				categoryQuestions[difficulty] = {
					questionId: q._id.toString(),
					question: q.question,
					answers: q.answers,
					correctIndex: q.correctIndex,
					used: false,
				};
			}
			boardData.push({
				categoryId: category._id.toString(),
				categoryName: category.name,
				questions: categoryQuestions,
			});
		}

		return boardData;
	} catch (error) {
		console.error("❌ Błąd generowania planszy:", error);
		throw error;
	}
}


async function finishGame(roomId, updatedPlayers) {
	const room = gameRooms[roomId];
	if (!room) return;

	const winner = updatedPlayers.reduce((a, b) => (a.score > b.score ? a : b));
	const loser = updatedPlayers.find(p => p.userId !== winner.userId);


	const winnerRankDoc = await Rank.findOne({ userId: winner.userId });
	const loserRankDoc = await Rank.findOne({ userId: loser.userId });

	const winnerRP = winnerRankDoc?.rp || 0;
	const loserRP = loserRankDoc?.rp || 0;

	const winnerLevel = getRankLevel(winnerRP);
	const loserLevel = getRankLevel(loserRP);


	const winnerRPChange = calculateRP(true, winnerLevel, loserLevel);
	const loserRPChange = calculateRP(false, loserLevel, winnerLevel);

	const newWinnerRP = Math.max(0, winnerRP + winnerRPChange);
	const newLoserRP = Math.max(0, loserRP + loserRPChange);

	const newWinnerRank = getRank(newWinnerRP);
	const newLoserRank = getRank(newLoserRP);


	await Rank.findOneAndUpdate(
		{ userId: winner.userId },
		{ rp: newWinnerRP, rank: newWinnerRank, username: winner.username },
		{ upsert: true, new: true },
	);

	await Rank.findOneAndUpdate(
		{ userId: loser.userId },
		{ rp: newLoserRP, rank: newLoserRank, username: loser.username },
		{ upsert: true, new: true },
	);

	console.log(
		`🏆 ${winner.username} +${winnerRPChange} RP (${newWinnerRP} RP) | ${loser.username} ${loserRPChange} RP (${newLoserRP} RP)`,
	);


	await Game.findByIdAndUpdate(room.gameId, {
		players: updatedPlayers.map(p => ({
			userId: p.userId,
			username: p.username,
			score: p.score,
			correctAnswers: room.correctAnswers[p.userId] || 0,
			wrongAnswers: room.wrongAnswers[p.userId] || 0,
		})),
		winner: winner.username,
		status: "finished",
		finishedAt: new Date(),
	});

	console.log(
		`💾 Zapisano wynik gry ${room.gameId} — zwycięzca: ${winner.username}`,
	);

	room.players.forEach(playerId => {
		const user = onlineUsers.get(playerId);
		if (user) {
			const isWinner = playerId === winner.userId;
			const rpChange = isWinner ? winnerRPChange : loserRPChange;
			const newRP = isWinner ? newWinnerRP : newLoserRP;
			const newRank = isWinner ? newWinnerRank : newLoserRank;

			io.to(user.socketId).emit("gameOver", {
				players: updatedPlayers,
				winner: winner.username,
				rpChange,
				newRP,
				newRank,
			});
		}
	});
}

setInterval(() => {
	for (const roomId of Object.keys(gameRooms)) {
		const room = gameRooms[roomId];

		const activePlayers = Array.from(room.players).filter(id => {
			const user = onlineUsers.get(id);
			if (!user) return false;

			const sock = io.sockets.sockets.get(user.socketId);
			return !!sock;
		});

		console.log(
			`[ROOM CHECK] roomId: ${roomId} | players: ${room.players.size} | active: ${activePlayers.length} | gameStarted: ${room.gameStarted}`,
		);

		if (activePlayers.length < room.players.size) {
			console.log(`[ROOM CHECK] Gracz wyszedł z pokoju ${roomId} — kończę grę`);

			const winnerId = activePlayers[0];
			const winnerUser = winnerId ? onlineUsers.get(winnerId) : null;

			if (winnerUser) {
				io.to(winnerUser.socketId).emit("gameOver", {
					players: Array.from(room.players).map(id => ({
						userId: id,
						username: onlineUsers.get(id)?.username || "Gracz",
						score: room.scores?.[id] || 0,
					})),
					winner: winnerUser.username,
					rpChange: 0,
					newRP: null,
					newRank: null,
				});
			}

			delete gameRooms[roomId];
		}
	}
}, 1000);

io.on("connection", socket => {
	const { userId, username } = socket.handshake.auth;
	if (!userId || !username) return;

	onlineUsers.set(userId, { socketId: socket.id, username });
	io.emit("onlineCount", onlineUsers.size);
	console.log(
		`🔹 Gracz połączył się: ${username} (${userId}) | Online: ${onlineUsers.size}`,
	);


	Object.keys(gameRooms).forEach(roomId => {
		const room = gameRooms[roomId];
		if (!room.players.has(userId)) return;
		if (room.disconnectTimers?.has(userId)) {
			clearTimeout(room.disconnectTimers.get(userId));
			room.disconnectTimers.delete(userId);
			console.log(`🔄 ${username} wrócił do pokoju ${roomId}`);
		}
		const readyUsernames = Array.from(room.readyPlayers)
			.map(id => onlineUsers.get(id)?.username)
			.filter(Boolean);
		io.to(socket.id).emit("playersReadyUpdate", {
			readyPlayers: readyUsernames,
		});
	});


	socket.on("joinQueue", () => {
		if (!queue.includes(userId)) queue.push(userId);
		socket.emit("queueJoined");
		tryMatch();
	});

	socket.on("leaveQueue", () => {
		removeFromQueue(userId);
		socket.emit("queueLeft");
	});
	socket.on("leaveGameRoom", ({ roomId }) => {
		const room = gameRooms[roomId];
		if (!room || room.gameStarted) return;

		console.log(`🚪 ${username} opuścił pokój ${roomId} przed startem`);


		const remainingPlayerId = Array.from(room.players).find(
			id => id !== userId,
		);
		const remainingUser = remainingPlayerId
			? onlineUsers.get(remainingPlayerId)
			: null;


		if (remainingUser) {
			io.to(remainingUser.socketId).emit("gameOver", {
				players: Array.from(room.players).map(id => ({
					userId: id,
					username: onlineUsers.get(id)?.username || "Gracz",
					score: 0,
				})),
				winner: remainingUser.username,
				rpChange: 0,
				newRP: null,
				newRank: null,
			});
		}

		delete gameRooms[roomId];
	});


	socket.on("acceptMatch", ({ roomId }) => {
		const match = matches[roomId];
		if (!match || !match.players.has(userId)) return;

		match.accepted.add(userId);
		if (match.timers.has(userId)) {
			clearTimeout(match.timers.get(userId));
			match.timers.delete(userId);
		}

		if (match.accepted.size === 2) {
			const playersArray = Array.from(match.players);
			const starterUserId =
				playersArray[Math.floor(Math.random() * playersArray.length)];
			const starterUsername = onlineUsers.get(starterUserId)?.username;

			gameRooms[roomId] = {
				players: new Set(playersArray),
				readyPlayers: new Set(),
				gameStarted: false,
				disconnectTimers: new Map(),
				starter: starterUserId,
				scores: {},
				correctAnswers: {},
				wrongAnswers: {},
				buzzerOpen: false,
				buzzeredBy: null,
				answerTimer: null,
				buzzerTimeout: null,
				activeQuestion: null,
			};

			playersArray.forEach(id => {
				gameRooms[roomId].scores[id] = 0;
				gameRooms[roomId].correctAnswers[id] = 0;
				gameRooms[roomId].wrongAnswers[id] = 0;
			});

			match.players.forEach(id => {
				const user = onlineUsers.get(id);
				if (user)
					io.to(user.socketId).emit("matchAccepted", {
						roomId,
						players: playersArray.map(id => onlineUsers.get(id)?.username),
						starter: starterUsername,
					});
			});

			match.timers.forEach(t => clearTimeout(t));
			delete matches[roomId];
		}
	});

	socket.on("rejectMatch", ({ roomId }) => {
		const match = matches[roomId];
		if (!match || !match.players.has(userId)) return;

		match.timers.forEach(t => clearTimeout(t));
		match.players.forEach(id => {
			const user = onlineUsers.get(id);
			if (!user) return;
			io.to(user.socketId).emit("matchRejected", { rejectedUserId: userId });
			if (id === userId) removeFromQueue(id);
			else if (!queue.includes(id)) queue.push(id);
		});

		delete matches[roomId];
		tryMatch();
	});

	socket.on("playerReady", async ({ roomId }) => {
		console.log(
			`playerReady: ${username}, room: ${roomId}, exists: ${!!gameRooms[roomId]}`,
		);
		if (!gameRooms[roomId]) return;
		const room = gameRooms[roomId];
		room.readyPlayers.add(userId);
		console.log(
			`readyPlayers: ${room.readyPlayers.size}, players: ${room.players.size}, gameStarted: ${room.gameStarted}`,
		);

		const readyUsernames = Array.from(room.readyPlayers)
			.map(id => onlineUsers.get(id)?.username)
			.filter(Boolean);

		room.players.forEach(playerId => {
			const user = onlineUsers.get(playerId);
			if (user)
				io.to(user.socketId).emit("playersReadyUpdate", {
					readyPlayers: readyUsernames,
				});
		});

		if (room.readyPlayers.size === room.players.size && !room.gameStarted) {
			room.gameStarted = true;
			try {
				const boardData = await generateGameBoard();
				const playersArray = Array.from(room.players);

				const game = new Game({
					players: playersArray.map(id => ({
						userId: id,
						username: onlineUsers.get(id)?.username,
						score: 0,
						correctAnswers: 0,
						wrongAnswers: 0,
					})),
					status: "playing",
				});

				await game.save();
				console.log(`💾 Utworzono grę w bazie: ${game._id}`);

				room.gameId = game._id.toString();
				room.boardData = boardData;
				room.currentTurn = room.starter;

				room.players.forEach(playerId => {
					const user = onlineUsers.get(playerId);
					if (user) {
						io.to(user.socketId).emit("gameStart");
						setTimeout(() => {
							io.to(user.socketId).emit("boardReady", {
								gameId: game._id.toString(),
								board: boardData,
								currentTurn: onlineUsers.get(room.starter)?.username,
								players: playersArray.map(id => ({
									userId: id,
									username: onlineUsers.get(id)?.username,
									score: 0,
								})),
							});
						}, 2500);
					}
				});
			} catch (error) {
				console.error("❌ Błąd rozpoczynania gry:", error);
				room.players.forEach(playerId => {
					const user = onlineUsers.get(playerId);
					if (user)
						io.to(user.socketId).emit("gameError", {
							message: "Błąd generowania planszy.",
						});
				});
			}
		}
	});

	socket.on("questionSelected", ({ roomId, categoryId, difficulty }) => {
		const room = gameRooms[roomId];
		if (!room || room.currentTurn !== userId) return;

		const category = room.boardData.find(c => c.categoryId === categoryId);
		if (!category) return;
		const questionData = category.questions[difficulty];
		if (!questionData || questionData.used) return;

		questionData.used = true;
		room.activeQuestion = {
			categoryId,
			categoryName: category.categoryName,
			difficulty,
			question: questionData.question,
			answers: questionData.answers,
			correctIndex: questionData.correctIndex,
			selectedBy: userId,
		};
		room.buzzerOpen = false;
		room.buzzeredBy = null;

		room.players.forEach(playerId => {
			const user = onlineUsers.get(playerId);
			if (user)
				io.to(user.socketId).emit("questionOpened", {
					categoryId,
					categoryName: category.categoryName,
					difficulty,
					question: questionData.question,
					answers: questionData.answers,
					selectedBy: username,
				});
		});

		setTimeout(() => {
			room.buzzerOpen = true;
			room.players.forEach(playerId => {
				const user = onlineUsers.get(playerId);
				if (user) io.to(user.socketId).emit("buzzerOpen");
			});

			room.buzzerTimeout = setTimeout(() => {
				if (!room.buzzerOpen) return;
				room.buzzerOpen = false;

				const playersArray = Array.from(room.players);
				const updatedPlayers = playersArray.map(id => ({
					userId: id,
					username: onlineUsers.get(id)?.username,
					score: room.scores[id] || 0,
				}));

				room.players.forEach(playerId => {
					const user = onlineUsers.get(playerId);
					if (user)
						io.to(user.socketId).emit("answerResult", {
							byUsername: null,
							answerIndex: -1,
							correctIndex: room.activeQuestion.correctIndex,
							isCorrect: false,
							noBuzzer: true,
							points: 0,
							updatedPlayers,
							nextTurn: onlineUsers.get(room.activeQuestion.selectedBy)
								?.username,
						});
				});

				room.currentTurn = room.activeQuestion.selectedBy;
				room.activeQuestion = null;
				room.buzzeredBy = null;
			}, 10000);
		}, 1500);
	});


	socket.on("buzzerPress", ({ roomId }) => {
		const room = gameRooms[roomId];
		if (!room || !room.buzzerOpen || room.buzzeredBy) return;

		room.buzzerOpen = false;
		room.buzzeredBy = userId;

		if (room.buzzerTimeout) {
			clearTimeout(room.buzzerTimeout);
			room.buzzerTimeout = null;
		}

		room.players.forEach(playerId => {
			const user = onlineUsers.get(playerId);
			if (user)
				io.to(user.socketId).emit("buzzerPressed", {
					byUsername: username,
					byUserId: userId,
				});
		});

		room.answerTimer = setTimeout(() => {
			if (room.buzzeredBy !== userId) return;
			handleAnswerTimeout(roomId, userId);
		}, 15000);
	});


	socket.on("submitAnswer", async ({ roomId, answerIndex }) => {
		const room = gameRooms[roomId];
		if (!room || room.buzzeredBy !== userId || !room.activeQuestion) return;

		if (room.answerTimer) {
			clearTimeout(room.answerTimer);
			room.answerTimer = null;
		}

		const isCorrect = answerIndex === room.activeQuestion.correctIndex;
		const points = room.activeQuestion.difficulty;
		const playersArray = Array.from(room.players);

		if (isCorrect) {
			room.scores[userId] = (room.scores[userId] || 0) + points;
			room.correctAnswers[userId] = (room.correctAnswers[userId] || 0) + 1;
			room.currentTurn = userId;
		} else {
			room.scores[userId] = (room.scores[userId] || 0) - points;
			room.wrongAnswers[userId] = (room.wrongAnswers[userId] || 0) + 1;
			room.currentTurn = playersArray.find(id => id !== userId);
		}

		const updatedPlayers = playersArray.map(id => ({
			userId: id,
			username: onlineUsers.get(id)?.username,
			score: room.scores[id] || 0,
		}));

		room.players.forEach(playerId => {
			const user = onlineUsers.get(playerId);
			if (user)
				io.to(user.socketId).emit("answerResult", {
					byUsername: username,
					answerIndex,
					correctIndex: room.activeQuestion.correctIndex,
					isCorrect,
					points,
					updatedPlayers,
					nextTurn: onlineUsers.get(room.currentTurn)?.username,
				});
		});

		room.activeQuestion = null;
		room.buzzeredBy = null;

		const allUsed = room.boardData.every(cat =>
			Object.values(cat.questions).every(q => q.used),
		);
		if (allUsed) {
			console.log(`🏆 Gra w pokoju ${roomId} zakończona!`);
			await finishGame(roomId, updatedPlayers);
		}
	});


	socket.on("disconnect", async () => {
		onlineUsers.delete(userId);
		removeFromQueue(userId);

		for (const roomId of Object.keys(gameRooms)) {
			const room = gameRooms[roomId];
			if (!room.players.has(userId)) continue;

			if (!room.gameStarted) {
	
				if (!room.disconnectTimers) room.disconnectTimers = new Map();

				const timer = setTimeout(async () => {
		
					if (onlineUsers.has(userId)) {
						room.disconnectTimers.delete(userId);
						return;
					}

					const playersArray = Array.from(room.players);
					const winnerId = playersArray.find(id => id !== userId);
					const winnerUser = winnerId ? onlineUsers.get(winnerId) : null;

					if (winnerUser) {
						io.to(winnerUser.socketId).emit("gameOver", {
							players: playersArray.map(id => ({
								userId: id,
								username:
									id === userId
										? username
										: onlineUsers.get(id)?.username || "Gracz",
								score: room.scores?.[id] || 0,
							})),
							winner: winnerUser.username,
							rpChange: 0,
							newRP: null,
							newRank: null,
						});
					}

					delete gameRooms[roomId];
					room.disconnectTimers.delete(userId);
					io.emit("onlineCount", onlineUsers.size);
				}, 3000); 

				room.disconnectTimers.set(userId, timer);
				io.emit("onlineCount", onlineUsers.size);
				continue;
			}

	
			const playersArray = Array.from(room.players);
			const winnerId = playersArray.find(id => id !== userId);

			if (!winnerId) {
				delete gameRooms[roomId];
				continue;
			}

			const updatedPlayers = playersArray.map(id => ({
				userId: id,
				username: onlineUsers.get(id)?.username || "Gracz",
				score: room.scores[id] || 0,
			}));

			const leavingPlayer = updatedPlayers.find(p => p.userId === userId);
			const winnerPlayer = updatedPlayers.find(p => p.userId === winnerId);
			if (
				winnerPlayer &&
				leavingPlayer &&
				winnerPlayer.score <= leavingPlayer.score
			) {
				winnerPlayer.score = leavingPlayer.score + 1;
			}

			await finishGame(roomId, updatedPlayers);
			delete gameRooms[roomId];
		}

		io.emit("onlineCount", onlineUsers.size);
	});

	async function handleAnswerTimeout(roomId, timedOutUserId) {
		const room = gameRooms[roomId];
		if (!room || !room.activeQuestion) return;

		const points = room.activeQuestion.difficulty;
		const playersArray = Array.from(room.players);

		room.scores[timedOutUserId] = (room.scores[timedOutUserId] || 0) - points;
		room.wrongAnswers[timedOutUserId] =
			(room.wrongAnswers[timedOutUserId] || 0) + 1;
		room.currentTurn = room.activeQuestion.selectedBy;

		const timedOutUsername = onlineUsers.get(timedOutUserId)?.username;
		const updatedPlayers = playersArray.map(id => ({
			userId: id,
			username: onlineUsers.get(id)?.username,
			score: room.scores[id] || 0,
		}));

		room.players.forEach(playerId => {
			const user = onlineUsers.get(playerId);
			if (user)
				io.to(user.socketId).emit("answerResult", {
					byUsername: timedOutUsername,
					answerIndex: -1,
					correctIndex: room.activeQuestion.correctIndex,
					isCorrect: false,
					timeout: true,
					points,
					updatedPlayers,
					nextTurn: onlineUsers.get(room.currentTurn)?.username,
				});
		});

		room.activeQuestion = null;
		room.buzzeredBy = null;

		const allUsed = room.boardData.every(cat =>
			Object.values(cat.questions).every(q => q.used),
		);
		if (allUsed) {
			await finishGame(roomId, updatedPlayers);
		}
	}


	function tryMatch() {
		while (queue.length >= 2) {
			const player1 = queue.shift();
			const player2 = queue.shift();
			const p1 = onlineUsers.get(player1);
			const p2 = onlineUsers.get(player2);
			if (!p1 || !p2) continue;

			const roomId = Math.random().toString(36).substring(2, 8);
			matches[roomId] = {
				players: new Set([player1, player2]),
				accepted: new Set(),
				timers: new Map(),
			};

			[player1, player2].forEach(id => {
				const t = setTimeout(() => {
					const match = matches[roomId];
					if (!match) return;
					if (!match.accepted.has(id)) {
						const user = onlineUsers.get(id);
						if (user)
							io.to(user.socketId).emit("matchTimeout", { timeoutUserId: id });
						removeFromQueue(id);
						match.timers.delete(id);
						const otherId = Array.from(match.players).find(pid => pid !== id);
						if (match.accepted.has(otherId) && !queue.includes(otherId))
							queue.push(otherId);
					}
					if (match.timers.size === 0) delete matches[roomId];
					tryMatch();
				}, 10000);
				matches[roomId].timers.set(id, t);
			});

			io.to(p1.socketId).emit("matchRequest", {
				roomId,
				opponent: p2.username,
			});
			io.to(p2.socketId).emit("matchRequest", {
				roomId,
				opponent: p1.username,
			});
		}
	}

	function removeFromQueue(id) {
		const index = queue.indexOf(id);
		if (index !== -1) queue.splice(index, 1);
	}
});


app.get("/api/history/:userId", async (req, res) => {
	try {
		const { userId } = req.params;
		const games = await Game.find({
			"players.userId": userId,
			status: "finished",
		})
			.sort({ finishedAt: -1 })
			.limit(20)
			.lean();
		res.json({ games });
	} catch (err) {
		res.status(500).json({ message: "Błąd serwera" });
	}
});

app.get("/api/rank/:userId", async (req, res) => {
	try {
		const { userId } = req.params;
		const rankDoc = await Rank.findOne({ userId }).lean();
		if (!rankDoc) return res.json({ rp: 0, rank: "🌱 Rookie" });
		res.json({ rp: rankDoc.rp, rank: rankDoc.rank });
	} catch (err) {
		res.status(500).json({ message: "Błąd serwera" });
	}
});

app.get("/api/leaderboard", async (req, res) => {
	try {
		const top = await Rank.find().sort({ rp: -1 }).limit(20).lean();
		res.json({ leaderboard: top });
	} catch (err) {
		res.status(500).json({ message: "Błąd serwera" });
	}
});


mongoose
	.connect("mongodb://localhost:27017/quizbattle")
	.then(() => console.log("MongoDB connected"))
	.catch(err => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => res.send("QuizBattle backend działa 🚀"));
app.use("/admin", adminRoutes);
app.use("/game", gameRoutes);

app.post("/api/register", async (req, res) => {
	const { username, email, password } = req.body;
	if (!username || !email || !password)
		return res.status(400).json({ message: "Brak danych" });
	try {
		const existingUser = await User.findOne({ $or: [{ email }, { username }] });
		if (existingUser) {
			if (existingUser.email === email)
				return res.status(400).json({ message: "Email już istnieje" });
			if (existingUser.username === username)
				return res
					.status(400)
					.json({ message: "Nazwa użytkownika już istnieje" });
		}
		const user = new User({ username, email, password });
		await user.save();
		res
			.status(201)
			.json({
				message: "Konto utworzone",
				user: { id: user._id, username: user.username, email: user.email },
			});
	} catch (err) {
		res.status(500).json({ message: "Błąd serwera" });
	}
});

app.post("/api/login", async (req, res) => {
	const { email, password } = req.body;
	const user = await User.findOne({ email, password });
	if (!user) return res.status(401).json({ message: "Złe dane logowania" });
	res.json({
		message: "Zalogowano",
		user: { id: user._id, username: user.username, email: user.email },
	});
});

app.get("/api/suggestions/:userId", async (req, res) => {
	try {
		const suggestions = await Suggestion.find({ userId: req.params.userId })
			.sort({ createdAt: -1 })
			.limit(20)
			.lean();
		res.json({ suggestions });
	} catch (err) {
		res.status(500).json({ message: "Błąd serwera" });
	}
});

app.post("/api/suggestions", async (req, res) => {
	try {
		const {
			userId,
			username,
			type,
			categoryName,
			categoryId,
			categoryDisplayName,
			difficulty,
			question,
			answers,
			correctIndex,
		} = req.body;

		if (!userId || !username || !type)
			return res.status(400).json({ message: "Brak wymaganych danych" });

		if (type === "category" && !categoryName?.trim())
			return res.status(400).json({ message: "Podaj nazwę kategorii" });

		if (type === "question") {
			if (
				!categoryId ||
				!difficulty ||
				!question?.trim() ||
				!answers ||
				answers.some(a => !a?.trim()) ||
				correctIndex === undefined
			)
				return res
					.status(400)
					.json({ message: "Wypełnij wszystkie pola pytania" });
		}

		const suggestion = new Suggestion({
			userId,
			username,
			type,
			categoryName: type === "category" ? categoryName : undefined,
			categoryId: type === "question" ? categoryId : undefined,
			categoryDisplayName:
				type === "question" ? categoryDisplayName : undefined,
			difficulty: type === "question" ? difficulty : undefined,
			question: type === "question" ? question : undefined,
			answers: type === "question" ? answers : undefined,
			correctIndex: type === "question" ? correctIndex : undefined,
		});

		await suggestion.save();
		res.status(201).json({ message: "Zgłoszenie wysłane", suggestion });
	} catch (err) {
		res.status(500).json({ message: "Błąd serwera" });
	}
});

server.listen(3000, () => console.log("Serwer działa na porcie 3000"));
