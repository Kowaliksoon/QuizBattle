import mongoose from "mongoose";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import User from "./models/User.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // dla testów lokalnych
  },
});

// --- Mongo na sztywno ---
const MONGO_URI = "mongodb://localhost:27017/quizbattle"; // <- wpisane na sztywno
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// --- prosty endpoint testowy ---
app.get("/", (req, res) => {
  res.send("QuizBattle backend działa 🚀");
});


// ---------- ENDPOINTY ----------

// REJESTRACJA
// REJESTRACJA
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Brak danych" });
  }

  try {
    // Sprawdzenie czy email lub username już istnieje
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: "Email już istnieje" });
      } else if (existingUser.username === username) {
        return res.status(400).json({ message: "Nazwa użytkownika już istnieje" });
      }
    }

    const user = new User({ username, email, password });
    await user.save();

    res.status(201).json({
      message: "Konto utworzone",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Błąd podczas rejestracji:", err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});


// LOGOWANIE
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, password });
  if (!user) {
    return res.status(401).json({ message: "Złe dane logowania" });
  }

  res.json({
    message: "Zalogowano",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
});



// --- Socket.IO ---
io.on("connection", (socket) => {
  console.log("Nowy gracz:", socket.id);

  socket.on("disconnect", () => {
    console.log("Gracz wyszedł:", socket.id);
  });
});

// --- uruchomienie serwera ---
const PORT = 3000; // <- hardcodowany port
server.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
