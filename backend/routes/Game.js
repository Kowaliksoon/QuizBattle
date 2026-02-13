import express from "express";
import Category from "../models/Category.js";
import Question from "../models/Question.js";
import Game from "../models/Game.js";

const router = express.Router();

// --- Tworzenie gry ---
router.post("/create", async (req, res) => {
  const { players } = req.body;
  if (!players || players.length < 1) return res.status(400).json({ message: "Brak graczy" });

  const categories = await Category.aggregate([{ $sample: { size: 5 } }]);
  const questions = [];

  for (const cat of categories) {
    const qs = await Question.aggregate([
      { $match: { category: cat._id } },
      { $sample: { size: 5 } }
    ]);
    qs.forEach(q => {
      questions.push({ categoryId: cat._id.toString(), questionId: q._id.toString(), used: false });
    });
  }

  const game = new Game({ players: players.map(p => ({ ...p, score: 0, answers: [] })), questions });
  await game.save();
  res.json({ gameId: game._id, currentQuestion: 0 });
});

// --- Pobranie aktualnego pytania ---
router.get("/:gameId/question", async (req, res) => {
  const { gameId } = req.params;
  const game = await Game.findById(gameId);
  if (!game) return res.status(404).json({ message: "Brak gry" });

  const qData = game.questions[game.currentQuestion];
  if (!qData) return res.json({ message: "Koniec pytań" });

  const question = await Question.findById(qData.questionId);
  res.json({ question });
});

// --- Odpowiedź gracza ---
router.post("/:gameId/answer", async (req, res) => {
  const { gameId } = req.params;
  const { userId, answerIndex } = req.body;

  const game = await Game.findById(gameId);
  if (!game) return res.status(404).json({ message: "Brak gry" });

  const qData = game.questions[game.currentQuestion];
  if (!qData) return res.status(400).json({ message: "Brak pytania" });

  const question = await Question.findById(qData.questionId);
  const player = game.players.find(p => p.userId === userId);
  if (!player) return res.status(400).json({ message: "Niepoprawny gracz" });

  const correct = answerIndex === question.correctIndex;
  const points = correct ? question.difficulty : -question.difficulty;
  player.score += points;

  player.answers.push({ questionId: question._id.toString(), answerIndex, correct, points });
  qData.used = true;
  game.currentQuestion += 1;

  if (game.currentQuestion >= game.questions.length) game.status = "finished";
  await game.save();

  res.json({
    scores: game.players,
    nextQuestion: game.questions[game.currentQuestion] || null,
    status: game.status
  });
});

// --- Statystyki zakończonej gry ---
router.get("/:gameId/stats", async (req, res) => {
  const { gameId } = req.params;
  const game = await Game.findById(gameId);
  if (!game) return res.status(404).json({ message: "Brak gry" });
  if (game.status !== "finished") return res.status(400).json({ message: "Gra jeszcze trwa" });

  const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
  res.json({
    gameId: game._id,
    players: sortedPlayers.map(p => ({
      username: p.username,
      score: p.score,
      correctAnswers: p.answers.filter(a => a.correct).length,
      totalAnswers: p.answers.length
    })),
    totalQuestions: game.questions.length
  });
});

export default router;
