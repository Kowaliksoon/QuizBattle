import { useEffect } from "react";
import socket from "./socket";
import AuthForm from "./components/AuthForm";

function App() {
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Połączono z backendem:", socket.id);
    });

    return () => {
      socket.off("connect");
    };
  }, []);

  return (
      <AuthForm></AuthForm>
  );
}

export default App;
