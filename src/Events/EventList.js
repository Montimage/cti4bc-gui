import React, {useState, useEffect} from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import { useNavigate } from 'react-router-dom';
import './EventList.css';
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
    <div className="mi-events">
        <div className="mi-page-head">
            <div>
                <h1>Threat Events</h1>
                <div className="mi-sub">Manage, anonymize and share MISP events across partner organizations.</div>
            </div>
            <div className="mi-page-head__actions">
                {selectedEvents.length > 1 && (
                    <button className="btn btn-primary" onClick={() => handleShareTogether()}>
                        <i className="bi bi-diagram-3 me-1"></i> Share Together
                    </button>
                )}
                <button className="btn btn-outline-secondary" onClick={resetFilters}>
                    <i className="bi bi-arrow-counterclockwise me-1"></i> Reset Filters
                </button>
            </div>
        </div>

        {/* Stat cards — clickable filters preserved (set activeCard) */}
        <div className="mi-stats">
            <div className="mi-stat">
                <div className="mi-stat__label">Total Events</div>
                <div className="mi-stat__value">{events.length}</div>
                <div className="mi-stat__delta">all organizations</div>
            </div>
            <div
                className={`mi-stat mi-clickable ${activeCard === 'highThreat' ? 'mi-active' : ''}`}
                onClick={() => setActiveCard(activeCard === 'highThreat' ? null : 'highThreat')}
            >
                <div className="mi-stat__label">High Threat Events</div>
                <div className="mi-stat__value">{highThreatEventsCount}</div>
                <div className="mi-stat__delta">click to filter</div>
            </div>
            <div
                className={`mi-stat mi-clickable ${activeCard === 'notShared' ? 'mi-active' : ''}`}
                onClick={() => setActiveCard(activeCard === 'notShared' ? null : 'notShared')}
            >
                <div className="mi-stat__label">Shared Events</div>
                <div className="mi-stat__value"><span className="mi-accent">{sharedEventsPercentage}%</span></div>
                <div className="mi-stat__delta">click to filter</div>
            </div>
            <div
                className={`mi-stat mi-clickable ${activeCard === 'recentActivity' ? 'mi-active' : ''}`}
                onClick={() => setActiveCard(activeCard === 'recentActivity' ? null : 'recentActivity')}
            >
                <div className="mi-stat__label">Recent Activity</div>
                <div className="mi-stat__value">{recentActivityCount}</div>
                <div className="mi-stat__delta">events in the last 24h</div>
            </div>
        </div>

        {/* Filters toolbar */}
        <div className="mi-toolbar">
            <div className="mi-field" style={{ flex: '1 1 240px' }}>
                <label>Search</label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Search in Info"
                    value={searchInfo}
                    onChange={(e) => setSearchInfo(e.target.value)}
                />
            </div>
            <div className="mi-field">
                <label>Organization</label>
                <select
                    className="form-select"
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                >
                    <option value="all">All Organizations</option>
                    {organizations.map(org => (
                        <option key={org.id} value={org.name}>{org.name}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Events table */}
        <div className="mi-card">
            {selectedEvents.length > 0 && (
                <div className="mi-selbar">
                    <input type="checkbox" className="mi-check" checked={selectAll} onChange={handleSelectAllChange} />
                    <span><b>{selectedEvents.length} event{selectedEvents.length > 1 ? 's' : ''}</b> selected</span>
                    {selectedEvents.length > 1 && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleShareTogether()}>
                            <i className="bi bi-diagram-3 me-1"></i> Share Together
                        </button>
                    )}
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => { setSelectedEvents([]); setSelectAll(false); }}
                    >
                        <i className="bi bi-x-lg me-1"></i> Clear
                    </button>
                </div>
            )}
            <div className="mi-table-wrap">
                <table className="mi-tbl">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input type="checkbox" className="mi-check" checked={selectAll} onChange={handleSelectAllChange} />
                            </th>
                            <th className="mi-sortable" onClick={() => handleSortChange('info')}>Info{getSortIndicator('info')}</th>
                            <th className="mi-sortable" onClick={() => handleSortChange('organization')}>Organization{getSortIndicator('organization')}</th>
                            <th className="mi-sortable" onClick={() => handleSortChange('threat_level')}>Threat Level{getSortIndicator('threat_level')}</th>
                            <th className="mi-sortable" onClick={() => handleSortChange('share_status')}>Share Status{getSortIndicator('share_status')}</th>
                            <th className="mi-sortable" onClick={() => handleSortChange('date')}>Arrival Date{getSortIndicator('date')}</th>
                            <th className="mi-sortable" onClick={() => handleSortChange('shared_at')}>Shared Date{getSortIndicator('shared_at')}</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEvents.map((event, index) => {
                            const status = getShareStatus(event);
                            const statusClass = status === 'Shared in Time' ? 'mi-success'
                                : status === 'Shared Late' ? 'mi-info'
                                : status === 'Expired' ? 'mi-danger' : 'mi-warning';
                            const tl = threatLevels[event.threat_level_id];
                            const tlClass = tl === 'High' ? 'mi-danger' : tl === 'Medium' ? 'mi-warning' : tl === 'Low' ? 'mi-success' : 'mi-neutral';
                            return (
                                <tr key={index}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            className="mi-check"
                                            checked={selectedEvents.includes(event.id)}
                                            onChange={() => handleCheckboxChange(event.id)}
                                        />
                                    </td>
                                    <td className="mi-ev-title">{event.info}</td>
                                    <td>{event.organization || "N/A"}</td>
                                    <td><span className={`mi-badge ${tlClass}`}><span className="mi-led"></span> {tl}</span></td>
                                    <td><span className={`mi-badge ${statusClass}`}><span className="mi-led"></span> {status}</span></td>
                                    <td>{event.date}</td>
                                    <td>{event.shared ? event.shared_at : '-'}</td>
                                    <td>
                                        <div className="mi-row-actions" style={{ justifyContent: 'flex-end' }}>
                                            <button
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={() => handleDetailsClick(event)}
                                            >
                                                Details
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {filteredEvents.length === 0 && (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--mi-muted)' }}>
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