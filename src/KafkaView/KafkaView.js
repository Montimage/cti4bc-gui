import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import { useTheme } from '../ThemeContext';
import { useToast } from '../components/Toast';
import './KafkaView.css';

const SERVER_URL = process.env.REACT_APP_API_URL;
const FAVORITES_KEY = 'cti4bc.kafka.favoriteTopics';

const loadFavorites = () => {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter(t => typeof t === 'string') : [];
    } catch (e) {
        return [];
    }
};

const KafkaView = () => {
    const { showError, showSuccess } = useToast();
    const { theme } = useTheme();

    const [selectedTopics, setSelectedTopics] = useState([]);
    const [favorites, setFavorites] = useState(loadFavorites);
    const [topicInput, setTopicInput] = useState("");
    const [messageFilter, setMessageFilter] = useState("");

    const [response, setResponse] = useState(null);
    const [consumerStatus, setConsumerStatus] = useState({});
    const [kafkaCredentials, setKafkaCredentials] = useState({});
    const [messages, setMessages] = useState([]);
    const [isThemeChanging, setIsThemeChanging] = useState(false);
    // Backend message ids already shown. A ref (not state) so it survives across
    // polls without triggering renders, and so "Clear" can wipe the view without
    // the next poll re-adding everything.
    const seenIdsRef = useRef(new Set());

    const isRunning = consumerStatus.status === 'running';

    // Persist favorites whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        } catch (e) { /* ignore quota / private mode errors */ }
    }, [favorites]);

    // Handle theme change with temporary transition disable
    useEffect(() => {
        setIsThemeChanging(true);
        const timer = setTimeout(() => setIsThemeChanging(false), 50);
        return () => clearTimeout(timer);
    }, [theme]);

    // ---------------------------------------------------------------- data
    const fetchConsumerStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${SERVER_URL}/consumer/status/`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            setConsumerStatus(data);
        } catch (error) { /* silent: polled */ }
    }, []);

    const fetchKafkaCredentials = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${SERVER_URL}/consumer/env/`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            setKafkaCredentials(data.env_variables || {});
        } catch (error) { /* silent */ }
    }, []);

    const fetchMessages = useCallback(async () => {
        if (consumerStatus.status !== 'running') return;
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${SERVER_URL}/consumer/messages/`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();

            const incoming = data.messages || [];
            // Identify each entry by its backend id. Content is NOT a unique key:
            // two identical alerts are distinct messages, and the old content-based
            // dedup collapsed them so the 2nd never appeared. Fall back to a content
            // hash only for legacy payloads that predate the id field.
            const idOf = (m) => (m.id !== undefined && m.id !== null
                ? `#${m.id}`
                : JSON.stringify({ t: m.topic, ts: m.timestamp, v: m.value || m.message }));

            const fresh = incoming.filter(m => !seenIdsRef.current.has(idOf(m)));
            if (fresh.length === 0) return;                       // nothing new -> no re-render
            fresh.forEach(m => seenIdsRef.current.add(idOf(m)));
            // The API returns newest-first; append in chronological order. Stamp a
            // stable _uid (row key) and receive time ONCE so later renders don't
            // remount the row (that remount was the source of the flicker).
            const stamped = fresh
                .map(m => ({ ...m, _uid: idOf(m), _receivedAt: new Date().toISOString() }))
                .reverse();
            setMessages(prev => [...prev, ...stamped]);
        } catch (error) { /* silent: polled */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [consumerStatus.status]);

    useEffect(() => {
        fetchConsumerStatus();
        fetchKafkaCredentials();
        fetchMessages();
        const statusInterval = setInterval(fetchConsumerStatus, 5000);
        const messagesInterval = setInterval(fetchMessages, 2000);
        return () => {
            clearInterval(statusInterval);
            clearInterval(messagesInterval);
        };
    }, [fetchMessages, fetchConsumerStatus, fetchKafkaCredentials]);

    // ---------------------------------------------------------------- topics
    const addSelectedTopic = useCallback((raw) => {
        const topic = (raw || "").trim();
        if (!topic) return;
        setSelectedTopics(prev => (prev.includes(topic) ? prev : [...prev, topic]));
    }, []);

    const removeSelectedTopic = (topic) =>
        setSelectedTopics(prev => prev.filter(t => t !== topic));

    const addFavorite = (raw) => {
        const topic = (raw || "").trim();
        if (!topic) return;
        setFavorites(prev => (prev.includes(topic) ? prev : [...prev, topic].sort()));
    };

    const removeFavorite = (topic) =>
        setFavorites(prev => prev.filter(t => t !== topic));

    const toggleFavorite = (topic) =>
        (favorites.includes(topic) ? removeFavorite(topic) : addFavorite(topic));

    const handleAddFromInput = () => {
        addSelectedTopic(topicInput);
        setTopicInput("");
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddFromInput();
        }
    };

    const addAllFavorites = () => setSelectedTopics(prev => {
        const merged = [...prev];
        favorites.forEach(t => { if (!merged.includes(t)) merged.push(t); });
        return merged;
    });

    // ---------------------------------------------------------------- consumer
    const handleStart = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const topics = selectedTopics.map(t => t.trim()).filter(Boolean);
            const res = await fetch(`${SERVER_URL}/consumer/start/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ topics }),
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            setResponse(data);
            if (data.status && data.status.includes('started')) showSuccess(data.status);
            fetchConsumerStatus();
        } catch (error) {
            setResponse({ error: error.message });
            showError(error.message);
        }
    };

    const handleStop = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${SERVER_URL}/consumer/stop/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            setResponse(data);
            if (data.status && data.status.includes('stopped')) showSuccess(data.status);
            fetchConsumerStatus();
            // Backend clears its history on stop -> start a fresh view + id set.
            seenIdsRef.current = new Set();
            setMessages([]);
        } catch (error) {
            setResponse({ error: error.message });
            showError(error.message);
        }
    };

    // ---------------------------------------------------------------- messages view
    const visibleMessages = useMemo(() => {
        const q = messageFilter.trim().toLowerCase();
        if (!q) return messages;
        return messages.filter(m => {
            const topic = (m.topic || '').toLowerCase();
            let body = '';
            try { body = JSON.stringify(m.message ?? m.value ?? m).toLowerCase(); } catch (e) { body = ''; }
            return topic.includes(q) || body.includes(q);
        });
    }, [messages, messageFilter]);

    // ---------------------------------------------------------------- render
    return (
        <div className={`kafka-view container-fluid mt-4 ${isThemeChanging ? 'theme-changing' : ''}`}>
            <div className="mi-page-head">
                <div>
                    <h1>Kafka</h1>
                    <div className="mi-sub">Start a consumer on your topics and stream incoming security messages in real time.</div>
                </div>
                <div className="mi-page-head__actions">
                    <span className={`mi-badge ${isRunning ? 'mi-success' : 'mi-neutral'}`}>
                        <span className="mi-led"></span> Consumer {isRunning ? 'running' : 'stopped'}
                    </span>
                </div>
            </div>

            <div className="row kafka-main-row g-3">
                {/* ------------------------------------------- Control column */}
                <div className="col-lg-4">
                    <div className="mi-card">
                        <div className="mi-card__head">
                            <div className="mi-card__title">Consumer control</div>
                        </div>
                        <div className="mi-card__body">

                            {/* Connection */}
                            <div className="kfk-section">
                                <div className="kfk-label">Connection</div>
                                <div className="kfk-conn">
                                    <div><span className="kfk-conn__k">Server</span><span className="kfk-conn__v">{kafkaCredentials.KAFKA_SERVER || '—'}</span></div>
                                    <div><span className="kfk-conn__k">User</span><span className="kfk-conn__v">{kafkaCredentials.KAFKA_USERNAME || '—'}</span></div>
                                    <div><span className="kfk-conn__k">Password</span><span className="kfk-conn__v">{kafkaCredentials.KAFKA_PASSWORD || '—'}</span></div>
                                </div>
                                {isRunning && (
                                    <div className="kfk-active">
                                        <i className="bi bi-broadcast"></i>
                                        <span>Listening on <b>{consumerStatus.topics?.join(', ') || 'None'}</b></span>
                                    </div>
                                )}
                            </div>

                            {/* Add topic */}
                            <div className="kfk-section">
                                <div className="kfk-label">Add a topic</div>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. UC1.AWARE4BC.security_alerts"
                                        value={topicInput}
                                        onChange={(e) => setTopicInput(e.target.value)}
                                        onKeyDown={handleInputKeyDown}
                                    />
                                    <button
                                        className="btn btn-outline-secondary"
                                        type="button"
                                        title="Save as favourite"
                                        onClick={() => { addFavorite(topicInput); setTopicInput(""); }}
                                        disabled={!topicInput.trim() || favorites.includes(topicInput.trim())}
                                    >
                                        <i className="bi bi-star"></i>
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        type="button"
                                        onClick={handleAddFromInput}
                                        disabled={isRunning || !topicInput.trim()}
                                    >
                                        <i className="bi bi-plus-lg me-1"></i>Add
                                    </button>
                                </div>
                                <div className="kfk-hint">Press Enter to add · ★ saves it to favourites</div>
                            </div>

                            {/* Favourites */}
                            <div className="kfk-section">
                                <div className="kfk-label kfk-label--row">
                                    <span><i className="bi bi-star-fill me-1"></i>Favourites</span>
                                    {favorites.length > 0 && (
                                        <button
                                            className="kfk-linkbtn"
                                            onClick={addAllFavorites}
                                            disabled={isRunning}
                                        >
                                            Add all
                                        </button>
                                    )}
                                </div>
                                {favorites.length === 0 ? (
                                    <div className="kfk-empty-inline">
                                        No favourites yet — save topics you use often with the ★ button.
                                    </div>
                                ) : (
                                    <div className="kfk-chips">
                                        {favorites.map((topic) => (
                                            <div className="kfk-chip kfk-chip--fav" key={topic}>
                                                <button
                                                    className="kfk-chip__body"
                                                    title={isRunning ? 'Stop the consumer to edit topics' : 'Add to selection'}
                                                    onClick={() => addSelectedTopic(topic)}
                                                    disabled={isRunning || selectedTopics.includes(topic)}
                                                >
                                                    <i className="bi bi-star-fill"></i>
                                                    <span>{topic}</span>
                                                </button>
                                                <button
                                                    className="kfk-chip__x"
                                                    title="Remove favourite"
                                                    onClick={() => removeFavorite(topic)}
                                                >
                                                    <i className="bi bi-x-lg"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected topics */}
                            <div className="kfk-section">
                                <div className="kfk-label kfk-label--row">
                                    <span>Selected topics <span className="kfk-count">{selectedTopics.length}</span></span>
                                    {selectedTopics.length > 0 && (
                                        <button
                                            className="kfk-linkbtn"
                                            onClick={() => setSelectedTopics([])}
                                            disabled={isRunning}
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                {selectedTopics.length === 0 ? (
                                    <div className="kfk-empty-inline">
                                        Add at least one topic to start the consumer.
                                    </div>
                                ) : (
                                    <div className="kfk-chips">
                                        {selectedTopics.map((topic) => (
                                            <div className="kfk-chip kfk-chip--sel" key={topic}>
                                                <button
                                                    className={`kfk-chip__star ${favorites.includes(topic) ? 'is-fav' : ''}`}
                                                    title={favorites.includes(topic) ? 'Remove favourite' : 'Save as favourite'}
                                                    onClick={() => toggleFavorite(topic)}
                                                >
                                                    <i className={`bi ${favorites.includes(topic) ? 'bi-star-fill' : 'bi-star'}`}></i>
                                                </button>
                                                <span className="kfk-chip__label">{topic}</span>
                                                <button
                                                    className="kfk-chip__x"
                                                    title="Remove from selection"
                                                    onClick={() => removeSelectedTopic(topic)}
                                                    disabled={isRunning}
                                                >
                                                    <i className="bi bi-x-lg"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="d-flex gap-2 kfk-controls">
                                <button
                                    className="btn btn-primary flex-grow-1"
                                    onClick={handleStart}
                                    disabled={selectedTopics.length === 0 || isRunning}
                                >
                                    <i className="bi bi-play-fill me-1"></i>Start
                                </button>
                                <button
                                    className="btn btn-outline-danger flex-grow-1"
                                    onClick={handleStop}
                                    disabled={!isRunning}
                                >
                                    <i className="bi bi-stop-fill me-1"></i>Stop
                                </button>
                            </div>

                            {response && (
                                <div className={`kfk-response ${response.error ? 'is-error' : 'is-ok'}`}>
                                    <i className={`bi ${response.error ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'} me-1`}></i>
                                    {response.error || response.status}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ------------------------------------------- Messages column */}
                <div className="col-lg-8">
                    <div className="mi-card h-100 d-flex flex-column">
                        <div className="mi-card__head">
                            <div className="mi-card__title">Messages</div>
                            <div className="d-flex align-items-center gap-2">
                                <span className="mi-badge mi-neutral">
                                    {visibleMessages.length}{messageFilter.trim() ? ` / ${messages.length}` : ''} message{messages.length !== 1 ? 's' : ''}
                                </span>
                                {isRunning && (
                                    <span className="mi-badge mi-info"><span className="mi-led"></span> live</span>
                                )}
                            </div>
                        </div>

                        <div className="kfk-msg-toolbar">
                            <div className="kfk-search">
                                <i className="bi bi-funnel"></i>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Filter by topic or content…"
                                    value={messageFilter}
                                    onChange={(e) => setMessageFilter(e.target.value)}
                                />
                                {messageFilter && (
                                    <button className="kfk-search__clear" onClick={() => setMessageFilter("")} title="Clear filter">
                                        <i className="bi bi-x-lg"></i>
                                    </button>
                                )}
                            </div>
                            <div className="d-flex gap-2">
                                <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={fetchMessages}
                                    disabled={!isRunning}
                                    title="Refresh now"
                                >
                                    <i className="bi bi-arrow-clockwise"></i>
                                </button>
                                <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => setMessages([])}
                                    disabled={messages.length === 0}
                                    title="Clear messages"
                                >
                                    <i className="bi bi-trash3"></i>
                                </button>
                            </div>
                        </div>

                        <div className="kfk-msg-list">
                            {visibleMessages.length === 0 ? (
                                <div className="kfk-empty">
                                    <i className={`bi ${messageFilter.trim() ? 'bi-search' : 'bi-inbox'}`}></i>
                                    <p>
                                        {messageFilter.trim()
                                            ? 'No message matches your filter.'
                                            : isRunning
                                                ? 'Consumer running — waiting for incoming messages…'
                                                : 'Start the consumer to receive messages.'}
                                    </p>
                                </div>
                            ) : (
                                visibleMessages.map((message, index) => {
                                    let messageContent;
                                    const displayTime = message.timestamp || message._receivedAt;

                                    if (message.message && typeof message.message === 'object') {
                                        messageContent = message.message;
                                    } else if (message.value !== undefined) {
                                        if (typeof message.value === 'string') {
                                            try { messageContent = JSON.parse(message.value); }
                                            catch (e) { messageContent = String(message.value); }
                                        } else {
                                            messageContent = message.value;
                                        }
                                    } else {
                                        messageContent = message;
                                    }

                                    return (
                                        <div className="kfk-msg" key={message._uid || index}>
                                            <div className="kfk-msg__head">
                                                <span className="mi-badge mi-warning">{message.topic || 'Unknown topic'}</span>
                                                <span className="kfk-msg__time">
                                                    {displayTime ? new Date(displayTime).toLocaleString() : '—'}
                                                </span>
                                            </div>
                                            <pre className="kfk-msg__body">
                                                {typeof messageContent === 'object'
                                                    ? JSON.stringify(messageContent, null, 2)
                                                    : String(messageContent)}
                                            </pre>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KafkaView;
