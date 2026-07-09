import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import EventViewer from '../EventDetail/EventViewer';
import ShareEventModal from '../EventDetail/ShareEventModal';
import { useToast } from '../../components/Toast';

const SERVER_URL = process.env.REACT_APP_API_URL;

const Aggregation = () => {
    const [jsonData, setJsonData] = useState(null);
    const location = useLocation();
    const eventViewerRef = useRef(null);
    const navigate = useNavigate();
    const [selectedEventIds, setSelectedEventIds] = useState([]);
    const [isDataFetched, setIsDataFetched] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [sharing, setSharing] = useState(false);
    const { showError, showSuccess } = useToast();

    const handleSave = () => {
        if (!jsonData) return;
        setShowShareModal(true);
    };

    const handleConfirmShare = async ({ mispServerIds, organizationIds }) => {
        if ((mispServerIds?.length ?? 0) === 0 && (organizationIds?.length ?? 0) === 0) {
            showError('Please select at least one destination (MISP server or organization).');
            return;
        }

        setShowShareModal(false);
        setSharing(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${SERVER_URL}/event/share-aggregated/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...jsonData,
                    eventsId: selectedEventIds,
                    misp_server_ids: mispServerIds ?? [],
                    organization_ids: organizationIds ?? [],
                }),
            });

            const responseData = await response.json();
            if (response.ok) {
                const successfulShares = responseData.results.filter(r => r.success).length;
                const totalShares = responseData.results.length;
                showSuccess(`Aggregated event shared successfully with ${successfulShares} out of ${totalShares} recipients.`);
            } else {
                showError(responseData.error || 'Failed to share aggregated event.');
            }
        } catch (error) {
            console.error('Failed to share aggregated event:', error);
            showError('Server connection error.');
        } finally {
            setSharing(false);
        }
    };

    useEffect(() => {
        if (location.state && location.state.selectedEventIds) {
            setSelectedEventIds(location.state.selectedEventIds);
                    }
    }, [location.state]);

    useEffect(() => {
        const fetchEventData = async () => {
            // Wait until the selected ids are populated from navigation state,
            // and only fetch once.
            if (isDataFetched || selectedEventIds.length === 0) return;

            try {
                const token = localStorage.getItem('accessToken');
                const response = await fetch(`${SERVER_URL}/event/aggregate/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ eventsId: selectedEventIds }),
                });
                if (!response.ok) {
                    throw new Error(`Aggregation request failed (${response.status})`);
                }
                const result = await response.json();
                setJsonData(result.data);
                setSelectedEventIds(result.eventsId);
                setIsDataFetched(true);
            } catch (error) {
                console.error('Failed to aggregate events:', error);
            }
        };

        fetchEventData();
    }, [selectedEventIds, isDataFetched]);

    return(
        <div className="mi-aggregation">
            <div className="mi-page-head">
                <div>
                    <h1>Aggregated Event</h1>
                    <div className="mi-sub">Review and share the combined view of the selected events.</div>
                </div>
                <div className="mi-page-head__actions">
                    <button onClick={() => navigate(-1)} className="btn btn-outline-secondary">
                        <i className="bi bi-arrow-left me-1"></i> Go Back
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={!jsonData || sharing}>
                        <i className="bi bi-share me-1"></i> {sharing ? 'Sharing…' : 'Share Aggregated Event'}
                    </button>
                </div>
            </div>

            <div className="mi-card">
                <div className="mi-card__body">
                    {jsonData ? (
                        <EventViewer ref={eventViewerRef} data={jsonData} />
                    ) : (
                        <p className="mb-0">Loading...</p>
                    )}
                </div>
            </div>

            <ShareEventModal
                show={showShareModal}
                onClose={() => setShowShareModal(false)}
                onConfirm={handleConfirmShare}
                eventId={selectedEventIds[0]}
            />
        </div>
    );

};

export default Aggregation;