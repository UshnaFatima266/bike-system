import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { ShopProvider } from "./store/ShopContext";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ShopProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ShopProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
