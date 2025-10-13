import React, { useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import EventList from "./Events/EventList";
import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Aggregation from "./Events/Aggregation/AggregationView";
import ShareEventView from "./Events/EventDetail/ShareEvent";
import EventShareLogs from "./Events/EventShareLogs";
import Login from "./Login/Login";
import ProtectedRoute from "./ProtectedRoute/ProtectedRoute";
import AdminProtectedRoute from "./ProtectedRoute/AdminProtectedRoute";
import KafkaView from "./KafkaView/KafkaView";
import FormsView from "./Forms/FormsView";
import FormStats from "./Forms/FormStats";
import Analytics from './Analytics/Analytics';
import Settings from './Settings/Settings';
import MyFormAnswers from './UserResponses/MyFormAnswers';
import NotificationsPage from './components/Notifications/NotificationsPage';
import SystemHealthPage from './components/SystemHealth/SystemHealthPage';
import { useTheme, ThemeProvider } from './ThemeContext';
import ArtifactDownloadPage from "./Download/ArtifactDownloadPage";
import { ToastProvider, ToastContainer } from './components/Toast';
import { NotificationProvider } from './components/Notifications/NotificationContext';
import { HealthProvider } from './components/SystemHealth/HealthContext';
import Reports from './Reports/Reports';

function App() {
  useTheme(); // Keeping the useTheme() call for potential future uses

  useEffect(() => {
    document.title = "CTI4BC";
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <NotificationProvider>
          <HealthProvider>
            <div className="theme-transition">
              <Router>
                <Routes>
                  <Route path="/" element={<Login/>} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/events" element={<EventList />} />
                    <Route path="/event/:id" element={<ShareEventView />} />
                    <Route path="/aggregation" element={<Aggregation />} />
                    <Route path="/share-logs" element={<EventShareLogs />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/download/:id" element={<ArtifactDownloadPage />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/my-form-answers" element={<MyFormAnswers />} />
                    <Route path="/reports" element={<Reports />} />
                    
                    {/* Admin protected routes - nested within protected routes */}
                    <Route element={<AdminProtectedRoute />}>
                      <Route path="/health" element={<SystemHealthPage />} />
                      <Route path='/admin/kafka' element={<KafkaView />} />
                      <Route path='/admin/forms' element={<FormsView />} />
                      <Route path='/admin/form-stats' element={<FormStats />} />
                    </Route>
                  </Route>
                </Routes>
              </Router>
              <ToastContainer />
            </div>
          </HealthProvider>
        </NotificationProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
