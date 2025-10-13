import React from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { useTheme } from "../../ThemeContext";

const Sidebar = ({ setActiveSection, activeSection, onShare, onUnshare, isShared, disabled }) => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    
    const sidebarStyle = {
        width: "250px",
        height: "100%",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000,
        overflowY: "auto",
        paddingTop: "1.5rem",
        paddingBottom: "1.5rem",
        backgroundColor: theme === "dark" ? "#2d2d2d" : "#f5f5f7",
        borderRight: `1px solid ${theme === "dark" ? "#3d3d3d" : "#e0e0e0"}`,
    };

    const getMenuItemStyle = (section) => {
        const isActive = activeSection === section;
        return {
            padding: "12px 16px",
            margin: "4px 0",
            textAlign: "left",
            borderRadius: "6px",
            fontWeight: isActive ? "600" : "400",
            backgroundColor: isActive
                ? (theme === "dark" ? "#2563eb" : "transparent") 
                : "transparent",
            color: isActive 
                ? (theme === "dark" ? "#ffffff" : "#2563eb")
                : "inherit",
            borderLeft: isActive 
                ? `4px solid ${theme === "dark" ? "#ffffff" : "#3b82f6"}` 
                : "4px solid transparent",
            transition: "all 0.2s ease-in-out"
        };
    };
    return (
      <div className="sidebar theme-transition" style={sidebarStyle}>
        <div className="d-flex flex-column h-100 p-3">
          <h2 className="text-center mb-4">CTI4BC</h2>
          
          <button 
              onClick={() => navigate(-1)} 
              className="btn btn-outline-secondary mb-4"
              disabled={disabled}
          >
              <i className="bi bi-arrow-left me-2"></i> Go Back
          </button>
          
          <nav className="nav flex-column flex-grow-1 mb-4">
            <button
              className="nav-link menu-item"
              style={getMenuItemStyle("details")}
              onClick={() => setActiveSection("details")}
              disabled={disabled}
            >
              <i className="bi bi-info-circle me-2"></i> Details
            </button>
            <button
              className="nav-link menu-item"
              style={getMenuItemStyle("attributes")}
              onClick={() => setActiveSection("attributes")}
              disabled={disabled}
            >
              <i className="bi bi-list-check me-2"></i> Attributes
            </button>
            <button
              className="nav-link menu-item"
              style={getMenuItemStyle("artifacts")}
              onClick={() => setActiveSection("artifacts")}
              disabled={disabled}
            >
              <i className="bi bi-file-earmark me-2"></i> Artifacts
            </button>
            <button
              className="nav-link menu-item"
              style={getMenuItemStyle("jsonfile")}
              onClick={() => setActiveSection("jsonfile")}
              disabled={disabled}
            >
              <i className="bi bi-code-slash me-2"></i> JSON
            </button>
            <button
              className="nav-link menu-item"
              style={getMenuItemStyle("sharing-strategies")}
              onClick={() => setActiveSection("sharing-strategies")}
              disabled={disabled}
            >
              <i className="bi bi-share me-2"></i> Sharing Strategies
            </button>
          </nav>
          
          <div className="mt-auto">
            {isShared ? (
              <button 
                  className="btn btn-outline-danger w-100" 
                  onClick={onUnshare}
                  disabled={disabled}
              >
                  <i className="bi bi-x-circle me-2"></i> Unshare
              </button>
            ) : (
              <button 
                  className="btn btn-outline-success w-100" 
                  onClick={onShare}
                  disabled={disabled}
              >
                  <i className="bi bi-share-fill me-2"></i> Share
              </button>
            )}
          </div>
        </div>
      </div>
    );
};

export default Sidebar;