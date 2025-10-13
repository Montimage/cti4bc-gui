import React, {useState} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Login.css';
import { useTheme } from '../ThemeContext';
import { useToast } from '../components/Toast';
import { Button, Nav } from 'react-bootstrap';

const SERVER_URL = process.env.REACT_APP_API_URL;

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    // const [email, setEmail] = useState("");
    const [activeTab, setActiveTab] = useState("login"); // "login" ou "register"
    const { theme, toggleTheme } = useTheme();
    const { showError } = useToast(); // { showError, showSuccess } if needed

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch( `${SERVER_URL}/api/token/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            if (!response.ok) {
                throw new Error('Invalid login credentials');
            }
            const data = await response.json();
            localStorage.setItem('accessToken', data.access);
            localStorage.setItem('refreshToken', data.refresh);
            window.location.href = 'events/';
        } catch (error) {
            showError(error.message);
        }
    };

    // Automatic user registration with email only, use only for testing/demo purposes and update url
    /* const handleRegister = async (e) => {
        e.preventDefault();
        
        if (!email) {
            showError("Email is required");
            return;
        }

        try {
            const response = await fetch(``, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Registration failed');
            }
            
            const userData = await response.json();
            
            showSuccess(`Registration successful! 
                Email: ${userData.email}
                Username: ${userData.username}
                Password: ${userData.password}
                
                Please save these credentials and use them to log in.`);
            
            setEmail("");
            setActiveTab("login");

            // Auto-populate username field with the new username
            if (userData.username) {
                setUsername(userData.username);
            }
        } catch (error) {
            showError(error.message);
        }
    }; */

    const changeTab = (tab) => {
        setActiveTab(tab);
    };

    return (
        <div className="login-container">
            <div className="login-theme-toggle">
                <Button 
                    variant={theme === 'dark' ? 'outline-light' : 'outline-dark'}
                    size="sm"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? (
                        <>
                            <i className="bi bi-sun-fill me-1"></i>
                            Light
                        </>
                    ) : (
                        <>
                            <i className="bi bi-moon-stars-fill me-1"></i>
                            Dark
                        </>
                    )}
                </Button>
            </div>
            
            <h1 className="login-title">Welcome to CTI4BC</h1>
            
            <div className="login-card">
                <Nav variant="tabs" className="login-nav-tabs">
                    <Nav.Item>
                        <Nav.Link 
                            active={activeTab === "login"}
                            onClick={() => changeTab("login")}
                            className={`${activeTab === "login" ? 'active' : ''}`}
                        >
                            Login
                        </Nav.Link>
                    </Nav.Item>
                    {/* <Nav.Item>
                        <Nav.Link 
                            active={activeTab === "register"}
                            onClick={() => changeTab("register")}
                            className={`${activeTab === "register" ? 'active' : ''}`}
                        >
                            New User
                        </Nav.Link>
                    </Nav.Item> */}
                </Nav>
                
                <div className="login-card-body">
                    {/* Registration form is hidden for now, uncomment to enable */}
                    {/*
                    {activeTab === "register" ? (
                        <form onSubmit={handleRegister}>
                            <div className="login-form-group">
                                <label htmlFor="email" className="login-form-label">Email</label>
                                <input 
                                    type="email" 
                                    className="login-form-control" 
                                    id="email" 
                                    name="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)} 
                                    required 
                                />
                            </div>
                            <button type="submit" className="login-submit-btn">Register</button>
                        </form>
                    ) : (
                    */}
                        <form onSubmit={handleSubmit}>
                            <div className="login-form-group">
                                <label htmlFor="username" className="login-form-label">Username</label>
                                <input 
                                    type="text" 
                                    className="login-form-control" 
                                    id="username" 
                                    name="username" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)} 
                                    required 
                                />
                            </div>
                            <div className="login-form-group">
                                <label htmlFor="password" className="login-form-label">Password</label>
                                <input 
                                    type="password" 
                                    className="login-form-control" 
                                    id="password" 
                                    name="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
                                />
                            </div>
                            <button type="submit" className="login-submit-btn">Login</button>
                        </form>
                    {/* )} */}
                </div>
            </div>
        </div>
    );
};

export default Login;