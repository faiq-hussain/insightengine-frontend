import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CreateSurvey from './pages/CreateSurvey';
import TakeSurvey from './pages/TakeSurvey';
import WhatsAppSurvey from './pages/WhatsAppSurvey';
import SurveyInsights from './pages/SurveyInsights';
import './styles.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Standalone survey pages — no sidebar */}
        <Route path="/survey/:id/take"      element={<TakeSurvey />} />
        <Route path="/survey/:id/whatsapp"  element={<WhatsAppSurvey />} />

        {/* Main app with sidebar */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="create" element={<CreateSurvey />} />
          <Route path="survey/:id/insights" element={<SurveyInsights />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
