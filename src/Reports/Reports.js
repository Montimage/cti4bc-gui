import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Alert, Form, Spinner, Modal, Badge, Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import './Reports.css';

const SERVER_URL = process.env.REACT_APP_API_URL;

// Escape user/LLM/event-provided strings before injecting them into downloaded HTML,
// so hostile content (e.g. an event ingested from MISP/Kafka containing markup) cannot
// execute when the exported HTML file is opened.
const escapeHtml = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

// Safely parse a fetch Response as JSON. Backends may return non-JSON bodies on error
// (500 HTML pages, 502/503 from a proxy); parsing those with response.json() throws a
// SyntaxError that would crash the component. Returns {} when the body is not JSON.
const safeJson = async (response) => {
    try {
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    } catch (error) {
        return {};
    }
};

const Reports = () => {
    const navigate = useNavigate();
    const { showSuccess, showError, showWarning, showInfo } = useToast();
    
    const [events, setEvents] = useState([]);
    const [reports, setReports] = useState([]);
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [prompt, setPrompt] = useState('');
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEventsModal, setShowEventsModal] = useState(false);
    const [selectedReportEvents, setSelectedReportEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReportForDeletion, setSelectedReportForDeletion] = useState(null);
    const [showLLMSettingsModal, setShowLLMSettingsModal] = useState(false);
    const [llmProviders, setLlmProviders] = useState([]);
    const [currentProvider, setCurrentProvider] = useState('');
    const [loadingLLM, setLoadingLLM] = useState(false);
    const [availableModels, setAvailableModels] = useState([]);
    const [currentModel, setCurrentModel] = useState('');
    const [selectedProvider, setSelectedProvider] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [savingConfig, setSavingConfig] = useState(false);
    const [showLLMInfoModal, setShowLLMInfoModal] = useState(false);
    const [selectedReportForLLMInfo, setSelectedReportForLLMInfo] = useState(null);
    const [loadingLLMInfo, setLoadingLLMInfo] = useState(false);

    // Function to get JWT token
    const getAuthToken = () => {
        return localStorage.getItem('accessToken') || 
               sessionStorage.getItem('accessToken') || 
               localStorage.getItem('authToken') || 
               sessionStorage.getItem('authToken');
    };

    // Headers with authentication (omit the Authorization header entirely when there is
    // no token, rather than sending an empty "Authorization: " which some servers treat
    // differently from an absent header).
    const getAuthHeaders = () => {
        const token = getAuthToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    };

    // Load events and reports on component mount
    useEffect(() => {
        loadEvents();
        loadReports();
        loadLLMProviders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Poll while any report is still being generated so the table transitions from
    // 'pending'/'generating' to 'completed'/'failed' without a manual refresh. The
    // interval starts when a report becomes active and is cleared once none remain.
    const hasActiveReports = reports.some(
        r => r.status === 'pending' || r.status === 'generating'
    );
    useEffect(() => {
        if (!hasActiveReports) return undefined;
        const interval = setInterval(() => {
            loadReports();
        }, 4000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasActiveReports]);

    // Function to load LLM providers
    const loadLLMProviders = async () => {
        try {
            // Add timestamp to URL to prevent caching
            const timestamp = new Date().getTime();
            const response = await fetch(`${SERVER_URL}/reports/llm/?t=${timestamp}`, {
                headers: getAuthHeaders()
            });

            
            if (response.ok) {
                const data = await safeJson(response);
                console.log('✅ LLM Providers loaded:', data);

                setLlmProviders(data.available_providers || ['gemini', 'ollama']);
                setCurrentProvider(data.current_provider || '');
                setSelectedProvider(data.current_provider || '');


                // Get current provider status for models info
                const providerStatus = data.current_provider_status || {};
                setAvailableModels(providerStatus.available_models || []);
                setCurrentModel(providerStatus.current_model || '');
                setSelectedModel(providerStatus.current_model || '');

                // Force reload models for current provider to get the latest list
                if (data.current_provider) {
                    loadModelsForProvider(data.current_provider, true);
                }

            } else {
                console.error('❌ API request failed:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                // Fallback to default providers if API fails
                setLlmProviders(['gemini', 'ollama']);
            }
        } catch (error) {
            console.error('Error loading LLM providers:', error);
            // Fallback to default providers if request fails
            setLlmProviders(['gemini', 'ollama']);
        }
    };

    // Function to load models for a specific provider.
    // `isActiveProvider` is passed explicitly by the caller instead of comparing against
    // the `currentProvider` state, which may be stale inside this async closure (race
    // condition when the user switches providers quickly).
    const loadModelsForProvider = async (provider, isActiveProvider = false) => {
        try {
            // Add timestamp to URL to prevent caching
            const timestamp = new Date().getTime();
            const response = await fetch(`${SERVER_URL}/reports/llm/models/?provider=${provider}&t=${timestamp}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await safeJson(response);
                const models = Array.isArray(data.available_models) ? data.available_models : [];
                setAvailableModels(models);
                if (isActiveProvider) {
                    setCurrentModel(data.current_model || '');
                    setSelectedModel(data.current_model || '');
                } else {
                    setSelectedModel(models[0] || '');
                }
            }
        } catch (error) {
            console.error('Error loading models:', error);
            setAvailableModels([]);
        }
    };

    // Function to save LLM configuration
    const saveLLMConfiguration = async () => {
        setSavingConfig(true);
        try {
            const payload = {
                provider: selectedProvider
            };
            
            if (selectedProvider === 'ollama' && selectedModel) {
                payload.model = selectedModel;
            }

            const response = await fetch(`${SERVER_URL}/reports/llm/`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await safeJson(response);
                showSuccess(`Configuration updated: ${data.message || 'success'}`);

                // Update current configuration immediately
                setCurrentProvider(selectedProvider);
                setCurrentModel(selectedModel);

                // Petit délai pour s'assurer que le backend a fini de traiter
                await new Promise(resolve => setTimeout(resolve, 100));

                // Forcer un rechargement complet de la configuration depuis le serveur
                await loadLLMProviders();

                // Fermer le modal après la mise à jour réussie
                setShowLLMSettingsModal(false);
            } else {
                const errorData = await safeJson(response);
                showError(errorData.error || 'Failed to update configuration');
            }
        } catch (error) {
            console.error('Error saving configuration:', error);
            showError('Connection error while saving configuration');
        } finally {
            setSavingConfig(false);
        }
    };

    const loadEvents = async () => {
        try {
            const response = await fetch(`${SERVER_URL}/event/`, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await safeJson(response);
                const eventsArray = Array.isArray(data) ? data : data.events || [];
                setEvents(eventsArray);
            } else {
                console.error('Error loading events:', response.status);
                showError('Error loading events');
            }
        } catch (error) {
            console.error('Error:', error);
            showError('Connection error');
        } finally {
            setLoadingEvents(false);
        }
    };

    const loadReports = async () => {
        try {
            const response = await fetch(`${SERVER_URL}/reports/`, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await safeJson(response);
                setReports(data.reports || []);
            } else {
                console.error('Error loading reports:', response.status);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleEventSelection = (eventId) => {
        setSelectedEvents(prev => {
            if (prev.includes(eventId)) {
                return prev.filter(id => id !== eventId);
            } else {
                return [...prev, eventId];
            }
        });
    };

    const generateReport = async () => {
        if (!title.trim() || !prompt.trim()) {
            showWarning('Please fill in title and prompt');
            return;
        }

        try {
            setLoading(true);

            // Generation now runs asynchronously on the backend worker: this POST returns
            // immediately (HTTP 202) with a report in the 'pending' state. We reset the form
            // and let the polling effect refresh the list until generation completes.
            const response = await fetch(`${SERVER_URL}/reports/`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    title,
                    prompt,
                    events: selectedEvents
                })
            });

            if (response.ok) {
                showInfo('Report queued — generating in the background…');
                setTitle('');
                setPrompt('');
                setSelectedEvents([]);
                setShowCreateModal(false);
                loadReports();
            } else {
                const errorData = await safeJson(response);
                showError(errorData.error || 'Error generating report');
            }
        } catch (error) {
            console.error('💥 Exception during report generation:', error);
            showError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    // Predefined prompts for quick access
    const predefinedPrompts = {
        summary: {
            title: "Security Incident Summary",
            prompt: "Provide a comprehensive summary of this security incident including: key details, timeline, affected systems, potential impact, and immediate next steps for incident response."
        },
        threat_analysis: {
            title: "Threat Intelligence Analysis", 
            prompt: "Perform a detailed threat intelligence analysis of this incident including: threat actor attribution, tactics/techniques/procedures (TTPs), indicators of compromise (IoCs), similar attack patterns, and recommended defensive measures."
        },
        forensic_analysis: {
            title: "Digital Forensics Report",
            prompt: "Conduct a digital forensics analysis of this incident focusing on: attack vectors, persistence mechanisms, data exfiltration evidence, timeline reconstruction, and forensic artifacts that can be used for attribution."
        },
        remediation_plan: {
            title: "Incident Remediation Plan",
            prompt: "Create a detailed remediation and recovery plan for this incident including: immediate containment steps, eradication procedures, system recovery processes, and long-term security improvements to prevent similar incidents."
        }
    };

    const setPromptTemplate = (templateKey) => {
        const template = predefinedPrompts[templateKey];
        if (template) {
            setTitle(template.title);
            setPrompt(template.prompt);
            showInfo(`Template "${template.title}" loaded`);
        }
    };

    const deleteReport = async (reportId) => {
        try {
            const response = await fetch(`${SERVER_URL}/reports/${reportId}/`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                showSuccess('Report deleted successfully');
                loadReports();
                setSelectedReportForDeletion(null);
            } else {
                showError('Error deleting report');
            }
        } catch (error) {
            console.error('Error:', error);
            showError('Connection error');
        }
    };

    const filteredReports = reports.filter(report => 
        (report.title && typeof report.title === 'string' && report.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (report.content && typeof report.content === 'string' && report.content.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getReportStats = () => {
        return {
            total: reports.length,
            recent: reports.filter(r => {
                const createdDate = new Date(r.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return createdDate > weekAgo;
            }).length,
            withEvents: reports.filter(r => (r.events_count || 0) > 0).length
        };
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No date';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid date';
        }
    };

    const handleCreateReport = () => {
        setShowCreateModal(true);
    };

    const handleViewReport = (report) => {
        setSelectedReport(report);
        setShowViewModal(true);
    };

    const handleShowEvents = async (report) => {
        if (report.events && report.events.length > 0) {
            // If we already have the events, display them directly
            setSelectedReportEvents(report.events);
            setShowEventsModal(true);
        } else {
            // Otherwise, fetch the report details
            try {
                const response = await fetch(`${SERVER_URL}/reports/${report.id}/`, {
                    headers: getAuthHeaders()
                });
                
                if (response.ok) {
                    const reportData = await safeJson(response);
                    setSelectedReportEvents(reportData.events || []);
                    setShowEventsModal(true);
                } else {
                    showError('Error loading report events');
                }
            } catch (error) {
                console.error('Error:', error);
                showError('Connection error');
            }
        }
    };

    // Function to show LLM information modal
    const handleShowLLMInfo = async (report) => {
        setLoadingLLMInfo(true);
        try {
            // Fetch complete report details to get the prompt
            const response = await fetch(`${SERVER_URL}/reports/${report.id}/`, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const reportData = await safeJson(response);
                setSelectedReportForLLMInfo(reportData);
                setShowLLMInfoModal(true);
            } else {
                showError('Error loading report details');
            }
        } catch (error) {
            console.error('Error:', error);
            showError('Connection error');
        } finally {
            setLoadingLLMInfo(false);
        }
    };

    // Function to navigate to event details
    const handleViewEvent = (eventId) => {
        if (!eventId) {
            showError('Invalid event ID');
            return;
        }
        navigate(`/event/${eventId}`);
        closeModals(); // Close the modal after navigation
    };

    const closeModals = () => {
        setShowCreateModal(false);
        setShowViewModal(false);
        setShowEventsModal(false);
        setShowLLMSettingsModal(false);
        setShowLLMInfoModal(false);
        setSelectedReport(null);
        setSelectedReportForDeletion(null);
        setSelectedReportEvents([]);
        setSelectedReportForLLMInfo(null);
        setPrompt('');
        setTitle('');
        setSelectedEvents([]);
        setLoadingLLMInfo(false);
        // Reset LLM form state
        setSelectedProvider(currentProvider);
        setSelectedModel(currentModel);
    };

    const handleLLMSettings = () => {
        setShowLLMSettingsModal(true);
        loadLLMProviders(); // Always refresh data when opening
    };

    const handleProviderChange = (provider) => {
        setSelectedProvider(provider);
        if (provider !== currentProvider) {
            loadModelsForProvider(provider);
        }
    };

    const handleModelChange = (model) => {
        setSelectedModel(model);
    };

    // Render the generation status badge for a report row.
    const renderStatusBadge = (report) => {
        const status = report.status || 'completed';
        const map = {
            completed: { cls: 'mi-success', label: 'Completed' },
            pending: { cls: 'mi-info', label: 'Pending' },
            generating: { cls: 'mi-info', label: 'Generating' },
            failed: { cls: 'mi-danger', label: 'Failed' },
        };
        const cfg = map[status] || map.completed;
        const inProgress = status === 'pending' || status === 'generating';
        return (
            <span
                className={`mi-badge ${cfg.cls}`}
                title={status === 'failed' ? (report.error_message || 'Generation failed') : undefined}
            >
                {inProgress
                    ? <i className="bi bi-arrow-clockwise mi-spin" style={{ marginRight: 4 }}></i>
                    : <span className="mi-led"></span>}
                {' '}{cfg.label}
            </span>
        );
    };

    const stats = getReportStats();

    // Enhanced download functions that fetch complete report data including events
    const fetchCompleteReportData = async (report) => {
        try {
            const response = await fetch(`${SERVER_URL}/reports/${report.id}/`, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                return await safeJson(response);
            } else {
                showError('Error loading complete report data');
                return report; // fallback to original report
            }
        } catch (error) {
            console.error('Error fetching complete report:', error);
            showError('Connection error while fetching report data');
            return report; // fallback to original report
        }
    };

    const downloadReportAsHTML = async (report) => {
        const completeReport = await fetchCompleteReportData(report);
        const events = completeReport.events || [];
        
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(completeReport.title || 'Security Report')}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2, h3 { color: #34495e; }
        .metadata { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .content { margin: 20px 0; }
        .events { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .event-item { margin: 10px 0; padding: 10px; background: #f0f8f0; border-left: 4px solid #28a745; }
    </style>
</head>
<body>
    <h1>${escapeHtml(completeReport.title || 'Security Report')}</h1>
    <div class="metadata">
        <strong>Created:</strong> ${escapeHtml(new Date(completeReport.created_at).toLocaleString())}<br>
        <strong>Generation Time:</strong> ${completeReport.generation_time ? completeReport.generation_time.toFixed(2) + 's' : 'N/A'}<br>
        <strong>Events Count:</strong> ${events.length}
    </div>
    <div class="content">
        ${formatContentForHTML(completeReport.content)}
    </div>
    ${events.length > 0 ? `
    <div class="events">
        <h3>Associated Events</h3>
        ${events.map(event => `
            <div class="event-item">
                <strong>${escapeHtml(event.title || 'Untitled Event')}</strong><br>
                <small><strong>Description:</strong> ${escapeHtml(event.description || 'No description')}</small><br>
                ${event.source_ip ? `<small><strong>Source IP:</strong> ${escapeHtml(event.source_ip)}</small><br>` : ''}
                ${event.destination_ip ? `<small><strong>Destination IP:</strong> ${escapeHtml(event.destination_ip)}</small><br>` : ''}
                ${event.created_at ? `<small><strong>Date:</strong> ${escapeHtml(new Date(event.created_at).toLocaleString())}</small>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}
</body>
</html>`;
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${completeReport.title || 'report'}_${completeReport.id}.html`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const downloadReportAsText = async (report) => {
        const completeReport = await fetchCompleteReportData(report);
        const events = completeReport.events || [];
        
        const textContent = `
SECURITY REPORT
===============

Title: ${completeReport.title || 'Security Report'}
Created: ${new Date(completeReport.created_at).toLocaleString()}
Generation Time: ${completeReport.generation_time ? completeReport.generation_time.toFixed(2) + 's' : 'N/A'}
Events Count: ${events.length}

CONTENT
-------
${completeReport.content || 'No content available'}

${events.length > 0 ? `
ASSOCIATED EVENTS
-----------------
${events.map((event, index) => `
${index + 1}. Event: ${event.title || 'Untitled Event'}
   Description: ${event.description || 'No description'}
   ${event.source_ip ? `Source IP: ${event.source_ip}` : ''}
   ${event.destination_ip ? `Destination IP: ${event.destination_ip}` : ''}
   ${event.created_at ? `Date: ${new Date(event.created_at).toLocaleString()}` : ''}
`).join('')}
` : 'No events associated with this report.'}
`;
        
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${completeReport.title || 'report'}_${completeReport.id}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const downloadReportAsJSON = async (report) => {
        const completeReport = await fetchCompleteReportData(report);
        const events = completeReport.events || [];
        
        const jsonContent = {
            id: completeReport.id,
            title: completeReport.title,
            content: completeReport.content,
            created_at: completeReport.created_at,
            generation_time: completeReport.generation_time,
            events: events.map(event => ({
                id: event.id,
                title: event.title,
                description: event.description,
                source_ip: event.source_ip,
                destination_ip: event.destination_ip,
                created_at: event.created_at,
                ...event // include any other event properties
            })),
            metadata: {
                events_count: events.length,
                exported_at: new Date().toISOString(),
                format: 'JSON',
                export_version: '1.0'
            }
        };
        
        const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${completeReport.title || 'report'}_${completeReport.id}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Helper function to convert markdown-like content to HTML.
    // The content is HTML-escaped FIRST so any markup embedded in the LLM output cannot
    // execute in the exported file; only our own generated tags below are real HTML.
    const formatContentForHTML = (content) => {
        if (!content) return 'No content available';

        return escapeHtml(content)
            // Convert markdown headers
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // Convert bold text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Convert bullet points
            .replace(/^\* (.*$)/gm, '<li>$1</li>')
            // Convert line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            // Wrap in paragraphs
            .replace(/^(.)/gm, '<p>$1')
            .replace(/(.)$/gm, '$1</p>')
            // Clean up list items
            .replace(/<p><li>/g, '<li>')
            .replace(/<\/li><\/p>/g, '</li>')
            // Wrap lists
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            // Clean up multiple paragraphs
            .replace(/<\/p><p>/g, '</p>\n<p>');
    };

    return (
        <div className="mi-reports">
                            <div className="mi-page-head">
                                <div>
                                    <h1>Security Reports</h1>
                                    <div className="mi-sub">Generate and manage AI-powered security analysis reports.</div>
                                </div>
                                <div className="mi-page-head__actions">
                                    <Button
                                        variant="outline-primary"
                                        onClick={handleLLMSettings}
                                        disabled={loading}
                                        title="LLM Settings"
                                    >
                                        <i className="bi bi-gear me-2"></i>
                                        LLM Settings
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleCreateReport}
                                        disabled={loading}
                                    >
                                        <i className="bi bi-plus-lg me-2"></i>
                                        New Report
                                    </Button>
                                </div>
                            </div>

                        {/* Stats Cards */}
                        <div className="mi-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            <div className="mi-stat">
                                <div className="mi-stat__label">Total Reports</div>
                                <div className="mi-stat__value">{stats.total}</div>
                                <div className="mi-stat__delta">all generated reports</div>
                            </div>
                            <div className="mi-stat">
                                <div className="mi-stat__label">Current LLM &amp; Model</div>
                                <div className="mi-stat__value">
                                    {currentProvider ? currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1) : 'No LLM'}
                                    {loadingLLM && (
                                        <Spinner animation="border" size="sm" className="ms-2" />
                                    )}
                                </div>
                                <div className="mi-stat__row">
                                    <span className="mi-help">
                                        <i className={`bi ${currentProvider === 'ollama' ? 'bi-hdd-network' : 'bi-cloud'} me-1`}></i>
                                        {currentProvider === 'gemini' ? 'Gemini 1.5 Flash' : (currentModel || 'No model selected')}
                                    </span>
                                    <button
                                        type="button"
                                        className="mi-icon-btn"
                                        style={{ width: 30, height: 30, fontSize: '.9rem' }}
                                        onClick={loadLLMProviders}
                                        disabled={loadingLLM}
                                        title="Refresh LLM Configuration"
                                    >
                                        <i className={`bi bi-arrow-clockwise ${loadingLLM ? 'mi-spin' : ''}`}></i>
                                    </button>
                                </div>
                            </div>
                            <div className="mi-stat">
                                <div className="mi-stat__label">Most Used LLM</div>
                                <div className="mi-stat__value">
                                    <span className="mi-accent">
                                        {reports.filter(r => r.llm_provider === 'ollama').length >
                                         reports.filter(r => r.llm_provider !== 'ollama').length
                                         ? 'Ollama' : 'Gemini'}
                                    </span>
                                </div>
                                <div className="mi-stat__delta">across all reports</div>
                            </div>
                        </div>

                        {/* Search and Filter */}
                        <div className="mi-toolbar">
                            <div className="mi-field" style={{ flex: '1 1 260px' }}>
                                <label>Search</label>
                                <div className="mi-search">
                                    <i className="bi bi-search"></i>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search reports by title or content..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="mi-toolbar__spacer"></div>
                            <span className="mi-help">
                                Showing {filteredReports.length} of {reports.length} reports
                            </span>
                        </div>

                        {/* Reports Table */}
                        <div className="mi-card">
                            <div className="mi-card__head">
                                <div className="mi-card__title">
                                    <i className="bi bi-card-list me-2"></i>
                                    Reports Management
                                    {reports.length > 0 && <span className="mi-chip" style={{ marginLeft: 8 }}>{reports.length}</span>}
                                </div>
                            </div>
                            {reports.length === 0 ? (
                                <div className="mi-card__body text-center py-5">
                                    <h5>No Reports Found</h5>
                                    <p className="mi-help">Create your first security report to get started.</p>
                                    <Button variant="primary" onClick={handleCreateReport}>
                                        <i className="bi bi-plus-lg me-2"></i>
                                        Create Your First Report
                                    </Button>
                                </div>
                            ) : (
                                <div className="mi-table-wrap">
                                    <table className="mi-tbl">
                                        <thead>
                                            <tr>
                                                <th>Report Title</th>
                                                <th style={{ textAlign: 'center' }}>Events</th>
                                                <th style={{ textAlign: 'center' }}>LLM Model</th>
                                                <th className="mi-sortable" style={{ textAlign: 'center' }}>Generated <i className="bi bi-caret-down-fill" style={{ fontSize: '.7rem' }}></i></th>
                                                <th style={{ textAlign: 'center' }}>Status</th>
                                                <th style={{ textAlign: 'center' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredReports.map(report => (
                                                <tr key={report.id}>
                                                    <td>
                                                        <div className="mi-ev-title">{report.title || 'Untitled Report'}</div>
                                                        {report.prompt && (
                                                            <div className="mi-ev-sub" style={{ maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {report.prompt}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span
                                                            className="mi-badge mi-info"
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => handleShowEvents(report)}
                                                            title="Click to view events"
                                                        >
                                                            <span className="mi-led"></span> {report.events_count || 0}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span
                                                            className={`mi-llm-chip ${report.llm_provider === 'ollama' ? 'ollama' : 'gemini'}`}
                                                            onClick={() => handleShowLLMInfo(report)}
                                                            title="Click to view LLM details"
                                                        >
                                                            <i className={`bi ${report.llm_provider === 'ollama' ? 'bi-hdd-network' : 'bi-cloud'}`}></i>
                                                            {report.llm_provider === 'ollama' ? 'Ollama' : 'Gemini'}
                                                        </span>
                                                        {report.llm_model && (
                                                            <span className="mi-llm-model">{report.llm_model}</span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {formatDate(report.created_at)}
                                                        {report.generation_time && (
                                                            <span className="mi-llm-model">
                                                                {report.generation_time < 60
                                                                    ? `${Math.round(report.generation_time)}s`
                                                                    : `${Math.round(report.generation_time / 60)}m`
                                                                }
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {renderStatusBadge(report)}
                                                        {report.status === 'completed' && report.content && (
                                                            <span className="mi-llm-model">
                                                                {(report.content.length / 1024).toFixed(1)} KB
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div className="mi-cell-actions">
                                                            <button
                                                                type="button"
                                                                className="mi-icon-btn"
                                                                onClick={() => handleViewReport(report)}
                                                                title="View Report"
                                                            >
                                                                <i className="bi bi-eye"></i>
                                                            </button>

                                                            {/* Download Dropdown (icon-btn styled) */}
                                                            <Dropdown className="mi-dl">
                                                                <Dropdown.Toggle
                                                                    as="button"
                                                                    type="button"
                                                                    bsPrefix="mi-dl-toggle"
                                                                    className="mi-icon-btn"
                                                                    title="Download Report"
                                                                >
                                                                    <i className="bi bi-download"></i>
                                                                </Dropdown.Toggle>
                                                                <Dropdown.Menu>
                                                                    <Dropdown.Item onClick={() => downloadReportAsHTML(report)}>
                                                                        <i className="bi bi-filetype-html me-2"></i>HTML
                                                                    </Dropdown.Item>
                                                                    <Dropdown.Item onClick={() => downloadReportAsText(report)}>
                                                                        <i className="bi bi-file-text me-2"></i>Text
                                                                    </Dropdown.Item>
                                                                    <Dropdown.Item onClick={() => downloadReportAsJSON(report)}>
                                                                        <i className="bi bi-filetype-json me-2"></i>JSON
                                                                    </Dropdown.Item>
                                                                </Dropdown.Menu>
                                                            </Dropdown>

                                                            <button
                                                                type="button"
                                                                className="mi-icon-btn mi-icon-btn--danger"
                                                                onClick={() => setSelectedReportForDeletion(report)}
                                                                title="Delete Report"
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Create Report Modal */}
                        <Modal show={showCreateModal} onHide={closeModals} size="lg" dialogClassName="mi-modal-lg">
                            <Modal.Header closeButton>
                                <Modal.Title>
                                    <i className="bi bi-stars me-2"></i>
                                    Create New Security Report
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                {/* LLM Provider Indicator */}
                                {currentProvider && (
                                    <div className="mi-provider-banner mb-3">
                                        <i className={`bi ${currentProvider === 'ollama' ? 'bi-hdd-network' : 'bi-cloud'} lead-icon`}></i>
                                        <strong>AI Provider:</strong>
                                        <span className={`mi-badge ${currentProvider === 'ollama' ? 'mi-warning' : 'mi-info'}`}>
                                            <span className="mi-led"></span>
                                            {currentProvider === 'ollama' ? 'Ollama (Local)' : 'Gemini (Cloud)'}
                                        </span>
                                        <span className="mi-provider-banner__spacer"></span>
                                        <button
                                            type="button"
                                            className="mi-provider-banner__link"
                                            onClick={handleLLMSettings}
                                        >
                                            <i className="bi bi-gear me-1"></i>
                                            Change Provider
                                        </button>
                                    </div>
                                )}
                                
                                <div className="mi-form-row">
                                    <label>Report Title <span className="mi-req">*</span></label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter a descriptive title for your report"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>

                                <div className="mi-form-row">
                                    <label>Analysis Prompt <span className="mi-req">*</span></label>
                                    <Form.Control
                                        as="textarea"
                                        placeholder="Describe what kind of analysis you want the AI to perform"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                    />
                                </div>

                                <div className="mi-form-row">
                                    <label>Quick Templates</label>
                                    <div className="mi-tpl-grid">
                                        {Object.entries(predefinedPrompts).map(([key, template]) => {
                                            const icons = { summary: 'bi-file-text', threat_analysis: 'bi-shield-check', forensic_analysis: 'bi-search', remediation_plan: 'bi-wrench-adjustable' };
                                            return (
                                                <button key={key} type="button" className="mi-tpl" onClick={() => setPromptTemplate(key)}>
                                                    <i className={`bi ${icons[key] || 'bi-file-earmark-text'}`}></i>
                                                    {template.title}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mi-form-row">
                                    <label>Select Events to Analyze</label>
                                    {loadingEvents ? (
                                        <div className="text-center p-3">
                                            <Spinner animation="border" size="sm" />
                                            <span className="ms-2">Loading events...</span>
                                        </div>
                                    ) : events.length === 0 ? (
                                        <div className="mi-note"><i className="bi bi-info-circle"></i><span>No events available for analysis</span></div>
                                    ) : (
                                        <div className="mi-ev-picker">
                                            {events.map(event => (
                                                <label key={event.id} className="mi-ev-opt">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEvents.includes(event.id)}
                                                        onChange={() => handleEventSelection(event.id)}
                                                    />
                                                    <span>
                                                        {event.info || event.title || `Event ${event.id}`}
                                                        <span className="mi-ev-meta"> · #{event.id}</span>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="light" onClick={closeModals}>
                                    Cancel
                                </Button>
                                <Button 
                                    variant="primary" 
                                    onClick={generateReport}
                                    disabled={loading || !title.trim() || !prompt.trim()}
                                >
                                    {loading ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Generating Report...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-stars me-2"></i>
                                            Generate Report
                                        </>
                                    )}
                                </Button>
                            </Modal.Footer>
                        </Modal>

                        {/* View Report Modal */}
                        <Modal show={showViewModal} onHide={closeModals} size="xl">
                            <Modal.Header closeButton>
                                <Modal.Title>
                                    {selectedReport?.title || 'Untitled Report'}
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                {selectedReport && (
                                    <div>
                                        <div className="mb-4 p-3 bg-light rounded">
                                            <Row>
                                                <Col md={6}>
                                                    <small className="text-muted">
                                                        <i className="bi bi-calendar3 me-1"></i>
                                                        Created: {formatDate(selectedReport.created_at)}
                                                    </small>
                                                </Col>
                                                <Col md={6} className="text-end">
                                                    {selectedReport.events && selectedReport.events.length > 0 && (
                                                        <Badge 
                                                            bg="info"
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => handleShowEvents(selectedReport)}
                                                            title="Click to view events"
                                                        >
                                                            <i className="bi bi-link-45deg me-1"></i>
                                                            {selectedReport.events.length} events analyzed
                                                        </Badge>
                                                    )}
                                                </Col>
                                            </Row>
                                        </div>
                                        {selectedReport.status === 'failed' ? (
                                            <Alert variant="danger">
                                                <i className="bi bi-exclamation-triangle me-2"></i>
                                                <strong>Generation failed.</strong>
                                                <div className="mt-1 small">{selectedReport.error_message || 'Unknown error'}</div>
                                            </Alert>
                                        ) : (selectedReport.status === 'pending' || selectedReport.status === 'generating') ? (
                                            <Alert variant="info">
                                                <Spinner animation="border" size="sm" className="me-2" />
                                                Report is still being generated…
                                            </Alert>
                                        ) : (
                                            <div className="report-content">
                                                {selectedReport.content || 'No content available'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Modal.Body>
                            <Modal.Footer>
                                <div className="d-flex justify-content-between w-100">
                                    <div className="btn-group">
                                        <Button 
                                            variant="outline-success"
                                            onClick={() => downloadReportAsHTML(selectedReport)}
                                            title="Download as HTML"
                                        >
                                            <i className="bi bi-filetype-html me-1"></i>HTML
                                        </Button>
                                        <Button 
                                            variant="outline-success"
                                            onClick={() => downloadReportAsText(selectedReport)}
                                            title="Download as Text"
                                        >
                                            <i className="bi bi-file-text me-1"></i>TXT
                                        </Button>
                                        <Button 
                                            variant="outline-success"
                                            onClick={() => downloadReportAsJSON(selectedReport)}
                                            title="Download as JSON"
                                        >
                                            <i className="bi bi-filetype-json me-1"></i>JSON
                                        </Button>
                                    </div>
                                    <Button variant="light" onClick={closeModals}>
                                        Close
                                    </Button>
                                </div>
                            </Modal.Footer>
                        </Modal>

                        {/* Delete Confirmation Modal */}
                        <Modal show={!!selectedReportForDeletion} onHide={closeModals}>
                            <Modal.Header closeButton>
                                <Modal.Title>
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    Confirm Deletion
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <div className="text-center">
                                    <i className="bi bi-trash mi-icon-3x text-danger mb-3"></i>
                                    <p>Are you sure you want to delete the report:</p>
                                    <p><strong>"{selectedReportForDeletion?.title}"</strong></p>
                                    <Alert variant="warning">
                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                        This action cannot be undone.
                                    </Alert>
                                </div>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="light" onClick={closeModals}>
                                    Cancel
                                </Button>
                                <Button 
                                    variant="danger" 
                                    onClick={() => deleteReport(selectedReportForDeletion.id)}
                                >
                                    <i className="bi bi-trash me-2"></i>
                                    Delete Report
                                </Button>
                            </Modal.Footer>
                        </Modal>

                        {/* Events Modal */}
                        <Modal show={showEventsModal} onHide={closeModals} size="lg">
                            <Modal.Header closeButton>
                                <Modal.Title>
                                    <i className="bi bi-card-list me-2"></i>
                                    Report Events ({selectedReportEvents.length})
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                {selectedReportEvents.length > 0 ? (
                                    <div>
                                        <p className="text-muted mb-3">
                                            Events analyzed in this report:
                                        </p>
                                        <div className="list-group">
                                            {selectedReportEvents.map((event, index) => (
                                                <div key={event.id || index} className="list-group-item">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div className="flex-grow-1">
                                                            <h6 className="mb-1 text-primary">
                                                                {event.info || event.title || `Event ${event.id}`}
                                                            </h6>
                                                            <p className="mb-1 small text-muted">
                                                                Event ID: {event.id}
                                                            </p>
                                                            {(event.source_ip || event.destination_ip) && (
                                                                <div className="mb-2 small">
                                                                    {event.source_ip && (
                                                                        <span className="me-3">
                                                                            <i className="bi bi-arrow-right me-1 text-muted"></i>
                                                                            <strong>Source:</strong> {event.source_ip}
                                                                        </span>
                                                                    )}
                                                                    {event.destination_ip && (
                                                                        <span>
                                                                            <i className="bi bi-bullseye me-1 text-muted"></i>
                                                                            <strong>Destination:</strong> {event.destination_ip}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="d-flex gap-2 mt-2">
                                                                <Badge bg="secondary" className="small">
                                                                    ID: {event.id}
                                                                </Badge>
                                                                {event.organization && (
                                                                    <Badge bg="info" className="small">
                                                                        {event.organization}
                                                                    </Badge>
                                                                )}
                                                                {event.severity && (
                                                                    <Badge 
                                                                        bg={event.severity === 'high' ? 'danger' : 
                                                                            event.severity === 'medium' ? 'warning' : 'success'} 
                                                                        className="small"
                                                                    >
                                                                        {event.severity}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-end ms-3 d-flex flex-column align-items-end">
                                                            <small className="text-muted d-block">
                                                                {event.arrival_time ? 
                                                                    new Date(event.arrival_time).toLocaleDateString() : 
                                                                    'No date'
                                                                }
                                                            </small>
                                                            <small className="text-muted mb-2">
                                                                {event.arrival_time ? 
                                                                    new Date(event.arrival_time).toLocaleTimeString() : 
                                                                    ''
                                                                }
                                                            </small>
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                onClick={() => handleViewEvent(event.id)}
                                                                title="View Event Details"
                                                            >
                                                                View Event
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <i className="bi bi-exclamation-circle mi-icon-3x text-muted mb-3"></i>
                                        <h5>No Events Found</h5>
                                        <p className="text-muted">This report doesn't have any associated events.</p>
                                    </div>
                                )}
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="light" onClick={closeModals}>
                                    Close
                                </Button>
                            </Modal.Footer>
                        </Modal>

                        {/* LLM Settings Modal */}
                        <Modal show={showLLMSettingsModal} onHide={closeModals} size="lg" dialogClassName="mi-modal-lg">
                            <Modal.Header closeButton>
                                <Modal.Title>
                                    <i className="bi bi-gear me-2"></i>
                                    LLM Provider Settings
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <div className="mi-section-title" style={{ marginTop: 0 }}>Current configuration</div>
                                <div className="mi-cfg-now">
                                    <div className="mi-cfg-box">
                                        <div className="mi-cfg-box__lbl">Current provider</div>
                                        <div className="mi-cfg-box__val">
                                            <span className="mi-badge mi-info">
                                                <span className="mi-led"></span>
                                                {currentProvider === 'ollama' ? 'Ollama (Local)' : 'Gemini (Cloud)'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mi-cfg-box">
                                        <div className="mi-cfg-box__lbl">Current model</div>
                                        <div className="mi-cfg-box__val">
                                            <span className="mi-chip"><i className="bi bi-cpu"></i> {currentModel || 'Unknown'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mi-section-title">Change configuration</div>
                                <div className="mi-grid-2">
                                    <div className="mi-pv-field">
                                        <label>Select Provider</label>
                                        <Form.Select
                                            value={selectedProvider}
                                            onChange={(e) => handleProviderChange(e.target.value)}
                                            disabled={savingConfig}
                                        >
                                            {llmProviders && llmProviders.length > 0 ? (
                                                llmProviders.map(provider => (
                                                    <option key={provider} value={provider}>
                                                        {provider === 'ollama' ? 'Ollama (Local)' : 'Gemini (Cloud)'}
                                                    </option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="gemini">Gemini (Cloud)</option>
                                                    <option value="ollama">Ollama (Local)</option>
                                                </>
                                            )}
                                        </Form.Select>
                                    </div>
                                    <div className="mi-pv-field">
                                        <label>Select Model</label>
                                        <Form.Select
                                            value={selectedModel}
                                            onChange={(e) => handleModelChange(e.target.value)}
                                            disabled={selectedProvider !== 'ollama' || savingConfig}
                                        >
                                            {selectedProvider === 'ollama' ? (
                                                availableModels.length > 0 ? (
                                                    availableModels.map(model => (
                                                        <option key={model} value={model}>{model}</option>
                                                    ))
                                                ) : (
                                                    <option value="">No models available</option>
                                                )
                                            ) : (
                                                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                            )}
                                        </Form.Select>
                                        <div className="mi-help mt-1 d-flex justify-content-between align-items-center">
                                            <span>{selectedProvider === 'ollama' ? 'Only Ollama models can be changed' : 'Gemini model is fixed'}</span>
                                            {selectedProvider === 'ollama' && (
                                                <button
                                                    type="button"
                                                    className="mi-icon-btn"
                                                    style={{ width: 28, height: 28, fontSize: '.85rem' }}
                                                    onClick={() => loadModelsForProvider('ollama', currentProvider === 'ollama')}
                                                    title="Refresh available models"
                                                >
                                                    <i className="bi bi-arrow-clockwise"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Button
                                        variant="primary"
                                        onClick={saveLLMConfiguration}
                                        disabled={savingConfig || (selectedProvider === currentProvider && selectedModel === currentModel)}
                                    >
                                        <i className={`bi ${savingConfig ? 'bi-arrow-clockwise mi-spin' : 'bi-check-lg'} me-2`}></i>
                                        {savingConfig ? 'Saving...' : 'Save Configuration'}
                                    </Button>
                                    <span className="mi-help d-inline-flex align-items-center gap-1">
                                        <i className="bi bi-info-circle"></i>
                                        {savingConfig
                                            ? 'Applying changes…'
                                            : ((selectedProvider !== currentProvider || selectedModel !== currentModel) ? 'Unsaved changes — click Save to apply' : 'No changes to apply')}
                                    </span>
                                </div>

                                <div className="mi-section-title">Provider information</div>
                                <div className="mi-grid-2">
                                    <div className="prov-card">
                                        <div className="mi-prov-head mi-prov-head--local"><i className="bi bi-hdd-network"></i> Ollama (Local)</div>
                                        <div className="prov-card__body">
                                            <strong>Advantages</strong>
                                            <ul><li>Data stays local</li><li>No API costs</li><li>Offline capable</li><li>Customizable models</li></ul>
                                            <strong>Requirements</strong>
                                            <ul><li>Local Ollama installation</li><li>Downloaded models</li><li>Sufficient hardware</li></ul>
                                        </div>
                                    </div>
                                    <div className="prov-card">
                                        <div className="mi-prov-head mi-prov-head--cloud"><i className="bi bi-cloud"></i> Gemini (Cloud)</div>
                                        <div className="prov-card__body">
                                            <strong>Advantages</strong>
                                            <ul><li>High performance</li><li>Latest AI models</li><li>No local setup</li><li>Always up-to-date</li></ul>
                                            <strong>Requirements</strong>
                                            <ul><li>API key configuration</li><li>Internet connection</li><li>API usage costs</li></ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="mi-note">
                                    <i className="bi bi-info-circle"></i>
                                    <span><strong>Note:</strong> Configuration changes take effect immediately. The system dynamically reloads the configuration without requiring a server restart.</span>
                                </div>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="light" onClick={closeModals}>
                                    Close
                                </Button>
                            </Modal.Footer>
                        </Modal>

                        {/* LLM Information Modal */}
                        <Modal show={showLLMInfoModal} onHide={closeModals} size="lg">
                            <Modal.Header closeButton>
                                <Modal.Title>
                                    <i className="bi bi-info-circle me-2"></i>
                                    LLM Generation Details
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                {loadingLLMInfo ? (
                                    <div className="text-center py-4">
                                        <Spinner animation="border" />
                                        <p className="mt-2">Loading report details...</p>
                                    </div>
                                ) : selectedReportForLLMInfo && (
                                    <div>
                                        <Row className="mb-3">
                                            <Col md={6}>
                                                <Card className="h-100">
                                                    <Card.Header className="bg-light">
                                                        <i className="bi bi-gear-wide-connected me-2"></i>
                                                        <strong>Provider Information</strong>
                                                    </Card.Header>
                                                    <Card.Body>
                                                        <div className="d-flex align-items-center mb-2">
                                                            <strong>Provider:</strong>
                                                            <Badge 
                                                                bg={selectedReportForLLMInfo.llm_provider === 'ollama' ? 'warning' : 'primary'} 
                                                                className="ms-2"
                                                            >
                                                                <i className={`bi ${selectedReportForLLMInfo.llm_provider === 'ollama' ? 'bi-hdd-network' : 'bi-cloud'} me-1`}></i>
                                                                {selectedReportForLLMInfo.llm_provider === 'ollama' ? 'Ollama' : 'Gemini'}
                                                            </Badge>
                                                        </div>
                                                        <div className="mb-2">
                                                            <strong>Model:</strong>
                                                            <span className="ms-2 text-muted">
                                                                {selectedReportForLLMInfo.llm_model || 'Unknown'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <strong>Generation Date:</strong>
                                                            <span className="ms-2 text-muted">
                                                                {new Date(selectedReportForLLMInfo.created_at).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                            <Col md={6}>
                                                <Card className="h-100">
                                                    <Card.Header className="bg-light">
                                                        <i className="bi bi-graph-up me-2"></i>
                                                        <strong>Performance Metrics</strong>
                                                    </Card.Header>
                                                    <Card.Body>
                                                        <div className="mb-2">
                                                            <strong>Generation Time:</strong>
                                                            <span className="ms-2 text-muted">
                                                                {selectedReportForLLMInfo.generation_time 
                                                                    ? `${selectedReportForLLMInfo.generation_time < 60 
                                                                        ? `${Math.round(selectedReportForLLMInfo.generation_time)}s` 
                                                                        : `${Math.round(selectedReportForLLMInfo.generation_time / 60)}m ${Math.round(selectedReportForLLMInfo.generation_time % 60)}s`
                                                                    }`
                                                                    : 'Unknown'
                                                                }
                                                            </span>
                                                        </div>
                                                        <div className="mb-2">
                                                            <strong>Tokens Used:</strong>
                                                            <span className="ms-2 text-muted">
                                                                {selectedReportForLLMInfo.tokens_used 
                                                                    ? selectedReportForLLMInfo.tokens_used.toLocaleString()
                                                                    : 'Unknown'
                                                                }
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <strong>Report Size:</strong>
                                                            <span className="ms-2 text-muted">
                                                                {selectedReportForLLMInfo.content 
                                                                    ? `${Math.round(selectedReportForLLMInfo.content.length / 1024 * 100) / 100} KB`
                                                                    : 'Unknown'
                                                                }
                                                            </span>
                                                        </div>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                        </Row>
                                        
                                        <Row className="mb-3">
                                            <Col>
                                                <Card>
                                                    <Card.Header className="bg-light">
                                                        <i className="bi bi-file-text me-2"></i>
                                                        <strong>Report Details</strong>
                                                    </Card.Header>
                                                    <Card.Body>
                                                        <div className="mb-2">
                                                            <strong>Title:</strong>
                                                            <span className="ms-2">
                                                                {selectedReportForLLMInfo.title}
                                                            </span>
                                                        </div>
                                                        <div className="mb-2">
                                                            <strong>Events Analyzed:</strong>
                                                            <Badge bg="info" className="ms-2">
                                                                {selectedReportForLLMInfo.events_count || 0} events
                                                            </Badge>
                                                        </div>
                                                        <div>
                                                            <strong>User Prompt:</strong>
                                                            <div className="mt-2 p-2 bg-light rounded">
                                                                <small className="text-muted">
                                                                    {selectedReportForLLMInfo.prompt || 'No prompt available'}
                                                                </small>
                                                            </div>
                                                        </div>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                        </Row>
                                    </div>
                                )}
                                {!loadingLLMInfo && !selectedReportForLLMInfo && (
                                    <div className="text-center py-4">
                                        <p className="text-muted">No report data available</p>
                                    </div>
                                )}
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="light" onClick={closeModals}>
                                    Close
                                </Button>
                            </Modal.Footer>
                        </Modal>
        </div>
    );
};

export default Reports;
