import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { HIDE_ALL_RESUMES } from "./config/siteConfig";
import OnDutyPage from "./pages/OnDutyPage";
import ResumeRoutePage from "./pages/ResumeRoutePage";
import "./styles/resume.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={
            HIDE_ALL_RESUMES ? <OnDutyPage /> : <Navigate to="/resume/current" replace />
          }
        />
        <Route
          path="/resume/*"
          element={HIDE_ALL_RESUMES ? <OnDutyPage /> : <ResumeRoutePage />}
        />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
