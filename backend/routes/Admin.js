import express from "express";
import Category from "../models/Category.js";
import Question from "../models/Question.js";
import Suggestion from "../models/Suggestion.js";

const router = express.Router();

// ➕ CREATE CATEGORY
router.post("/categories", async (req, res) => {
  try {
    const { name } = req.body;
    const category = new Category({ name });
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 📋 GET ALL CATEGORIES
router.get("/categories", async (req, res) => {
  const categories = await Category.find();
  res.json(categories);
});

// ➕ ADD QUESTION
router.post("/questions", async (req, res) => {
  try {
    const { categoryId, difficulty, question, answers, correctIndex } = req.body;
    const newQuestion = new Question({ category: categoryId, difficulty, question, answers, correctIndex });
    await newQuestion.save();
    res.json(newQuestion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 📋 GET QUESTIONS BY CATEGORY
router.get("/questions/:categoryId", async (req, res) => {
  const questions = await Question.find({ category: req.params.categoryId });
  res.json(questions);
});

// 📋 GET ALL SUGGESTIONS (dla admina)
router.get("/suggestions", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const suggestions = await Suggestion.find(filter).sort({ createdAt: -1 });
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ APPROVE SUGGESTION
router.post("/suggestions/:id/approve", async (req, res) => {
  try {
    const suggestion = await Suggestion.findById(req.params.id);
    if (!suggestion) return res.status(404).json({ error: "Nie znaleziono zgłoszenia" });

    if (suggestion.type === "category") {
      const existing = await Category.findOne({ name: suggestion.categoryName });
      if (!existing) {
        const cat = new Category({ name: suggestion.categoryName });
        await cat.save();
      }
    } else if (suggestion.type === "question") {
      const newQuestion = new Question({
        category: suggestion.categoryId,
        difficulty: suggestion.difficulty,
        question: suggestion.question,
        answers: suggestion.answers,
        correctIndex: suggestion.correctIndex,
      });
      await newQuestion.save();
    }

    suggestion.status = "approved";
    await suggestion.save();

    res.json({ message: "Zatwierdzono", suggestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ❌ REJECT SUGGESTION
router.post("/suggestions/:id/reject", async (req, res) => {
  try {
    const { adminNote } = req.body;
    const suggestion = await Suggestion.findById(req.params.id);
    if (!suggestion) return res.status(404).json({ error: "Nie znaleziono zgłoszenia" });

    suggestion.status = "rejected";
    if (adminNote) suggestion.adminNote = adminNote;
    await suggestion.save();

    res.json({ message: "Odrzucono", suggestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;