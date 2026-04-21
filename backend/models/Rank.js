// backend/models/Rank.js
import mongoose from "mongoose";

const RANKS = [
  { name: "🌱 Rookie",      minRP: 0    },
  { name: "📚 Apprentice",  minRP: 200  },
  { name: "🎓 Scholar",     minRP: 500  },
  { name: "🧠 Intellectual",minRP: 1000 },
  { name: "🏆 Knowledge Master", minRP: 1800 },
  { name: "💎 Encyclopedia",minRP: 3000 },
  { name: "🌟 Legend",      minRP: 5000 },
];

export function getRank(rp) {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (rp >= rank.minRP) current = rank;
  }
  return current.name;
}

export function getRankLevel(rp) {
  let level = 0;
  for (const rank of RANKS) {
    if (rp >= rank.minRP) level++;
  }
  return level - 1; // 0-6
}

export function calculateRP(won, myRankLevel, opponentRankLevel) {
  const diff = opponentRankLevel - myRankLevel;

  if (won) {
    if (diff > 0) return 35;
    if (diff === 0) return 25;
    return 18;
  } else {
    if (diff < 0) return -20;
    if (diff === 0) return -15;
    return -8;
  }
}

const RankSchema = new mongoose.Schema({
  userId:   { type: String, required: true, unique: true },
  username: { type: String, required: true },
  rp:       { type: Number, default: 0 },
  rank:     { type: String, default: "🌱 Rookie" },
}, { timestamps: true });

export default mongoose.model("Rank", RankSchema);