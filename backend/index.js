import mongoose from "mongoose";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import User from "./models/User.js"; // zakładam prosty model User z username, email, password
import adminRoutes from "./routes/admin.js";
import gameRoutes from "./routes/Game.js"

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });

// --- GLOBALNE ZMIENNE ---
const onlineUsers = new Map(); // userId -> { socketId, username }
const queue = [];
const matches = {}; // roomId -> { players: Set, accepted: Set, timers: Map<userId, timeout> }

// --- SOCKET.IO ---
io.on("connection", (socket) => {
  const { userId, username } = socket.handshake.auth;
  if (!userId || !username) return;
  
  onlineUsers.set(userId, { socketId: socket.id, username });
  io.emit("onlineCount", onlineUsers.size);
  console.log(`🔹 Gracz połączył się: ${username} (${userId}) | Online: ${onlineUsers.size}`);
  // --- KOLEJKA ---
  socket.on("joinQueue", () => {
    if (!queue.includes(userId)) queue.push(userId);
    socket.emit("queueJoined");
    tryMatch();
  });
  
  socket.on("leaveQueue", () => {
    removeFromQueue(userId);
    socket.emit("queueLeft");
  });
  
  // --- AKCEPTACJA MECZU ---
socket.on("acceptMatch", ({ roomId }) => {
  const match = matches[roomId];
  if (!match || !match.players.has(userId)) return;
  
  match.accepted.add(userId);
  
  if (match.timers.has(userId)) {
    clearTimeout(match.timers.get(userId));
    match.timers.delete(userId);
  }
  
  // Gdy obaj gracze zaakceptowali
  if (match.accepted.size === 2) {
    // ✅ LOSUJEMY STARTERA NA SERWERZE (nie w przeglądarce!)
    const playersArray = Array.from(match.players);
    const starterUserId = playersArray[Math.floor(Math.random() * playersArray.length)];
    const starterUsername = onlineUsers.get(starterUserId)?.username;
    
    console.log(`🎯 Losowanie: ${starterUsername} rozpoczyna grę w pokoju ${roomId}`);
    
    match.players.forEach((id) => {
      const user = onlineUsers.get(id);
      if (user) io.to(user.socketId).emit("matchAccepted", {
        roomId,
        players: Array.from(match.players).map(id => onlineUsers.get(id)?.username),
        starter: starterUsername // 🎯 Wysyłamy info kto zaczyna
      });
    });
    match.timers.forEach(t => clearTimeout(t));
    delete matches[roomId];
  }
});
  // --- ODRZUCENIE MECZU ---
  socket.on("rejectMatch", ({ roomId }) => {
    const match = matches[roomId];
    if (!match || !match.players.has(userId)) return;
    
    match.timers.forEach(t => clearTimeout(t));
    
    match.players.forEach((id) => {
      const user = onlineUsers.get(id);
      if (!user) return;
      
      io.to(user.socketId).emit("matchRejected", { rejectedUserId: userId });
      
      if (id === userId) removeFromQueue(id);
      else if (!queue.includes(id)) queue.push(id);
    });
    
    delete matches[roomId];
    tryMatch();
  });
  
  // --- ROZŁĄCZENIE ---
  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    removeFromQueue(userId);
    io.emit("onlineCount", onlineUsers.size);
  });
  
  // --- DOPASOWANIE ---
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
        timers: new Map()
      };
      
      [ player1, player2 ].forEach(id => {
        const t = setTimeout(() => {
          const match = matches[roomId];
          if (!match) return;
          
          // jeśli gracz nie podjął decyzji
          if (!match.accepted.has(id)) {
            const user = onlineUsers.get(id);
            if (user) io.to(user.socketId).emit("matchTimeout", { timeoutUserId: id });
            
            removeFromQueue(id); // wyrzucamy tylko gracza, który nie kliknął
            match.timers.delete(id);
            
            console.log(`⏱️ Timeout: ${user?.username} nie podjął decyzji i został wyrzucony z kolejki`);
            
            // drugi gracz, jeśli zaakceptował, wraca do kolejki
            const otherId = Array.from(match.players).find(pid => pid !== id);
            if (match.accepted.has(otherId) && !queue.includes(otherId)) {
              queue.push(otherId);
              console.log(`🔄 ${onlineUsers.get(otherId)?.username} pozostaje w kolejce po timeout przeciwnika`);
            }
          } else {
            // jeśli kliknął Akceptuj → nie wyrzucamy
            console.log(`ℹ️ ${onlineUsers.get(id)?.username} kliknął Akceptuj, nie wyrzucamy mimo timeoutu przeciwnika`);
          }
          
          if (match.timers.size === 0) delete matches[roomId];
          tryMatch();
        }, 10000);
        
  matches[roomId].timers.set(id, t);
});

io.to(p1.socketId).emit("matchRequest", { roomId, opponent: p2.username });
io.to(p2.socketId).emit("matchRequest", { roomId, opponent: p1.username });
}
}

function removeFromQueue(id) {
  const index = queue.indexOf(id);
  if (index !== -1) queue.splice(index, 1);
}
});

// --- MONGO ---
const MONGO_URI = "mongodb://localhost:27017/quizbattle";
mongoose.connect(MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

// --- PROSTE API ---
app.get("/", (req, res) => res.send("QuizBattle backend działa 🚀"));

app.use("/admin", adminRoutes);

app.use("/game", gameRoutes);


// --- REJESTRACJA ---
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: "Brak danych" });

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email) return res.status(400).json({ message: "Email już istnieje" });
      if (existingUser.username === username) return res.status(400).json({ message: "Nazwa użytkownika już istnieje" });
    }

    const user = new User({ username, email, password });
    await user.save();

    res.status(201).json({
      message: "Konto utworzone",
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("Błąd rejestracji:", err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// --- LOGOWANIE ---
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user) return res.status(401).json({ message: "Złe dane logowania" });

  res.json({
    message: "Zalogowano",
    user: { id: user._id, username: user.username, email: user.email },
  });
});

// --- URUCHOMIENIE SERWERA ---
const PORT = 3000;
server.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));
