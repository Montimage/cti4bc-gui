import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildCsv, downloadCsv } from '../csv';

const SERVER_URL = process.env.REACT_APP_API_URL;

// Helper function to format dates properly to avoid timezone issues
const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    
    return dateString;
};

const formatDeletedAtDisplay = (dateString) => {
    if (!dateString) return '';
    
    // Accepts both 'YYYY-MM-DD HH:MM:SS' and ISO 'YYYY-MM-DDTHH:MM:SSZ'; a
    // trailing 'Z' lands in seconds and parseInt reads it as 0, which matches
    // the UTC assumption below. Falls back to the raw value if unparseable.
    const [datePart, timePart] = String(dateString).split(/[ T]/);
    const [year, month, day] = (datePart || '').split('-');
    const [hours, minutes, seconds] = (timePart || '').split(':');
    
    const date = new Date(Date.UTC(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        parseInt(hours, 10) || 0,
        parseInt(minutes, 10) || 0,
        parseInt(seconds, 10) || 0
    ));
    
    if (Number.isNaN(date.getTime())) return String(dateString);
    
    const localOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() - localOffset);
    
    const formatted = adjustedDate.toISOString().slice(0, 19).replace('T', ' ');
    return formatted;
};

// Helper function to extract MISP server information
const extractMispServers = (log) => {
    if (!log.data || !log.data.sharing_results) return [];
    
    // Include all sharing results with their success status
    return log.data.sharing_results.map(result => ({
        id: result.server_id,
        name: result.server_name,
        success: result.success
    }));
};

// Format MISP servers for display
const formatMispServers = (mispServers) => {
    if (!mispServers || mispServers.length === 0) return 'None';
    
    const successfulServers = mispServers.filter(server => server.success);
    return successfulServers.map(server => server.name).join(', ');
};

// Component to display MISP server details in a modal
const MispServerDetails = ({ servers, isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">MISP Servers Details</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {servers.length === 0 ? (
                            <p className="text-muted">No MISP servers were used for this share.</p>
                        ) : (
                            <div>
                                <p className="mb-3">This event was shared with the following MISP servers:</p>
                                
                                <div className="mb-3 p-2 border rounded" style={{
                                    backgroundColor: 'var(--bs-tertiary-bg)',
                                    color: 'var(--bs-body-color)'
                                }}>
                                    <p className="mb-2 fw-bold">Status indicators:</p>
                                    <div className="d-flex align-items-center mb-1">
                                        <div 
                                            style={{
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                backgroundColor: '#00cf2f',
                                                display: 'inline-block',
                                                marginRight: '8px'
                                            }}
                                        />
                                        <span>Success - The event was successfully shared to this server</span>
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <div 
                                            style={{
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                backgroundColor: '#f71a2f',
                                                display: 'inline-block',
                                                marginRight: '8px'
                                            }}
                                        />
                                        <span>Failed - The sharing operation failed for this server</span>
                                    </div>
                                </div>
                                
                                <div className="list-group">
                                    {servers.map((server, index) => (
                                        <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                            <strong>{server.name}</strong>
                                            <div 
                                                className={`status-indicator ${server.success ? 'status-success' : 'status-failed'}`}
                                                style={{
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '50%',
                                                    backgroundColor: server.success ? '#00cf2f' : '#f71a2f',
                                                    display: 'inline-block'
                                                }}
                                                title={server.success ? "Success" : "Failed"}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EventShareLogs = () => {
    const [shareLogs, setShareLogs] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrg, setSelectedOrg] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showData, setShowData] = useState(false);
    const [dataFormat, setDataFormat] = useState('json');
    const [sortField, setSortField] = useState('shared_at');
    const [sortDirection, setSortDirection] = useState('desc');
    const [statusFilter, setStatusFilter] = useState('all'); 
    const [selectedServers, setSelectedServers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const navigate = useNavigate();
    
    const fetchShareLogs = async (orgId = '', start = '', end = '') => {
        const token = localStorage.getItem('accessToken');
        try {
            let url = `${SERVER_URL}/event/share-logs/`;
            const params = new URLSearchParams();
            if (orgId) params.append('organization', orgId);
            if (start) params.append('start_date', start);
            if (end) params.append('end_date', end);
            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            setShareLogs(data.share_logs);
            setOrganizations(data.organizations);
        } catch (error) {
                    }
    };
    
    useEffect(() => {
        fetchShareLogs();
    }, []);
    
    useEffect(() => {
        fetchShareLogs(selectedOrg, startDate, endDate);
    }, [selectedOrg, startDate, endDate]);
    
    const resetFilters = () => {
        setSelectedOrg('');
        setStartDate('');
        setEndDate('');
        setStatusFilter('all');
        setShowData(false);
    };
    
    const handleExport = () => {
        if (dataFormat === 'json') {
            const exportData = sortedShareLogs.map(log => {
                const logDataCopy = JSON.parse(JSON.stringify(log.data));
                if (logDataCopy && logDataCopy.sharing_results) {
                    delete logDataCopy.sharing_results;
                }
                return logDataCopy;
            });
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `share-logs-export-${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            const headers = ['Event Info', 'Organization', 'Shared By', 'Shared At', 'MISP Servers', 'Event ID'];

            const rows = sortedShareLogs.map(log => [
                log.event_info || '',
                log.organization || '',
                `${log.shared_by?.username || ''} (${log.shared_by?.email || ''})`,
                formatDateDisplay(log.shared_at),
                formatMispServers(extractMispServers(log)),
                log.event_id
            ]);

            downloadCsv(
                buildCsv(headers, rows),
                `share-logs-export-${new Date().toISOString().slice(0,10)}.csv`
            );
        }
    };
    
    const handleViewData = () => {
        setShowData(!showData);
    };
    
    const formatData = () => {
        if (dataFormat === 'json') {
            const exportData = sortedShareLogs.map(log => {
                const logDataCopy = JSON.parse(JSON.stringify(log.data));
                if (logDataCopy && logDataCopy.sharing_results) {
                    delete logDataCopy.sharing_results;
                }
                return logDataCopy;
            });
            
            return JSON.stringify(exportData, null, 2);
        } else {
            const headers = ['Event Info', 'Organization', 'Shared By', 'Shared At', 'MISP Servers', 'Delete By', 'Delete At', 'Event ID'];
            
            const csvContent = sortedShareLogs.map(log => {
                const mispServers = extractMispServers(log);
                return [
                    `"${log.event_info.replace(/"/g, '""')}"`,
                    `"${log.organization.replace(/"/g, '""')}"`,
                    `"${log.shared_by.username} (${log.shared_by.email})"`,
                    formatDateDisplay(log.shared_at),
                    `"${formatMispServers(mispServers)}"`,
                    log.deleted_by ? `"${log.deleted_by.username} (${log.deleted_by.email})"` : '""',
                    log.deleted_at ? formatDeletedAtDisplay(log.deleted_at) : '',
                    log.event_id
                ].join(',');
            });
            
            return [
                headers.join(','),
                ...csvContent
            ].join('\n');
        }
    };

    const handleSortChange = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            if (field === 'event_info' || field === 'organization') {
                setSortDirection('asc');
            } 
            else if (field === 'shared_at') {
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

    const getSortedLogs = () => {
        if (!shareLogs || shareLogs.length === 0) {
            return [];
        }
        
        // Filter by status
        let filtered = [...shareLogs];
        if (statusFilter === 'shared') {
            filtered = filtered.filter(log => !log.is_unshared);
        } else if (statusFilter === 'unshared') {
            filtered = filtered.filter(log => log.is_unshared);
        }
        
        // Sort the filtered logs
        filtered.sort((a, b) => {
            let comparison = 0;
            
            switch (sortField) {
                case 'event_info':
                    comparison = a.event_info.localeCompare(b.event_info);
                    break;
                case 'organization':
                    comparison = a.organization.localeCompare(b.organization);
                    break;
                case 'shared_by':
                    comparison = a.shared_by.username.localeCompare(b.shared_by.username);
                    break;
                case 'shared_at':
                    comparison = new Date(a.shared_at) - new Date(b.shared_at);
                    break;
                case 'deleted_at':
                    if (!a.deleted_at && !b.deleted_at) return 0;
                    if (!a.deleted_at) return -1;
                    if (!b.deleted_at) return 1;
                    return new Date(a.deleted_at) - new Date(b.deleted_at);
                case 'deleted_by':
                    if (!a.deleted_by && !b.deleted_by) return 0;
                    if (!a.deleted_by) return -1;
                    if (!b.deleted_by) return 1;
                    return a.deleted_by.username.localeCompare(b.deleted_by.username);
                case 'misp_servers':
                    const aServers = extractMispServers(a);
                    const bServers = extractMispServers(b);
                    return aServers.length - bServers.length;
                default:
                    comparison = 0;
            }
            
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        
        return filtered;
    };

    // Handle click on the MISP servers badge
    const handleMispServersClick = (servers) => {
        setSelectedServers(servers);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const sortedShareLogs = getSortedLogs();
    
    return (
        <div className="mi-share-logs">
            
            <div className="mi-page-head">
                <div>
                    <h1>Event Share Logs</h1>
                    <div className="mi-sub">Audit trail of events shared with partner organizations and MISP servers.</div>
                </div>
            </div>

            {/* Filters toolbar */}
            <div className="mi-toolbar">
                <div className="mi-field" style={{ flex: '1 1 200px' }}>
                    <label htmlFor="organization">Organization</label>
                    <select className="form-select" id="organization" value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)}>
                        <option value="">All Organizations</option>
                        {organizations.map(org => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                    </select>
                </div>
                <div className="mi-field">
                    <label htmlFor="statusFilter">Status</label>
                    <select className="form-select" id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">All</option>
                        <option value="shared">Shared (Green)</option>
                        <option value="unshared">Unshared (Red)</option>
                    </select>
                </div>
                <div className="mi-field">
                    <label htmlFor="startDate">Start Date</label>
                    <input type="date" className="form-control" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="mi-field">
                    <label htmlFor="endDate">End Date</label>
                    <input type="date" className="form-control" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="mi-field">
                    <label htmlFor="dataFormat">Format</label>
                    <select id="dataFormat" className="form-select" value={dataFormat} onChange={(e) => setDataFormat(e.target.value)}>
                        <option value="json">JSON</option>
                        <option value="csv">CSV</option>
                    </select>
                </div>
                <div className="mi-toolbar__spacer"></div>
                <div className="mi-field" style={{ flexDirection: 'row', gap: '8px', alignItems: 'flex-end' }}>
                    <button className="btn btn-outline-secondary" onClick={resetFilters}>Reset Filters</button>
                    <button className="btn btn-outline-primary" onClick={handleViewData}>
                        {showData ? `Hide ${dataFormat.toUpperCase()}` : `View ${dataFormat.toUpperCase()}`}
                    </button>
                    <button className="btn btn-primary" onClick={handleExport}>Export as {dataFormat.toUpperCase()}</button>
                </div>
            </div>

            {/* JSON/CSV Viewer */}
            {showData && (
                <div className="mi-card" style={{ marginBottom: '16px' }}>
                    <div className="mi-card__head"><div className="mi-card__title">{dataFormat === 'json' ? 'JSON Data' : 'CSV Data'}</div></div>
                    <div className="mi-card__body">
                        <pre className="json" style={{ maxHeight: '500px', overflow: 'auto', margin: 0 }}>{formatData()}</pre>
                    </div>
                </div>
            )}

            {/* Logs table */}
            <div className="mi-card">
                <div className="mi-table-wrap">
                    <table className="mi-tbl">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'center' }}>Status</th>
                                <th className="mi-sortable" onClick={() => handleSortChange('event_info')}>Event Info{getSortIndicator('event_info')}</th>
                                <th className="mi-sortable" onClick={() => handleSortChange('organization')}>Organization{getSortIndicator('organization')}</th>
                                <th className="mi-sortable" onClick={() => handleSortChange('shared_by')}>Shared By{getSortIndicator('shared_by')}</th>
                                <th className="mi-sortable" onClick={() => handleSortChange('shared_at')}>Shared At{getSortIndicator('shared_at')}</th>
                                <th className="mi-sortable" onClick={() => handleSortChange('misp_servers')}>MISP Servers{getSortIndicator('misp_servers')}</th>
                                <th className="mi-sortable" onClick={() => handleSortChange('deleted_by')}>Deleted By{getSortIndicator('deleted_by')}</th>
                                <th className="mi-sortable" onClick={() => handleSortChange('deleted_at')}>Deleted At{getSortIndicator('deleted_at')}</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedShareLogs.map((log) => {
                                const mispServers = extractMispServers(log);
                                return (
                                    <tr key={log.id}>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`mi-badge ${log.is_unshared ? 'mi-danger' : 'mi-success'}`} title={log.is_unshared ? 'Unshared' : 'Shared'}>
                                                <span className="mi-led"></span> {log.is_unshared ? 'Unshared' : 'Shared'}
                                            </span>
                                        </td>
                                        <td className="mi-ev-title">{log.event_info}</td>
                                        <td>{log.organization}</td>
                                        <td>
                                            <div className="d-flex flex-column">
                                                <span><strong>Username:</strong> {log.shared_by.username}</span>
                                                <span><strong>Email:</strong> {log.shared_by.email}</span>
                                            </div>
                                        </td>
                                        <td>{formatDateDisplay(log.shared_at)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {mispServers.length > 0 ? (
                                                <span
                                                    className="mi-badge mi-info"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => handleMispServersClick(mispServers)}
                                                    title="Click to view MISP servers"
                                                >
                                                    {mispServers.length} {mispServers.length === 1 ? 'server' : 'servers'}
                                                </span>
                                            ) : (
                                                <span className="mi-badge mi-neutral"><span className="mi-led"></span> None</span>
                                            )}
                                        </td>
                                        <td>
                                            {log.deleted_by ? (
                                                <div className="d-flex flex-column">
                                                    <span><strong>Username:</strong> {log.deleted_by.username}</span>
                                                    <span><strong>Email:</strong> {log.deleted_by.email}</span>
                                                </div>
                                            ) : ''}
                                        </td>
                                        <td>{formatDeletedAtDisplay(log.deleted_at) || ''}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn btn-outline-primary btn-sm" onClick={() => navigate(`/event/${log.event_id}`)}>
                                                View Event
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {sortedShareLogs.length === 0 && (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--mi-muted)' }}>
                                        No share logs found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for MISP Servers details */}
            <MispServerDetails
                servers={selectedServers}
                isOpen={isModalOpen}
                onClose={closeModal}
            />
        </div>
    );
};

export default EventShareLogs;