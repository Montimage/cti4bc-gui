import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../../components/Toast';

const SERVER_URL = process.env.REACT_APP_API_URL;

const MISPServerSelector = ({ onServersSelected }) => {
    const { showError } = useToast();
    const { id: eventId } = useParams(); // Gets the event ID from the URL
    const [mispServers, setMispServers] = useState([]);
    const [selectedServers, setSelectedServers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Retrieve the list of MISP servers belonging to the same organization as the event
    useEffect(() => {
        const fetchMISPServers = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('accessToken');
                // Use the new endpoint to retrieve only MISP servers
                // belonging to the same organization as the event
                const response = await fetch(`${SERVER_URL}/misp_servers/for-event/${eventId}/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch MISP servers: ${response.statusText}`);
                }

                const data = await response.json();
                setMispServers(data);
            } catch (err) {
                showError('Failed to load MISP servers. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchMISPServers();
    }, [eventId, showError]);

    // Handle the selection/deselection of a server
    const handleServerCheckChange = (serverId) => {
        setSelectedServers(prevSelected => {
            if (prevSelected.includes(serverId)) {
                // Deselect the server
                return prevSelected.filter(id => id !== serverId);
            } else {
                // Select the server
                return [...prevSelected, serverId];
            }
        });
    };

    // Update parent component when selectedServers changes
    useEffect(() => {
        if (onServersSelected) {
            onServersSelected(selectedServers);
        }
    }, [selectedServers, onServersSelected]);

    // Select/deselect all servers
    const handleSelectAll = (select) => {
        if (select) {
            const allServerIds = mispServers.map(server => server.id);
            setSelectedServers(allServerIds);
        } else {
            setSelectedServers([]);
        }
    };

    if (loading) {
        return <div className="text-center my-3">Loading MISP servers...</div>;
    }

    if (mispServers.length === 0) {
        return (
            <div className="alert alert-warning my-3">
                No compatible MISP servers available for this event. 
                <br />
                <small className="text-muted">
                    Note: Events can only be shared with MISP servers associated with the same organization.
                </small>
            </div>
        );
    }

    return (
        <div className="misp-server-selector my-4">
            <h4 className="mb-3">Select MISP Servers to Share With</h4>
            
            <div className="alert alert-info mb-3">
                <i className="bi bi-info-circle me-2"></i>
                Only MISP servers associated with the same organization as this event are displayed.
            </div>
            
            <div className="mb-3">
                <button 
                    className="btn btn-sm btn-outline-primary me-2" 
                    onClick={() => handleSelectAll(true)}
                >
                    Select All
                </button>
                <button 
                    className="btn btn-sm btn-outline-secondary" 
                    onClick={() => handleSelectAll(false)}
                >
                    Clear Selection
                </button>
            </div>
            
            <div className="list-group">
                {mispServers.map(server => (
                    <div key={server.id} className="list-group-item">
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id={`server-${server.id}`}
                                checked={selectedServers.includes(server.id)}
                                onChange={() => handleServerCheckChange(server.id)}
                            />
                            <label className="form-check-label" htmlFor={`server-${server.id}`}>
                                <strong>{server.name}</strong> - {server.url}
                                <div className="text-muted small">Organizations: {server.organization_names?.join(', ') || 'N/A'}</div>
                            </label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MISPServerSelector;