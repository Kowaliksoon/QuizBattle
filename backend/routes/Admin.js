import express from "express";
import Category from "../models/Category.js";
import Question from "../models/Question.js";

const router = express.Router();

//
// ➕ CREATE CATEGORY
//
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

//
// 📋 GET ALL CATEGORIES
//
router.get("/categories", async (req, res) => {
  const categories = await Category.find();
  res.json(categories);
});

//
// ➕ ADD QUESTION TO CATEGORY
//
router.post("/questions", async (req, res) => {
  try {
    const { categoryId, difficulty, question, answers, correctIndex } = req.body;

    const newQuestion = new Question({
      category: categoryId,
      difficulty,
      question,
      answers,
      correctIndex
    });

    await newQuestion.save();

    res.json(newQuestion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//
// 📋 GET QUESTIONS BY CATEGORY
//
router.get("/questions/:categoryId", async (req, res) => {
  const questions = await Question.find({
    category: req.params.categoryId
  });

  res.json(questions);
});

export default router;
