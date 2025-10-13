import React, { useState, useEffect, useRef, useCallback } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import NavBar from '../NavBar/NavBar';
import { useTheme } from '../ThemeContext';
import { useToast } from '../components/Toast';
import './KafkaView.css';

const SERVER_URL = process.env.REACT_APP_API_URL;

const KafkaView = () => {
    const { showError, showSuccess } = useToast();
    const [topics, setTopics] = useState("");
    const [response, setResponse] = useState(null);
    const [consumerStatus, setConsumerStatus] = useState({});
    const [kafkaCredentials, setKafkaCredentials] = useState({});
    const [messages, setMessages] = useState([]);
    const [selectedQuickTopics, setSelectedQuickTopics] = useState([]);
    const [customTopic, setCustomTopic] = useState("");
    const [isThemeChanging, setIsThemeChanging] = useState(false);
    const messagesEndRef = useRef(null);
    const { theme } = useTheme();

    // Handle theme change with temporary transition disable
    useEffect(() => {
        setIsThemeChanging(true);
        const timer = setTimeout(() => {
            setIsThemeChanging(false);
        }, 50); // Very short delay to allow theme change to complete
        
        return () => clearTimeout(timer);
    }, [theme]);
    
    const quickTopics = [
        "UC1.AWARE4BC.security_alerts",
        "UC2.AWARE4BC.security_alerts",
        "UC3.AWARE4BC.security_alerts",
        "UC4.AWARE4BC.security_alerts"
    ];

    // Function to fetch consumer status
    const fetchConsumerStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${SERVER_URL}/consumer/status/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            setConsumerStatus(data);
        } catch (error) {
                    }
    }, []);

    // Function to fetch Kafka credentials
    const fetchKafkaCredentials = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${SERVER_URL}/consumer/env/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            setKafkaCredentials(data.env_variables || {});
        } catch (error) {
                    }
    }, []);

    // Function to fetch messages
    const fetchMessages = useCallback(async () => {
        if (consumerStatus.status !== 'running') return;
        
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${SERVER_URL}/consumer/messages/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            
            if (data.messages && data.messages.length > 0) {
                // Add new messages to the existing pile
                setMessages(prevMessages => {
                    // Create a map of existing messages to check for duplicates
                    const existingMap = new Map(prevMessages.map(msg => [
                        // Create a unique identifier for each message - adjust as needed based on your data
                        JSON.stringify({
                            topic: msg.topic, 
                            timestamp: msg.timestamp, 
                            value: msg.value || msg.message
                        }),
                        true
                    ]));
                    
                    // Filter out duplicates and add only new messages
                    const newMessages = data.messages.filter(msg => 
                        !existingMap.has(JSON.stringify({
                            topic: msg.topic, 
                            timestamp: msg.timestamp, 
                            value: msg.value || msg.message
                        }))
                    );
                    
                    return [...prevMessages, ...newMessages];
                });
            }
        } catch (error) {
                    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [consumerStatus.status]);

    // Initial fetch and setup interval for polling
    useEffect(() => {
        fetchConsumerStatus();
        fetchKafkaCredentials();
        fetchMessages(); // Try to get messages immediately
        
        const statusInterval = setInterval(fetchConsumerStatus, 5000);
        const messagesInterval = setInterval(fetchMessages, 2000);
        
        // Return cleanup function
        return () => {
            clearInterval(statusInterval);
            clearInterval(messagesInterval);
        };
    }, [fetchMessages, fetchConsumerStatus, fetchKafkaCredentials]);

    // Handle quick topic selection
    const handleQuickTopicSelect = (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
        setSelectedQuickTopics(selectedOptions);
        if (selectedOptions.length > 0) {
            setTopics(selectedOptions.join(','));
        }
    };

    // Function to add a selected topic to the current topics list
    const addTopicToList = () => {
        if (!customTopic.trim()) return;
        
        const currentTopics = topics ? topics.split(',') : [];
        if (!currentTopics.includes(customTopic)) {
            const newTopics = [...currentTopics, customTopic].filter(t => t.trim()).join(',');
            setTopics(newTopics);
            setCustomTopic(""); // Reset the input field
        }
    };

    // Function to handle custom topic input
    const handleCustomTopicChange = (e) => {
        setCustomTopic(e.target.value);
    };

    // Function to handle Enter key for quick addition
    const handleCustomTopicKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTopicToList();
        }
    };

    // Function to remove a topic from the current list
    const removeTopicFromList = (topicToRemove) => {
        const currentTopics = topics.split(',');
        const newTopics = currentTopics.filter(topic => topic !== topicToRemove).join(',');
        setTopics(newTopics);
    };

    const handleStart = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const cleanedTopics = topics.replace(/\s+/g, '');
            const res = await fetch(`${SERVER_URL}/consumer/start/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({topics : cleanedTopics.split(',')}),
            });
            if (!res.ok){
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            setResponse(data);
            if (data.status && data.status.includes('started')) {
                showSuccess(data.status);
            }
            fetchConsumerStatus();
        } catch (error) {
            const errorMessage = error.message;
            setResponse({error: errorMessage});
            showError(errorMessage);
        }
    };

    const handleStop = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${SERVER_URL}/consumer/stop/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            if(!res.ok){
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            setResponse(data);
            if (data.status && data.status.includes('stopped')) {
                showSuccess(data.status);
            }
            fetchConsumerStatus();
            // Clear messages when stopping
            setMessages([]);
        } catch (error) {
            const errorMessage = error.message;
            setResponse({error: errorMessage});
            showError(errorMessage);
        }
    };
  
    return (
        <div className={`kafka-view container-fluid mt-4 ${isThemeChanging ? 'theme-changing' : ''}`}>
            <NavBar />
            <div className="row kafka-main-row" style={{ minHeight: "calc(100vh - 80px)" }}>
                {/* Left Column (1/3 width) */}
                <div className="col-md-4">
                    <div className="card h-100 shadow-sm">
                        <div className={`card-header ${theme === 'light' ? 'bg-primary text-white' : 'bg-dark text-white'}`}>
                            <h4 className="mb-0">Kafka Consumer Control</h4>
                        </div>
                        <div className="card-body">
                            {/* Consumer Status */}
                            <div className="mb-4">
                                <h5>Consumer Status</h5>
                                <div className="d-flex align-items-center mb-2">
                                    <div className={`status-indicator me-2 ${consumerStatus.status === 'running' ? 'bg-success' : 'bg-danger'}`} 
                                        style={{ width: '12px', height: '12px', borderRadius: '50%' }}>
                                    </div>
                                    <span>{consumerStatus.status === 'running' ? 'Running' : 'Stopped'}</span>
                                </div>
                                {consumerStatus.status === 'running' && (
                                    <div className="small text-muted">
                                        <div>Active topics: {consumerStatus.topics?.join(', ') || 'None'}</div>
                                    </div>
                                )}
                            </div>

                            {/* Kafka Credentials */}
                            <div className="mb-4">
                                <h5>Kafka Credentials</h5>
                                <div className="small">
                                    <div><strong>Server:</strong> {kafkaCredentials.KAFKA_SERVER}</div>
                                    <div className="d-flex justify-content-between">
                                        <div><strong>Username:</strong> {kafkaCredentials.KAFKA_USERNAME}</div>
                                        <div><strong>Password:</strong> {kafkaCredentials.KAFKA_PASSWORD}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Topic Selection */}
                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h5>Quick Topic Selection</h5>
                                    <div>
                                        <button 
                                            type="button" 
                                            className="btn btn-sm btn-outline-primary me-1"
                                            onClick={() => {
                                                setSelectedQuickTopics(quickTopics);
                                                setTopics(quickTopics.join(','));
                                            }}
                                            disabled={consumerStatus.status === 'running'}
                                        >
                                            All
                                        </button>
                                        <button 
                                            type="button" 
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={() => {
                                                setSelectedQuickTopics([]);
                                                setTopics('');
                                            }}
                                            disabled={consumerStatus.status === 'running'}
                                        >
                                            None
                                        </button>
                                    </div>
                                </div>
                                <select 
                                    className="form-select mb-3"
                                    value={selectedQuickTopics}
                                    onChange={handleQuickTopicSelect}
                                    multiple
                                    size={4}
                                    disabled={consumerStatus.status === 'running'}
                                >
                                    {quickTopics.map((topic, index) => (
                                        <option key={index} value={topic}>{topic}</option>
                                    ))}
                                </select>
                                <div className="form-text">Hold the Ctrl key (or Cmd on Mac) to select multiple topics</div>
                            </div>

                            {/* Custom Topic Input */}
                            <div className="mb-4">
                                <h5>Custom Topic</h5>
                                <div className="mb-3">
                                    <div className="input-group">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Enter a topic name and press Enter or click Add
"
                                            value={customTopic}
                                            onChange={handleCustomTopicChange}
                                            onKeyDown={handleCustomTopicKeyDown}
                                            disabled={consumerStatus.status === 'running'}
                                        />
                                        <button 
                                            className="btn btn-outline-secondary" 
                                            type="button"
                                            onClick={addTopicToList}
                                            disabled={consumerStatus.status === 'running' || !customTopic.trim()}
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Selected Topics Display */}
                            {topics && (
                                <div className="mb-4">
                                    <h5>
                                        Selected Topics 
                                        <span className="badge bg-primary ms-2">
                                            {topics.split(',').filter(t => t.trim()).length}
                                        </span>
                                    </h5>
                                    <div className="selected-topics-container">
                                        {topics.split(',').filter(t => t.trim()).map((topic, index) => (
                                            <div key={index} className="selected-topic-badge">
                                                <span>{topic}</span>
                                                <button 
                                                    className="remove-topic-btn" 
                                                    onClick={() => removeTopicFromList(topic)}
                                                    title="Remove topic"
                                                    disabled={consumerStatus.status === 'running'}
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Control Buttons */}
                            <div className="d-flex gap-2 mb-3">
                                <button 
                                    className="btn btn-success flex-grow-1" 
                                    onClick={handleStart}
                                    disabled={!topics || consumerStatus.status === 'running'}
                                >
                                    Start Consumer
                                </button>
                                <button 
                                    className="btn btn-danger flex-grow-1" 
                                    onClick={handleStop}
                                    disabled={consumerStatus.status !== 'running'}
                                >
                                    Stop Consumer
                                </button>
                            </div>

                            {/* Response Messages */}
                            {response && (
                                <div className="mt-3 small">
                                    <h6>Last Action:</h6>
                                    <div className={`p-2 ${theme === 'dark' ? 'bg-dark' : 'bg-light'} rounded border`}>
                                        {response.error ? (
                                            <div className="text-danger">{response.error}</div>
                                        ) : (
                                            <div className="text-success">{response.status}</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column (2/3 width) - Messages Box */}
                <div className="col-md-8">
                    <div className="card h-100 shadow-sm d-flex flex-column">
                        <div className={`card-header ${theme === 'light' ? 'bg-primary text-white' : 'bg-dark text-white'}`}>
                            <h4 className="mb-0">Kafka Messages</h4>
                        </div>
                        <div className="card-body flex-grow-1 d-flex flex-column p-0">
                            <div className="message-container flex-grow-1" 
                                 style={{ 
                                     overflowY: "auto", 
                                     padding: "10px",
                                     backgroundColor: theme === 'dark' ? '#2b3035' : '#f8f9fa'
                                 }}>
                                {messages.length === 0 ? (
                                    <div className="text-center text-muted py-5">
                                        <i className="bi bi-inbox-fill" style={{ fontSize: '3rem' }}></i>
                                        <p className="mt-3">
                                            {consumerStatus.status === 'running' 
                                                ? 'No messages received yet. Waiting for incoming data...' 
                                                : 'Start the consumer to receive messages'}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="alert alert-info mb-3">
                                            Showing {messages.length} message(s)
                                        </div>
                                        {messages.map((message, index) => {
                                            // Try to parse the message value as JSON for prettier display
                                            let messageContent;
                                            let isJson = false;
                                            let timestamp = message.timestamp || new Date().toISOString();
                                            
                                            try {
                                                // If message.message is present, it's already parsed JSON
                                                if (message.message && typeof message.message === 'object') {
                                                    messageContent = message.message;
                                                    isJson = true;
                                                } 
                                                // If message.value exists, it might be a string that needs parsing
                                                else if (message.value) {
                                                    if (typeof message.value === 'string') {
                                                        try {
                                                            messageContent = JSON.parse(message.value);
                                                            isJson = true;
                                                        } catch (e) {
                                                            // If it's not valid JSON, display as string
                                                            messageContent = String(message.value);
                                                        }
                                                    } else {
                                                        messageContent = message.value;
                                                    }
                                                }
                                                // If neither exists, try to use the whole message
                                                else {
                                                    messageContent = message;
                                                }
                                            } catch (e) {
                                                // Display raw message as fallback
                                                messageContent = JSON.stringify(message);
                                            }

                                            return (
                                                <div className={`message-card mb-3 p-3 border rounded ${theme === 'dark' ? 'border-secondary' : ''}`} key={index}>
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <span className="badge bg-secondary">{message.topic || "Unknown Topic"}</span>
                                                        <small className={`${theme === 'dark' ? 'text-light-emphasis' : 'text-muted'}`}>
                                                            {timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString()}
                                                        </small>
                                                    </div>
                                                    {isJson ? (
                                                        <pre className={`message-content mb-0 ${theme === 'dark' ? 'bg-dark text-light' : 'bg-light'} p-2 rounded`} 
                                                             style={{ maxHeight: "300px", overflow: "auto" }}>
                                                            {typeof messageContent === 'object' 
                                                                ? JSON.stringify(messageContent, null, 2) 
                                                                : String(messageContent)}
                                                        </pre>
                                                    ) : (
                                                        <div className={`message-content ${theme === 'dark' ? 'bg-dark text-light' : 'bg-light'} p-2 rounded`}>
                                                            {messageContent}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                                <div ref={messagesEndRef} style={{ display: 'none' }} />
                            </div>
                            <div className="card-footer mt-auto border-top">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <span className="badge bg-primary me-2">
                                            {messages.length} message{messages.length !== 1 ? 's' : ''}
                                        </span>
                                        {consumerStatus.status === 'running' && (
                                            <span className={`small ${theme === 'dark' ? 'text-light-emphasis' : 'text-muted'}`}>Auto-refreshing every 2 seconds</span>
                                        )}
                                    </div>
                                    <div>
                                        <button 
                                            className="btn btn-sm btn-outline-primary me-2" 
                                            onClick={fetchMessages}
                                            disabled={consumerStatus.status !== 'running'}
                                        >
                                            <i className="bi bi-arrow-clockwise me-1"></i> Refresh Now
                                        </button>
                                        <button 
                                            className="btn btn-sm btn-outline-secondary" 
                                            onClick={() => setMessages([])}
                                            disabled={messages.length === 0}
                                        >
                                            Clear Messages
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
  
export default KafkaView;
