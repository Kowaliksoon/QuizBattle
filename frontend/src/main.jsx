import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import App from "./App";
import "./index.css";
import Lobby from "./pages/Lobby";
import AdminPanel from "./pages/AdminPanel";
import GameRoom from "./pages/GameRoom";

ReactDOM.createRoot(document.getElementById("root")).render(
	// <React.StrictMode>
	<BrowserRouter>
		<SnackbarProvider
			maxSnack={3}
			anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
			<Routes>
				<Route path='/' element={<App />} />
				<Route path='/lobby' element={<Lobby />} />
				<Route path='/adminPanel' element={<AdminPanel />} />
				<Route path="/game/:gameId" element={<GameRoom />} />
			</Routes>
		</SnackbarProvider>
	</BrowserRouter>,
	/* </React.StrictMode>, */
);
