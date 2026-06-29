import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EventDetails from "./EventDetailsTab";
import EventAttributes from "./AttributesTab";
import JsonViewer from "./JsonViewer";
import Artifacts from "./ArtifactsTab";
import SharingStrategies from "./SharingStrategiesTab";
import MISPServerSelector from "./MISPServerSelector";
import ShareEventModal from "./ShareEventModal";
import FormSelectionModal from "./FormSelectionModal";
import { useToast } from '../../components/Toast';

const SERVER_URL = process.env.REACT_APP_API_URL;

const ShareEventView = () => {
    const { showError, showSuccess, showInfo } = useToast();
    const { id } = useParams();
    const navigate = useNavigate();
    const [jsonData, setJsonData] = useState(null);
    const [eventFiles, setEventFiles] = useState([]);
    const [activeTab, setActiveTab] = useState("details");
    const [strategies, setStrategies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showFormSelectionModal, setShowFormSelectionModal] = useState(false);
    const [eventOrganizationId, setEventOrganizationId] = useState(null);
    const [pendingFormModalOpen, setPendingFormModalOpen] = useState(false);
    const [availableFormsCount, setAvailableFormsCount] = useState(0);
    
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        setLoading(true); 
        
        // Fetch event details and organization info
        Promise.all([
            fetch(`${SERVER_URL}/event/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            }),
            fetch(`${SERVER_URL}/event/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            })
        ])
        .then(async ([eventResponse, eventsListResponse]) => {
            const eventData = await eventResponse.json();
            const eventsListData = await eventsListResponse.json();
            
            if (eventData.event && eventData.event.data) {
                                                const transformedData = transformEventData(
                    eventData.event.data, 
                    eventData.event.shared_date, 
                    eventData.event.shared,
                    {
                        AWARE4BC: eventData.attributes.aware || [],
                        RISK4BC: eventData.attributes.risk || [],
                        SOAR4BC: eventData.attributes.soar || [],
                        SOAR4BC_RESULT: eventData.attributes.soar_result || [],
                    }
                );
                transformedData.id = id;
                setJsonData(transformedData);
                            }
            
            // Find the organization ID for this event from the events list
            if (eventsListData.events) {
                const currentEvent = eventsListData.events.find(event => event.id.toString() === id);
                                if (currentEvent && currentEvent.organization_id) {
                    setEventOrganizationId(currentEvent.organization_id);
                                    } else {
                                    }
            } else {
                            }
            
            if (eventData.files) {
                const transformedFiles = eventData.files.map(file => ({
                    ...file,
                    share: false,
                }));
                setEventFiles(transformedFiles);
            }
        })
        .catch(error => {
            // Error handling for event files fetch
        })
        .finally(() => setLoading(false));
        fetchStrategies();
    }, [id]);

    const transformEventData = (eventData, sharedDate, isShared, explicitAttributes = null) => {
        let transformedAttributes;
        
        if (explicitAttributes) {
            transformedAttributes = {
                ...explicitAttributes,
                AWARE4BC: (explicitAttributes.AWARE4BC || []).map(attr => ({
                    ...attr,
                    action: attr.action || {
                        type: "none",
                        option: "none",
                    }
                }))
            };
        } else if (eventData.Attribute) {
            transformedAttributes = {
                ...eventData.Attribute,
                AWARE4BC: eventData.Attribute.AWARE4BC.map((attr) => ({
                    ...attr,
                    action: {
                        type: "none",
                        option: "none",
                    },
                })),
            };
        } else {
            transformedAttributes = {
                AWARE4BC: [],
                RISK4BC: [],
                SOAR4BC: []
            };
        }

        return {
            ...eventData,
            published: eventData.published || false,
            locked: eventData.locked || false,
            shared: isShared || false,
            shared_date: sharedDate,
            Attribute: transformedAttributes,
            date:
                typeof eventData.date === "object" &&
                eventData.date !== null &&
                "value" in eventData.date &&
                "action" in eventData.date
                    ? eventData.date
                    : { value: eventData.date, action: "%Y-%m-%d" },
        };
    };

    const fetchStrategies = () => {
        const token = localStorage.getItem('accessToken');
        fetch(`${SERVER_URL}/strategy/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })
            .then(response => response.json())
            .then(data => {
                if (data.strategies.length > 0){
                    setStrategies(data.strategies);
                }
            })
    };

    const handleOpenShareModal = () => {
        setShowShareModal(true);
    };

    const handleConfirmShare = async ({mispServerIds, organizationIds}) => {
        if (!jsonData) {
                        return;
        }
        
        if ((mispServerIds?.length ?? 0) === 0 && (organizationIds?.length ?? 0) === 0) {
            showError('Please select at least one destination (MISP server or organization).');
            return;
        }

        setShowShareModal(false);
        setLoading(true);
        const url = `${SERVER_URL}/event/share/${id}/`;
        
        try {
            const token = localStorage.getItem('accessToken');

            const payload = {
                ...jsonData,
                artifacts: eventFiles.map(file => ({
                    id: file.id,
                    share: file.share || false,
                }))
            };

            const dataToSend = {
                ...payload,
                misp_server_ids: mispServerIds ?? [],
                organization_ids: organizationIds ?? [],
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(dataToSend)
            });
            
            const responseData = await response.json();
            
            if (response.ok) {
                                setJsonData(prevData => ({
                    ...prevData,
                    shared: true,
                    shared_date: new Date().toISOString().slice(0, 19).replace('T', ' ')
                }));
                
                const successfulShares = responseData.results.filter(r => r.success).length;
                const totalShares = responseData.results.length;
                
                showSuccess(`Event shared successfully with ${successfulShares} out of ${totalShares} MISP servers.`);
                
                // Show form selection modal after successful share
                if (eventOrganizationId) {
                    setTimeout(() => {
                        setPendingFormModalOpen(true);
                        setShowFormSelectionModal(true);
                    }, 1500); // Show after 1.5 seconds to let user see the success message
                }
            } else {
                                showError(responseData.error || 'Failed to share event.');
            }
        } catch (error) {
                        showError('Server connection error.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = handleOpenShareModal;

    const handleUnshareEvent = async () => {
        if (!window.confirm('Are you sure you want to unshare this event? This will also delete all associated share logs.')) {
            return;
        }
        
        setLoading(true);
        
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${SERVER_URL}/event/update-share-status/${id}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ shared: false })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showSuccess('Event has been unshared and share logs have been deleted.');
                setJsonData(prevEvent => ({ 
                    ...prevEvent, 
                    shared: false,
                    shared_date: null
                }));
            } else {
                showError(`Error: ${data.message || 'Something went wrong'}`);
            }
        } catch (error) {
                        showError('Server connection error');
        } finally {
            setLoading(false);
        }
    };

    // Handle when forms are loaded in the modal
    const handleFormsLoaded = (formsCount) => {
        setAvailableFormsCount(formsCount);
        
        // If no forms are available and modal was pending to open, close it
        if (formsCount === 0 && pendingFormModalOpen) {
            setShowFormSelectionModal(false);
            setPendingFormModalOpen(false);
            
            // Show a message that no forms are available
            showInfo('Event shared successfully! No additional forms are available to fill for this event.');
        }
    };

    // Close form modal and reset pending state
    const handleCloseFormModal = () => {
        setShowFormSelectionModal(false);
        setPendingFormModalOpen(false);
    };

    return(
        <div className="h-100">
            {loading && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
                     style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                    <div className="spinner-border text-light" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            )}
            
            <ShareEventModal
                show={showShareModal}
                onClose={() => setShowShareModal(false)}
                onConfirm={handleConfirmShare}
                eventId={id}
            />
            
            <FormSelectionModal
                show={showFormSelectionModal}
                onClose={handleCloseFormModal}
                eventOrganizationId={eventOrganizationId}
                eventInfo={jsonData}
                onFormsLoaded={handleFormsLoaded}
            />
            
            <div className="mi-event-detail">
                <div className="mi-page-head">
                    <div>
                        <h1>{(jsonData && jsonData.info) ? jsonData.info : `Event #${id}`}</h1>
                        <div className="mi-meta-chips">
                            <span className="mi-chip"><i className="bi bi-hash"></i> Event {id}</span>
                            {jsonData?.date?.value && (
                                <span className="mi-chip"><i className="bi bi-calendar3"></i> {jsonData.date.value}</span>
                            )}
                            {jsonData?.shared
                                ? <span className="mi-badge mi-success"><span className="mi-led"></span> Shared</span>
                                : <span className="mi-badge mi-warning"><span className="mi-led"></span> Not shared</span>}
                        </div>
                    </div>
                    <div className="mi-page-head__actions">
                        <button className="btn btn-outline-secondary" onClick={() => navigate(-1)} disabled={loading}>
                            <i className="bi bi-arrow-left me-1"></i> Go Back
                        </button>
                        {jsonData?.shared ? (
                            <button className="btn btn-outline-danger" onClick={handleUnshareEvent} disabled={loading}>
                                <i className="bi bi-x-circle me-1"></i> Unshare
                            </button>
                        ) : (
                            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                                <i className="bi bi-share-fill me-1"></i> Share
                            </button>
                        )}
                    </div>
                </div>

                <div className="mi-tabs">
                    {[
                        { key: "details", label: "Details", icon: "bi-info-circle" },
                        { key: "attributes", label: "Attributes", icon: "bi-list-check" },
                        { key: "artifacts", label: "Artifacts", icon: "bi-file-earmark" },
                        { key: "jsonfile", label: "JSON", icon: "bi-code-slash" },
                        { key: "sharing-strategies", label: "Sharing Strategies", icon: "bi-share" },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            className={`mi-tab ${activeTab === tab.key ? "active" : ""}`}
                            onClick={() => setActiveTab(tab.key)}
                            disabled={loading}
                        >
                            <i className={`bi ${tab.icon}`}></i> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="mi-tab-content">
                    {activeTab === "details" && jsonData && <EventDetails jsonData={jsonData} onUpdate={setJsonData}/>}
                    {activeTab === "attributes" && jsonData && <EventAttributes jsonData={jsonData} onUpdate={setJsonData} />}
                    {activeTab === "jsonfile" && jsonData && <JsonViewer data={jsonData} />}
                    {activeTab === "artifacts" && jsonData && <Artifacts eventFiles={eventFiles} setEventFiles={setEventFiles} eventId={id}/>}
                    {activeTab === "sharing-strategies" && <SharingStrategies strategies={strategies} setStrategies={setStrategies} setJsonData={setJsonData}/>}
                    {activeTab === "misp-servers" && <MISPServerSelector />}
                </div>
            </div>
        </div>
    );
};

export default ShareEventView;