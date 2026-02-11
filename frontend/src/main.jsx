import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import App from "./App";
import "./index.css";
import Lobby from "./pages/Lobby";

ReactDOM.createRoot(document.getElementById("root")).render(
	// <React.StrictMode>
		<BrowserRouter>
			<SnackbarProvider
				maxSnack={3}
				anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
				<Routes>
					<Route path='/' element={<App />} />
          <Route path="/lobby" element={<Lobby />} />
				</Routes>
			</SnackbarProvider>
		</BrowserRouter>
	/* </React.StrictMode>, */
);
