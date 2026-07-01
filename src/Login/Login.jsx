import React, {useState} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Login.css';
import { useTheme } from '../ThemeContext';
import { useToast } from '../components/Toast';
import { Button } from 'react-bootstrap';

const SERVER_URL = process.env.REACT_APP_API_URL;

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    // const [email, setEmail] = useState("");
    // const [activeTab, setActiveTab] = useState("login"); // re-enable with the register tab
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

    return (
        <div className="mi-auth">
            {/* Left: Montimage brand panel */}
            <aside className="mi-auth__brand">
                <div className="mi-auth__brand-inner">
                    <div className="mi-auth__mark">C</div>
                    <div className="mi-auth__brand-name">CTI4BC</div>
                    <h2 className="mi-auth__brand-title">Cyber Threat Intelligence for Business Continuity</h2>
                    <p className="mi-auth__brand-sub">
                        Collect, refine, anonymize and share cyber threat intelligence across partner
                        organizations — securely and on time.
                    </p>
                    <div className="mi-auth__brand-foot">Dynabic · EU Horizon Europe programme</div>
                </div>
            </aside>

            {/* Right: sign-in form */}
            <section className="mi-auth__form">
                <div className="mi-auth__toggle">
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

                <div className="mi-auth__form-inner">
                    <h1 className="mi-auth__title">Welcome back</h1>
                    <p className="mi-auth__subtitle">Sign in to your CTI4BC account</p>

                    {/* Registration form is hidden for now; handleRegister above is ready to re-enable */}
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
                        <button type="submit" className="login-submit-btn">Sign in</button>
                    </form>
                </div>
            </section>
        </div>
    );
};

export default Login;