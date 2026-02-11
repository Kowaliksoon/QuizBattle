import { io } from "socket.io-client";

// Hardcodowany backend URL

// socket.js
const createSocket = ({ userId, username }) => {
  return io("http://localhost:3000", {
    auth: { userId, username },
    autoConnect: true,
  });
};

export default createSocket
