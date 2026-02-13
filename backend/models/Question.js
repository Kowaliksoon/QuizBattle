import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
  difficulty: {
    type: Number,
    enum: [100, 200, 300, 400, 500],
    required: true
  },
  question: {
    type: String,
    required: true
  },
  answers: {
    type: [String],
    validate: v => v.length === 4,
    required: true
  },
  correctIndex: {
    type: Number,
    min: 0,
    max: 3,
    required: true
  }
});

export default mongoose.model("Question", questionSchema);
