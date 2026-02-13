import mongoose from "mongoose";

const GameSchema = new mongoose.Schema({
  players: [
    {
      userId: String,
      username: String,
      score: { type: Number, default: 0 },
      answers: [
        {
          questionId: String,
          answerIndex: Number,
          correct: Boolean,
          points: Number
        }
      ]
    }
  ],
  questions: [
    { categoryId: String, questionId: String, used: { type: Boolean, default: false } }
  ],
  currentQuestion: { type: Number, default: 0 },
  status: { type: String, default: "playing" }, // "finished"
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Game", GameSchema);