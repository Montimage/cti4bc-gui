import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import EventViewer from '../EventDetail/EventViewer';

const SERVER_URL = process.env.REACT_APP_API_URL;

const Aggregation = () => {
    const [jsonData, setJsonData] = useState(null);
    const location = useLocation();
    const eventViewerRef = useRef(null);
    const navigate = useNavigate();
    const [selectedEventIds, setSelectedEventIds] = useState([]);
    const [isDataFetched, setIsDataFetched] = useState(false);

    const handleSave = () => {
            };

    useEffect(() => {
        if (location.state && location.state.selectedEventIds) {
            setSelectedEventIds(location.state.selectedEventIds);
                    }
    }, [location.state]);

    useEffect(() => {
        const fetchEventData = async () => {
            if(isDataFetched) return;

            try {
                const response = await fetch(`${SERVER_URL}/event/aggregate/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ eventsId: selectedEventIds }),
                });
                const result = await response.json();
                setJsonData(result.data);
                                setSelectedEventIds(result.eventsId);
                setIsDataFetched(true);
            } catch (error) {
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
                    <button className="btn btn-primary" onClick={handleSave}>
                        <i className="bi bi-share me-1"></i> Share Aggregated Event
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
        </div>
    );

};

export default Aggregation;