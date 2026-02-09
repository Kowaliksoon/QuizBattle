import { io } from "socket.io-client";

// Hardcodowany backend URL
const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Połączono z backendem:", socket.id);
});

export default socket;