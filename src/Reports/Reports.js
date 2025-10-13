import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Form, Spinner, Modal, Table, Badge, InputGroup, Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import NavBar from '../NavBar/NavBar';
import './Reports.css';

const SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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

    // Headers with authentication
    const getAuthHeaders = () => {
        const token = getAuthToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    };

    // Load events and reports on component mount
    useEffect(() => {
        loadEvents();
        loadReports();
        loadLLMProviders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Function to load LLM providers
    const loadLLMProviders = async () => {
        try {
            // Add timestamp to URL to prevent caching
            const timestamp = new Date().getTime();
            const response = await fetch(`${SERVER_URL}/reports/llm/?t=${timestamp}`, {
                headers: getAuthHeaders()
            });

            
            if (response.ok) {
                const data = await response.json();
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
                    loadModelsForProvider(data.current_provider);
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

    // Function to load models for a specific provider
    const loadModelsForProvider = async (provider) => {
        try {
            // Add timestamp to URL to prevent caching
            const timestamp = new Date().getTime();
            const response = await fetch(`${SERVER_URL}/reports/llm/models/?provider=${provider}&t=${timestamp}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                setAvailableModels(data.available_models || []);
                if (provider === currentProvider) {
                    setCurrentModel(data.current_model || '');
                    setSelectedModel(data.current_model || '');
                } else {
                    setSelectedModel(data.available_models[0] || '');
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
                const data = await response.json();
                showSuccess(`Configuration updated: ${data.message}`);
                
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
                const errorData = await response.json();
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
                const data = await response.json();
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
                const data = await response.json();
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

            // Create AbortController for timeout handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, 120000); // 2 minutes timeout

            const response = await fetch(`${SERVER_URL}/reports/`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    title,
                    prompt,
                    events: selectedEvents
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                // Report generated successfully
                showSuccess('Report generated successfully!');
                setTitle('');
                setPrompt('');
                setSelectedEvents([]);
                setShowCreateModal(false);
                loadReports();
            } else {
                const errorData = await response.json();
                showError(errorData.error || 'Error generating report');
            }
        } catch (error) {
            console.error('💥 Exception during report generation:', error);
            if (error.name === 'AbortError') {
                showError('Request timeout: Report generation took too long. Please try again or check your LLM configuration.');
            } else {
                showError('Connection error');
            }
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

    const clearForm = () => {
        setTitle('');
        setPrompt('');
        setSelectedEvents([]);
        showInfo('Form cleared');
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
            withEvents: reports.filter(r => r.events && r.events.length > 0).length
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
                    const reportData = await response.json();
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
                const reportData = await response.json();
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

    const stats = getReportStats();

    // Enhanced download functions that fetch complete report data including events
    const fetchCompleteReportData = async (report) => {
        try {
            const response = await fetch(`${SERVER_URL}/reports/${report.id}/`, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
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
    <title>${completeReport.title || 'Security Report'}</title>
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
    <h1>${completeReport.title || 'Security Report'}</h1>
    <div class="metadata">
        <strong>Created:</strong> ${new Date(completeReport.created_at).toLocaleString()}<br>
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
                <strong>${event.title || 'Untitled Event'}</strong><br>
                <small><strong>Description:</strong> ${event.description || 'No description'}</small><br>
                ${event.source_ip ? `<small><strong>Source IP:</strong> ${event.source_ip}</small><br>` : ''}
                ${event.destination_ip ? `<small><strong>Destination IP:</strong> ${event.destination_ip}</small><br>` : ''}
                ${event.created_at ? `<small><strong>Date:</strong> ${new Date(event.created_at).toLocaleString()}</small>` : ''}
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

    // Helper function to convert markdown-like content to HTML
    const formatContentForHTML = (content) => {
        if (!content) return 'No content available';
        
        return content
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
        <div className="container-fluid mt-4">
            <NavBar showNavLinks={true} />
            <div style={{ minHeight: "calc(100vh - 80px)" }}>
                <Container fluid className="mt-4">
                    <Row>
                        <Col>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h2 className="text-primary">
                                    Security Reports
                                </h2>
                                <div className="d-flex gap-2">
                                    <Button 
                                        variant="outline-secondary" 
                                        onClick={handleLLMSettings}
                                        disabled={loading}
                                        title="LLM Settings"
                                        className="settings-gear-btn"
                                    >
                                        <i className="fas fa-cog"></i>
                                    </Button>
                                    <Button 
                                        variant="primary" 
                                        onClick={handleCreateReport}
                                        disabled={loading}
                                        size="lg"
                                    >
                                        <i className="fas fa-plus me-2"></i>
                                        New Report
                                    </Button>
                                </div>
                            </div>
                        
                        {/* Stats Cards */}
                        <Row className="mb-4">
                            <Col md={4}>
                                <Card className="text-center border-primary h-100 stats-card">
                                    <Card.Body>
                                        <i className="fas fa-chart-bar fa-2x text-primary mb-2"></i>
                                        <h4 className="text-primary">{stats.total}</h4>
                                        <p className="mb-0 text-muted">Total Reports</p>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={4}>
                                <Card className="text-center border-info h-100 stats-card">
                                    <Card.Body>
                                        <div className="position-relative">
                                            <i className="fas fa-robot fa-2x text-info mb-2"></i>
                                            {loadingLLM && (
                                                <div className="position-absolute top-0 end-0">
                                                    <Spinner animation="border" size="sm" variant="info" />
                                                </div>
                                            )}
                                        </div>
                                        <h5 className="text-info mb-1">
                                            {currentProvider ? currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1) : 'No LLM'}
                                        </h5>
                                        <small className="text-muted d-block mb-2">
                                            {currentProvider === 'gemini' ? 'Gemini 1.5 Flash' : (currentModel || 'No model selected')}
                                        </small>
                                        <div className="d-flex justify-content-center gap-2">
                                            <p className="mb-0 text-muted flex-grow-1">Current LLM & Model</p>
                                            <Button 
                                                variant="outline-info" 
                                                size="sm" 
                                                onClick={loadLLMProviders}
                                                disabled={loadingLLM}
                                                className="border-0"
                                                title="Refresh LLM Configuration"
                                            >
                                                <i className={`fas fa-sync-alt ${loadingLLM ? 'fa-spin' : ''}`}></i>
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={4}>
                                <Card className="text-center border-warning h-100 stats-card">
                                    <Card.Body>
                                        <i className="fas fa-brain fa-2x text-warning mb-2"></i>
                                        <h4 className="text-warning">
                                            {reports.filter(r => r.llm_provider === 'ollama').length > 
                                             reports.filter(r => r.llm_provider !== 'ollama').length 
                                             ? 'Ollama' : 'Gemini'}
                                        </h4>
                                        <p className="mb-0 text-muted">Most Used LLM</p>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {/* Search and Filter */}
                        <Row className="mb-4">
                            <Col md={8}>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <i className="fas fa-search"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search reports by title or content..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Col>
                            <Col md={4} className="text-end">
                                <small className="text-muted">
                                    Showing {filteredReports.length} of {reports.length} reports
                                </small>
                            </Col>
                        </Row>

                        {/* Reports Table */}
                        <Card className="shadow-sm reports-table">
                            <Card.Header>
                                <h5 className="mb-0">
                                    <i className="fas fa-list me-2"></i>
                                    Reports Management
                                </h5>
                            </Card.Header>
                            <Card.Body className="p-0">
                                {reports.length === 0 ? (
                                    <div className="text-center py-5">
                                        <h5>No Reports Found</h5>
                                        <p className="text-muted">Create your first security report to get started.</p>
                                        <Button variant="primary" onClick={handleCreateReport} size="lg">
                                            <i className="fas fa-plus me-2"></i>
                                            Create Your First Report
                                        </Button>
                                    </div>
                                ) : (
                                    <Table responsive striped hover className="mb-0">
                                        <thead>
                                            <tr>
                                                <th>Report Title</th>
                                                <th className="text-center">Events</th>
                                                <th className="text-center">LLM Model</th>
                                                <th className="text-center">Generated</th>
                                                <th className="text-center">Status</th>
                                                <th className="text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredReports.map(report => (
                                                <tr key={report.id}>
                                                    <td>
                                                        <div className="d-flex flex-column">
                                                            <strong className="text-primary">{report.title || 'Untitled Report'}</strong>
                                                            {report.prompt && (
                                                                <small className="text-muted text-truncate" style={{ maxWidth: '300px' }}>
                                                                    {report.prompt.length > 80 
                                                                        ? `${report.prompt.substring(0, 80)}...` 
                                                                        : report.prompt
                                                                    }
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <Badge 
                                                            bg="info" 
                                                            className="fs-6"
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => handleShowEvents(report)}
                                                            title="Click to view events"
                                                        >
                                                            {report.events_count || 0} events
                                                        </Badge>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="d-flex flex-column align-items-center">
                                                            <Badge 
                                                                bg={report.llm_provider === 'ollama' ? 'warning' : 'primary'} 
                                                                className="mb-1"
                                                                style={{ cursor: 'pointer' }}
                                                                onClick={() => handleShowLLMInfo(report)}
                                                                title="Click to view LLM details"
                                                            >
                                                                <i className={`fas ${report.llm_provider === 'ollama' ? 'fa-server' : 'fa-brain'} me-1`}></i>
                                                                {report.llm_provider === 'ollama' ? 'Ollama' : 'Gemini'}
                                                            </Badge>
                                                            {report.llm_model && (
                                                                <small className="text-muted">{report.llm_model}</small>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="d-flex flex-column align-items-center">
                                                            <small>{formatDate(report.created_at)}</small>
                                                            {report.generation_time && (
                                                                <small className="text-muted">
                                                                    {report.generation_time < 60 
                                                                        ? `${Math.round(report.generation_time)}s` 
                                                                        : `${Math.round(report.generation_time / 60)}m`
                                                                    }
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="d-flex flex-column align-items-center">
                                                            <Badge bg="success" className="mb-1">
                                                                <i className="fas fa-check me-1"></i>
                                                                Generated
                                                            </Badge>
                                                            {report.content && (
                                                                <small className="text-muted">
                                                                    {(report.content.length / 1024).toFixed(1)} KB
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="btn-group" role="group">
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                onClick={() => handleViewReport(report)}
                                                                title="View Report"
                                                            >
                                                                <i className="fas fa-eye"></i>
                                                            </Button>
                                                            
                                                            {/* Download Dropdown */}
                                                            <Dropdown>
                                                                <Dropdown.Toggle 
                                                                    variant="outline-success" 
                                                                    size="sm"
                                                                    title="Download Report"
                                                                >
                                                                    <i className="fas fa-download"></i>
                                                                </Dropdown.Toggle>
                                                                <Dropdown.Menu>
                                                                    <Dropdown.Item
                                                                        onClick={() => downloadReportAsHTML(report)}
                                                                    >
                                                                        <i className="fas fa-code me-2"></i>HTML
                                                                    </Dropdown.Item>
                                                                    <Dropdown.Item
                                                                        onClick={() => downloadReportAsText(report)}
                                                                    >
                                                                        <i className="fas fa-file-alt me-2"></i>Text
                                                                    </Dropdown.Item>
                                                                    <Dropdown.Item
                                                                        onClick={() => downloadReportAsJSON(report)}
                                                                    >
                                                                        <i className="fas fa-file-code me-2"></i>JSON
                                                                    </Dropdown.Item>
                                                                </Dropdown.Menu>
                                                            </Dropdown>
                                                            
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => setSelectedReportForDeletion(report)}
                                                                title="Delete Report"
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>

                        {/* Create Report Modal */}
                        <Modal show={showCreateModal} onHide={closeModals} size="lg">
                            <Modal.Header closeButton className="bg-primary text-white">
                                <Modal.Title>
                                    <i className="fas fa-magic me-2"></i>
                                    Create New Security Report
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                {/* LLM Provider Indicator */}
                                {currentProvider && (
                                    <Alert variant="info" className="d-flex align-items-center mb-3">
                                        <i className={`fas ${currentProvider === 'ollama' ? 'fa-server' : 'fa-brain'} me-2`}></i>
                                        <strong>AI Provider:</strong>
                                        <Badge 
                                            bg={currentProvider === 'ollama' ? 'success' : 'primary'} 
                                            className="ms-2"
                                        >
                                            {currentProvider === 'ollama' ? 'Ollama (Local)' : 'Gemini (Cloud)'}
                                        </Badge>
                                        <Button 
                                            variant="link" 
                                            size="sm" 
                                            className="ms-auto text-decoration-none"
                                            onClick={handleLLMSettings}
                                        >
                                            <i className="fas fa-cog me-1"></i>
                                            Change Provider
                                        </Button>
                                    </Alert>
                                )}
                                
                                <Form>
                                    <Row className="mb-3">
                                        <Col>
                                            <Form.Label>Report Title</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Enter a descriptive title for your report"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                            />
                                        </Col>
                                    </Row>

                                    <Row className="mb-3">
                                        <Col>
                                            <Form.Label>Analysis Prompt</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={4}
                                                placeholder="Describe what kind of analysis you want the AI to perform"
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                            />
                                        </Col>
                                    </Row>

                                    <Row className="mb-3">
                                        <Col>
                                            <Form.Label>Quick Templates</Form.Label>
                                            <div className="d-grid gap-2 d-md-flex flex-wrap">
                                                {Object.entries(predefinedPrompts).map(([key, template]) => (
                                                    <Button
                                                        key={key}
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() => setPromptTemplate(key)}
                                                        className="flex-fill"
                                                    >
                                                        {template.title}
                                                    </Button>
                                                ))}
                                                <Button
                                                    variant="outline-warning"
                                                    size="sm"
                                                    onClick={clearForm}
                                                    className="flex-fill"
                                                >
                                                    <i className="fas fa-eraser me-1"></i>
                                                    Clear
                                                </Button>
                                            </div>
                                        </Col>
                                    </Row>

                                    <Row className="mb-3">
                                        <Col>
                                            <Form.Label>Select Events to Analyze</Form.Label>
                                            {loadingEvents ? (
                                                <div className="text-center p-3">
                                                    <Spinner animation="border" size="sm" />
                                                    <span className="ms-2">Loading events...</span>
                                                </div>
                                            ) : (
                                                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.375rem', padding: '0.75rem' }}>
                                                    {events.length === 0 ? (
                                                        <Alert variant="info" className="mb-0">
                                                            <i className="fas fa-info-circle me-2"></i>
                                                            No events available for analysis
                                                        </Alert>
                                                    ) : (
                                                        events.map(event => (
                                                            <Form.Check
                                                                key={event.id}
                                                                type="checkbox"
                                                                id={`event-${event.id}`}
                                                                label={
                                                                    <div>
                                                                        <strong>{event.info || event.title || `Event ${event.id}`}</strong>
                                                                        <br />
                                                                        <small className="text-muted">
                                                                            Event ID: {event.id}
                                                                        </small>
                                                                    </div>
                                                                }
                                                                checked={selectedEvents.includes(event.id)}
                                                                onChange={() => handleEventSelection(event.id)}
                                                                className="mb-2"
                                                            />
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </Col>
                                    </Row>
                                </Form>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={closeModals}>
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
                                            <i className="fas fa-magic me-2"></i>
                                            Generate Report
                                        </>
                                    )}
                                </Button>
                            </Modal.Footer>
                        </Modal>

                        {/* View Report Modal */}
                        <Modal show={showViewModal} onHide={closeModals} size="xl">
                            <Modal.Header closeButton className="bg-info text-white">
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
                                                        <i className="fas fa-calendar me-1"></i>
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
                                                            <i className="fas fa-link me-1"></i>
                                                            {selectedReport.events.length} events analyzed
                                                        </Badge>
                                                    )}
                                                </Col>
                                            </Row>
                                        </div>
                                        <div className="report-content">
                                            {selectedReport.content || 'No content available'}
                                        </div>
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
                                            <i className="fas fa-code me-1"></i>HTML
                                        </Button>
                                        <Button 
                                            variant="outline-success"
                                            onClick={() => downloadReportAsText(selectedReport)}
                                            title="Download as Text"
                                        >
                                            <i className="fas fa-file-alt me-1"></i>TXT
                                        </Button>
                                        <Button 
                                            variant="outline-success"
                                            onClick={() => downloadReportAsJSON(selectedReport)}
                                            title="Download as JSON"
                                        >
                                            <i className="fas fa-file-code me-1"></i>JSON
                                        </Button>
                                    </div>
                                    <Button variant="secondary" onClick={closeModals}>
                                        Close
                                    </Button>
                                </div>
                            </Modal.Footer>
                        </Modal>

                        {/* Delete Confirmation Modal */}
                        <Modal show={!!selectedReportForDeletion} onHide={closeModals}>
                            <Modal.Header closeButton className="bg-danger text-white">
                                <Modal.Title>
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    Confirm Deletion
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <div className="text-center">
                                    <i className="fas fa-trash fa-3x text-danger mb-3"></i>
                                    <p>Are you sure you want to delete the report:</p>
                                    <p><strong>"{selectedReportForDeletion?.title}"</strong></p>
                                    <Alert variant="warning">
                                        <i className="fas fa-exclamation-triangle me-2"></i>
                                        This action cannot be undone.
                                    </Alert>
                                </div>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={closeModals}>
                                    Cancel
                                </Button>
                                <Button 
                                    variant="danger" 
                                    onClick={() => deleteReport(selectedReportForDeletion.id)}
                                >
                                    <i className="fas fa-trash me-2"></i>
                                    Delete Report
                                </Button>
                            </Modal.Footer>
                        </Modal>

                        {/* Events Modal */}
                        <Modal show={showEventsModal} onHide={closeModals} size="lg">
                            <Modal.Header closeButton className="bg-primary text-white">
                                <Modal.Title>
                                    <i className="fas fa-list me-2"></i>
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
                                                                            <i className="fas fa-arrow-right me-1 text-muted"></i>
                                                                            <strong>Source:</strong> {event.source_ip}
                                                                        </span>
                                                                    )}
                                                                    {event.destination_ip && (
                                                                        <span>
                                                                            <i className="fas fa-bullseye me-1 text-muted"></i>
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
                                        <i className="fas fa-exclamation-circle fa-3x text-muted mb-3"></i>
                                        <h5>No Events Found</h5>
                                        <p className="text-muted">This report doesn't have any associated events.</p>
                                    </div>
                                )}
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={closeModals}>
                                    Close
                                </Button>
                            </Modal.Footer>
                        </Modal>

                        {/* LLM Settings Modal */}
                        <Modal show={showLLMSettingsModal} onHide={closeModals} size="lg">
                            <Modal.Header closeButton className="bg-secondary text-white">
                                <Modal.Title>
                                    <i className="fas fa-cog me-2"></i>
                                    LLM Provider Settings
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <div className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h5 className="mb-0">Current Configuration</h5>
                                    </div>
                                    
                                    <Card className="border-primary">
                                        <Card.Body>
                                            <Row>
                                                <Col md={6}>
                                                    <strong>Current Provider:</strong>
                                                    <div className="mt-1">
                                                        <Badge 
                                                            bg={currentProvider === 'ollama' ? 'success' : 'primary'} 
                                                            className="fs-6"
                                                        >
                                                            <i className={`fas ${currentProvider === 'ollama' ? 'fa-server' : 'fa-brain'} me-1`}></i>
                                                            {currentProvider === 'ollama' ? 'Ollama (Local)' : 'Gemini (Cloud)'}
                                                        </Badge>
                                                    </div>
                                                </Col>
                                                <Col md={6}>
                                                    <strong>Current Model:</strong>
                                                    <div className="mt-1">
                                                        <Badge bg="info" className="fs-6">
                                                            {currentModel || 'Unknown'}
                                                        </Badge>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                                </div>

                                <div className="mb-4">
                                    <h5>Change Configuration</h5>
                                    <Row>
                                        <Col md={6}>
                                            <Form.Label>Select Provider</Form.Label>
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
                                        </Col>
                                        <Col md={6}>
                                            <Form.Label>Select Model</Form.Label>
                                            <Form.Select 
                                                value={selectedModel}
                                                onChange={(e) => handleModelChange(e.target.value)}
                                                disabled={selectedProvider !== 'ollama' || savingConfig}
                                            >
                                                {selectedProvider === 'ollama' ? (
                                                    availableModels.length > 0 ? (
                                                        availableModels.map(model => (
                                                            <option key={model} value={model}>
                                                                {model}
                                                            </option>
                                                        ))
                                                    ) : (
                                                        <option value="">No models available</option>
                                                    )
                                                ) : (
                                                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                                )}
                                            </Form.Select>
                                            <div className="mt-2 d-flex justify-content-between align-items-center">
                                                <Form.Text className="text-muted">
                                                    {selectedProvider === 'ollama' ? 
                                                        'Only Ollama models can be changed' : 
                                                        'Gemini model is fixed'
                                                    }
                                                </Form.Text>
                                                {selectedProvider === 'ollama' && (
                                                    <Button 
                                                        variant="outline-secondary" 
                                                        size="sm"
                                                        onClick={() => loadModelsForProvider('ollama')}
                                                        title="Refresh available models"
                                                    >
                                                        <i className="fas fa-sync-alt"></i>
                                                    </Button>
                                                )}
                                            </div>
                                        </Col>
                                    </Row>
                                    
                                    <div className="mt-3 d-flex gap-2">
                                        <Button 
                                            variant="success" 
                                            onClick={saveLLMConfiguration}
                                            disabled={savingConfig || (selectedProvider === currentProvider && selectedModel === currentModel)}
                                        >
                                            <i className={`fas ${savingConfig ? 'fa-spinner fa-spin' : 'fa-save'} me-2`}></i>
                                            {savingConfig ? 'Saving...' : 'Save Configuration'}
                                        </Button>
                                        
                                        {(selectedProvider !== currentProvider || selectedModel !== currentModel) && (
                                            <Badge bg="warning" className="align-self-center">
                                                <i className="fas fa-exclamation-triangle me-1"></i>
                                                Configuration changed - Click Save to apply
                                            </Badge>
                                        )}
                                        
                                        {savingConfig && (
                                            <Badge bg="info" className="align-self-center">
                                                <i className="fas fa-spinner fa-spin me-1"></i>
                                                Applying changes...
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <h5>Provider Information</h5>
                                    <Row>
                                        <Col md={6}>
                                            <Card className="h-100 llm-info-card">
                                                <Card.Header className="bg-success text-white">
                                                    <i className="fas fa-server me-2"></i>
                                                    Ollama (Local)
                                                </Card.Header>
                                                <Card.Body>
                                                    <p className="small mb-2">
                                                        <strong>Advantages:</strong>
                                                    </p>
                                                    <ul className="small mb-2">
                                                        <li>Data stays local</li>
                                                        <li>No API costs</li>
                                                        <li>Offline capable</li>
                                                        <li>Customizable models</li>
                                                    </ul>
                                                    <p className="small mb-2">
                                                        <strong>Requirements:</strong>
                                                    </p>
                                                    <ul className="small">
                                                        <li>Local Ollama installation</li>
                                                        <li>Downloaded models</li>
                                                        <li>Sufficient hardware</li>
                                                    </ul>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={6}>
                                            <Card className="h-100 llm-info-card">
                                                <Card.Header className="bg-primary text-white">
                                                    <i className="fas fa-brain me-2"></i>
                                                    Gemini (Cloud)
                                                </Card.Header>
                                                <Card.Body>
                                                    <p className="small mb-2">
                                                        <strong>Advantages:</strong>
                                                    </p>
                                                    <ul className="small mb-2">
                                                        <li>High performance</li>
                                                        <li>Latest AI models</li>
                                                        <li>No local setup</li>
                                                        <li>Always up-to-date</li>
                                                    </ul>
                                                    <p className="small mb-2">
                                                        <strong>Requirements:</strong>
                                                    </p>
                                                    <ul className="small">
                                                        <li>API key configuration</li>
                                                        <li>Internet connection</li>
                                                        <li>API usage costs</li>
                                                    </ul>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>
                                </div>

                                <Alert variant="info">
                                    <i className="fas fa-info-circle me-2"></i>
                                    <strong>Note:</strong> Configuration changes take effect immediately. 
                                    The system dynamically reloads the configuration without requiring a server restart.
                                </Alert>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={closeModals}>
                                    Close
                                </Button>
                            </Modal.Footer>
                        </Modal>

                        {/* LLM Information Modal */}
                        <Modal show={showLLMInfoModal} onHide={closeModals} size="lg">
                            <Modal.Header closeButton>
                                <Modal.Title>
                                    <i className="fas fa-info-circle me-2"></i>
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
                                                        <i className="fas fa-cogs me-2"></i>
                                                        <strong>Provider Information</strong>
                                                    </Card.Header>
                                                    <Card.Body>
                                                        <div className="d-flex align-items-center mb-2">
                                                            <strong>Provider:</strong>
                                                            <Badge 
                                                                bg={selectedReportForLLMInfo.llm_provider === 'ollama' ? 'warning' : 'primary'} 
                                                                className="ms-2"
                                                            >
                                                                <i className={`fas ${selectedReportForLLMInfo.llm_provider === 'ollama' ? 'fa-server' : 'fa-brain'} me-1`}></i>
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
                                                        <i className="fas fa-chart-line me-2"></i>
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
                                                        <i className="fas fa-file-alt me-2"></i>
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
                                <Button variant="secondary" onClick={closeModals}>
                                    Close
                                </Button>
                            </Modal.Footer>
                        </Modal>
                    </Col>
                </Row>
            </Container>
            </div>
        </div>
    );
};

export default Reports;
