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
        <div>
            <div className="d-flex justify-content-between align-items-center">
                <button onClick={() => navigate(-1)} className="btn btn-secondary m-3">
                    Go Back
                </button>
                <button className="btn btn-primary m-3" onClick={handleSave}>
                    Share Aggregated Event
                </button>
            </div>

            {jsonData ? (
                <>
                <EventViewer ref={eventViewerRef} data={jsonData} />
                </>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );

};

export default Aggregation;