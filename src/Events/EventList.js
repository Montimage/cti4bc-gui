import React, {useState, useEffect} from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import { useNavigate } from 'react-router-dom';
import './EventList.css';
import NavBar from '../NavBar/NavBar';
import { useToast } from '../components/Toast';

const SERVER_URL = process.env.REACT_APP_API_URL;

function EventList() {
    const { showError } = useToast();
    const [events, setEvents] = useState([]);
    const [activeCard, setActiveCard] = useState(null);
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    
    const [sortField, setSortField] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');
    const [searchInfo, setSearchInfo] = useState('');
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrg, setSelectedOrg] = useState('all');

    const navigate = useNavigate();
    const threatLevels = {
        1: 'High',
        2: 'Medium',
        3: 'Low',
        4: 'Undefined'
    };
    
    const shareStatusValues = {
        'Shared in Time': 1,
        'Shared Late': 2,
        'Waiting to be Shared': 3,
        'Expired': 4
    };

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        fetch(`${SERVER_URL}/event/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })
            .then(res => {
                if(!res.ok) {
                    throw new Error('Failed to fetch events');
                }
                return res.json();
            })
            .then(data => {
                setEvents(data.events);
                
                const uniqueOrgs = [...new Set(data.events.map(event => event.organization))];
                const orgOptions = uniqueOrgs.map(org => ({
                    id: org,
                    name: org
                })).filter(org => org.name); 
                
                setOrganizations(orgOptions);
            })
            .catch(error => {
                showError("Unable to fetch events. Please try again later.");
            });
    }, []);

    const handleDetailsClick = (event) => {
        navigate(`/event/${event.id}`);
    }

    const handleCheckboxChange = (eventId) => {
        setSelectedEvents(prevSelectedEvents => {
            const newSelectedEvents = prevSelectedEvents.includes(eventId)
                ? prevSelectedEvents.filter(id => id !== eventId)
                : [...prevSelectedEvents, eventId];

            setSelectAll(newSelectedEvents.length === events.length);
            return newSelectedEvents;
        });
    };

    const handleSelectAllChange = () => {
        if (selectAll) {
            setSelectedEvents([]);
        } else {
            setSelectedEvents(events.map(event => event.id));
        }
        setSelectAll(!selectAll);
    };

    const handleShareTogether = () => {
        navigate('/aggregation', { state: { selectedEventIds: selectedEvents } });
    };

    const highThreatEventsCount = events.filter(event => Number(event.threat_level_id) === 1).length;
    const sharedEventsCount = events.filter(event => event.shared).length;
    const sharedEventsPercentage = events.length > 0 ? (sharedEventsCount / events.length * 100).toFixed(2) : 0;
    
    const now = new Date();
    const recentActivityCount = events.filter(event => {
        const eventDate = new Date(event.date);
        return (now - eventDate) <= (24 * 60 * 60 * 1000);
    }).length;

    const getShareStatus = (event) => {
        const eventDate = new Date(event.date);
        const now = new Date();
        const timeDiff = now - eventDate;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (!event.shared && hoursDiff > 24) {
            return "Expired";
        } else if (event.shared) {
            const sharedDate = new Date(event.shared_at);
            const shareTimeDiff = sharedDate - eventDate;
            const shareHoursDiff = shareTimeDiff / (1000 * 60 * 60);
            
            if (shareHoursDiff <= 24) {
                return "Shared in Time";
            } else {
                return "Shared Late";
            }
        } else {
            return "Waiting to be Shared";
        }
    };

    const handleSortChange = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            if (field === 'info' || field === 'organization') {
                setSortDirection('asc');
            } 
            else if (field === 'date' || field === 'shared_at') {
                setSortDirection('desc');
            }
            else {
                setSortDirection('asc');
            }
        }
    };

    const getSortIndicator = (field) => {
        if (sortField === field) {
            return sortDirection === 'asc' ? ' ▲' : ' ▼';
        }
        return '';
    };

    const getFilteredAndSortedEvents = () => {
        let filtered = [...events];
        
        if (activeCard === 'highThreat') {
            filtered = filtered.filter(event => Number(event.threat_level_id) === 1);
        } else if (activeCard === 'notShared') {
            filtered = filtered.filter(event => event.shared);
        } else if (activeCard === 'recentActivity') {
            filtered = filtered.filter(event => {
                const eventDate = new Date(event.date);
                return (now - eventDate) <= (24 * 60 * 60 * 1000);
            });
        }
        
        if (searchInfo.trim() !== '') {
            const searchLower = searchInfo.toLowerCase();
            filtered = filtered.filter(event => 
                event.info.toLowerCase().includes(searchLower)
            );
        }
        
        if (selectedOrg !== 'all') {
            filtered = filtered.filter(event => event.organization === selectedOrg);
        }
        
        filtered.sort((a, b) => {
            let comparison = 0;
            
            switch (sortField) {
                case 'info':
                    comparison = a.info.localeCompare(b.info);
                    break;
                case 'organization':
                    comparison = a.organization.localeCompare(b.organization);
                    break;
                case 'threat_level':
                    comparison = Number(a.threat_level_id) - Number(b.threat_level_id);
                    break;
                case 'share_status':
                    const statusA = getShareStatus(a);
                    const statusB = getShareStatus(b);
                    comparison = shareStatusValues[statusA] - shareStatusValues[statusB];
                    break;
                case 'date':
                    comparison = new Date(a.date) - new Date(b.date);
                    break;
                case 'shared_at':
                    if (!a.shared && !b.shared) comparison = 0;
                    else if (!a.shared) comparison = 1;
                    else if (!b.shared) comparison = -1;
                    else comparison = new Date(a.shared_at) - new Date(b.shared_at);
                    break;
                default:
                    comparison = 0;
            }
            
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        
        return filtered;
    };

    const filteredEvents = getFilteredAndSortedEvents();

    const resetFilters = () => {
        setActiveCard(null);
        setSortField('date');
        setSortDirection('desc');
        setSearchInfo('');
        setSelectedOrg('all');
    };

    return (
    <div>
        <div className="container mt-3">
            <NavBar />
            
            <div className="row mb-4">
                <div className="col">
                    <div 
                        className={`card text-center clickable-card ${activeCard === 'highThreat' ? 'active-card' : ''}`}
                        onClick={() => setActiveCard(activeCard === 'highThreat' ? null : 'highThreat')}
                        style={{ transition: 'none' }}
                    >
                        <div className="card-body fixed-height">
                            <h5 className="card-title">High Threat Events</h5>
                            <p className="card-text">{highThreatEventsCount}</p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div 
                        className={`card text-center clickable-card ${activeCard === 'notShared' ? 'active-card' : ''}`}
                        onClick={() => setActiveCard(activeCard === 'notShared' ? null : 'notShared')}
                        style={{ transition: 'none' }}
                    >
                        <div className="card-body fixed-height">
                            <h5 className="card-title">Shared Events</h5>
                            <p className="card-text">{sharedEventsPercentage}%</p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div 
                        className={`card text-center clickable-card ${activeCard === 'recentActivity' ? 'active-card' : ''}`}
                        onClick={() => setActiveCard(activeCard === 'recentActivity' ? null : 'recentActivity')}
                        style={{ transition: 'none' }}
                    >
                        <div className="card-body fixed-height">
                            <h5 className="card-title">Recent Activity</h5>
                            <p className="card-text">{recentActivityCount}</p>
                            <p className="card-text">events in the last 24h</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card mb-4" style={{ transition: 'none' }}>
                <div className="card-body">
                    <div className="d-flex flex-wrap align-items-center justify-content-between">
                        <div className="d-flex gap-3 mb-2 mb-md-0">
                            <div className="input-group flex-nowrap" style={{ width: 'auto' }}>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search in Info"
                                    value={searchInfo}
                                    onChange={(e) => setSearchInfo(e.target.value)}
                                    style={{ transition: 'none' }}
                                />
                            </div>
                            
                            <div className="input-group flex-nowrap" style={{ width: 'auto' }}>
                                <select 
                                    className="form-select" 
                                    value={selectedOrg} 
                                    onChange={(e) => setSelectedOrg(e.target.value)}
                                    style={{ transition: 'none' }}
                                >
                                    <option value="all">All Organizations</option>
                                    {organizations.map(org => (
                                        <option key={org.id} value={org.name}>{org.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="d-flex align-items-center gap-2">
                            {selectedEvents.length > 1 && (
                                <button className="btn btn-primary" onClick={() => handleShareTogether()} style={{ transition: 'none' }}>
                                    Share Together
                                </button>
                            )}
                            <button 
                                className="btn btn-outline-secondary" 
                                onClick={resetFilters}
                                style={{ transition: 'none' }}
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="table-responsive" style={{ transition: 'none' }}>
                <table className="table table-hover" style={{ transition: 'none' }}>
                    <thead style={{ transition: 'none' }}>
                        <tr style={{ transition: 'none' }}>
                            <th style={{width: '1%', transition: 'none'}}>
                                <input 
                                    type="checkbox" 
                                    checked={selectAll}
                                    onChange={handleSelectAllChange}
                                    style={{ transition: 'none' }}
                                />
                            </th>
                            <th className="sortable-header" onClick={() => handleSortChange('info')} style={{ transition: 'none' }}>
                                Info{getSortIndicator('info')}
                            </th>
                            <th className="sortable-header" onClick={() => handleSortChange('organization')} style={{ width: '10%', textAlign: 'center', transition: 'none' }}>
                                Organization{getSortIndicator('organization')}
                            </th>
                            <th className="sortable-header" onClick={() => handleSortChange('threat_level')} style={{ width: '10%', textAlign: 'center', transition: 'none' }}>
                                Threat Level{getSortIndicator('threat_level')}
                            </th>
                            <th className="sortable-header text-center-column" onClick={() => handleSortChange('share_status')} style={{ transition: 'none' }}>
                                Share Status{getSortIndicator('share_status')}
                            </th>
                            <th className="sortable-header" onClick={() => handleSortChange('date')} style={{ transition: 'none' }}>
                                Arrival Date{getSortIndicator('date')}
                            </th>
                            <th className="sortable-header" onClick={() => handleSortChange('shared_at')} style={{ transition: 'none' }}>
                                Shared Date{getSortIndicator('shared_at')}
                            </th>
                            <th style={{width: '100px', transition: 'none'}}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEvents.map((event, index) => (
                            <tr key={index} style={{ transition: 'none' }}>
                                <td className="text-center" style={{ transition: 'none' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedEvents.includes(event.id)}
                                        onChange={() => handleCheckboxChange(event.id)}
                                        style={{ transition: 'none' }}
                                    />
                                </td>
                                <td style={{ transition: 'none' }}>{event.info}</td>
                                <td style={{ 
                                    transition: 'none', 
                                    wordBreak: 'break-word',
                                    whiteSpace: 'normal',
                                    overflow: 'hidden',
                                    textAlign: 'center' }}>{event.organization || "N/A"}</td>
                                <td style={{ 
                                    transition: 'none', 
                                    wordBreak: 'break-word',
                                    whiteSpace: 'normal',
                                    overflow: 'hidden',
                                    textAlign: 'center' }}>{threatLevels[event.threat_level_id]}</td>
                                <td className="text-center-column" style={{ transition: 'none' }}>
                                    <span className={`badge ${getShareStatus(event) === "Shared in Time" ? "bg-success" : 
                                                        getShareStatus(event) === "Shared Late" ? "bg-success" : 
                                                        getShareStatus(event) === "Expired" ? "bg-danger" : 
                                                    "bg-warning"}`}
                                        style={{ transition: 'none' }}>
                                        {getShareStatus(event)}
                                    </span>
                                </td>
                                <td style={{ transition: 'none' }}>{event.date}</td>
                                <td style={{ transition: 'none' }}>{event.shared ? event.shared_at : '-'}</td>
                                <td style={{ transition: 'none' }}>
                                    <button 
                                        className="btn btn-link p-0"
                                        onClick={() => handleDetailsClick(event)}
                                        style={{ transition: 'none' }}
                                    >
                                        Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                        
                        {filteredEvents.length === 0 && (
                            <tr style={{ transition: 'none' }}>
                                <td colSpan="8" className="text-center py-3" style={{ transition: 'none' }}>
                                    No events match the selected filter criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    );
}

export default EventList;