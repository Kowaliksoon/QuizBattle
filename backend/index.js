import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("QuizBattle backend działa 🚀");
});

io.on("connection", (socket) => {
  console.log("Nowy gracz:", socket.id);

  socket.on("disconnect", () => {
    console.log("Gracz wyszedł:", socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
