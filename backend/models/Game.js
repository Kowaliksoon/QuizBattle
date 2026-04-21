import mongoose from "mongoose";

const GameSchema = new mongoose.Schema({
  players: [
    {
      userId: String,
      username: String,
      score: { type: Number, default: 0 },
      correctAnswers: { type: Number, default: 0 },
      wrongAnswers: { type: Number, default: 0 },
    }
  ],
  winner: String,
  status: { type: String, default: "playing" },
  createdAt: { type: Date, default: Date.now },
  finishedAt: Date,
});

export default mongoose.model("Game", GameSchema);