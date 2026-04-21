import mongoose from "mongoose";

const SuggestionSchema = new mongoose.Schema({
  userId:   { type: String, required: true },
  username: { type: String, required: true },
  type:     { type: String, enum: ["category", "question"], required: true },

  // Dla nowej kategorii
  categoryName: { type: String },

  // Dla nowego pytania
  categoryId:   { type: String },
  categoryDisplayName: { type: String },
  difficulty:   { type: Number, enum: [100, 200, 300, 400, 500] },
  question:     { type: String },
  answers:      { type: [String] },
  correctIndex: { type: Number },

  status:  { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  adminNote: { type: String },
}, { timestamps: true });

export default mongoose.model("Suggestion", SuggestionSchema);