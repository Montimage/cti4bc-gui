import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../NavBar/NavBar';

const SERVER_URL = process.env.REACT_APP_API_URL;

// Helper function to format dates properly to avoid timezone issues
const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    
    return dateString;
};

const formatDeletedAtDisplay = (dateString) => {
    if (!dateString) return '';
    
    const [datePart, timePart] = dateString.split(' ');
    const [year, month, day] = datePart.split('-');
    const [hours, minutes, seconds] = timePart.split(':');
    
    const date = new Date(Date.UTC(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        parseInt(hours, 10),
        parseInt(minutes, 10),
        parseInt(seconds, 10)
    ));
    
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
            
            const csvContent = sortedShareLogs.map(log => {
                const mispServers = extractMispServers(log);
                return [
                    `"${log.event_info.replace(/"/g, '""')}"`,
                    `"${log.organization.replace(/"/g, '""')}"`,
                    `"${log.shared_by.username} (${log.shared_by.email})"`,
                    formatDateDisplay(log.shared_at),
                    `"${formatMispServers(mispServers)}"`,
                    log.event_id
                ].join(',');
            });
            
            const csvString = [
                headers.join(','),
                ...csvContent
            ].join('\n');
            
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `share-logs-export-${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
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
        <div className="container mt-4" style={{ transition: 'none' }}>
            <NavBar />
            
            <div className="d-flex justify-content-between align-items-center mb-4" style={{ transition: 'none' }}>
                <h2 style={{ transition: 'none' }}>Event Share Logs</h2>
            </div>

            {/* Filters Card */}
            <div className="card mb-4" style={{ transition: 'none' }}>
                <div className="card-body" style={{ transition: 'none' }}>
                    <h5 className="card-title mb-3" style={{ transition: 'none' }}>Filters</h5>
                    <div className="row g-3" style={{ transition: 'none' }}>
                        <div className="col-md-3" style={{ transition: 'none' }}>
                            <div className="form-floating" style={{ transition: 'none' }}>
                            <select 
                                className="form-select" 
                                id="organization"
                                value={selectedOrg} 
                                onChange={(e) => setSelectedOrg(e.target.value)}
                                style={{ transition: 'none' }}
                            >
                                <option value="">All Organizations</option>
                                {organizations.map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                            <label htmlFor="organization" style={{ transition: 'none' }}>Organization</label>
                            </div>
                        </div>
                        <div className="col-md-2" style={{ transition: 'none' }}>
                            <div className="form-floating" style={{ transition: 'none' }}>
                                <select 
                                    className="form-select" 
                                    id="statusFilter"
                                    value={statusFilter} 
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{ transition: 'none' }}
                                >
                                    <option value="all">All</option>
                                    <option value="shared">Shared (Green)</option>
                                    <option value="unshared">Unshared (Red)</option>
                                </select>
                                <label htmlFor="statusFilter" style={{ transition: 'none' }}>Status</label>
                            </div>
                        </div>
                        <div className="col-md-2" style={{ transition: 'none' }}>
                            <div className="form-floating" style={{ transition: 'none' }}>
                                <input
                                    type="date"
                                    className="form-control"
                                    id="startDate"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{ transition: 'none' }}
                                />
                                <label htmlFor="startDate" style={{ transition: 'none' }}>Start Date</label>
                            </div>
                        </div>
                        <div className="col-md-2" style={{ transition: 'none' }}>
                            <div className="form-floating" style={{ transition: 'none' }}>
                                <input
                                    type="date"
                                    className="form-control"
                                    id="endDate"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{ transition: 'none' }}
                                />
                                <label htmlFor="endDate" style={{ transition: 'none' }}>End Date</label>
                            </div>
                        </div>
                        <div className="col-md-3" style={{ transition: 'none' }}>
                            <div className="form-floating" style={{ transition: 'none' }}>
                                <select 
                                    id="dataFormat"
                                    className="form-select" 
                                    value={dataFormat} 
                                    onChange={(e) => setDataFormat(e.target.value)}
                                    style={{ transition: 'none' }}
                                >
                                    <option value="json">JSON</option>
                                    <option value="csv">CSV</option>
                                </select>
                                <label htmlFor="dataFormat" style={{ transition: 'none' }}>Format</label>
                            </div>
                        </div>
                        
                        <div className="row g-3 align-items-center mt-3" style={{ transition: 'none' }}>
                            <div className="col-12 d-flex justify-content-end gap-2" style={{ transition: 'none' }}>
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={resetFilters}
                                    style={{ transition: 'none', width: '150px' }}
                                >
                                    Reset Filters
                                </button>
                                <button 
                                    className="btn btn-info text-white" 
                                    onClick={handleViewData}
                                    style={{ transition: 'none', width: '150px' }}
                                >
                                    {showData ? `Hide ${dataFormat.toUpperCase()}` : `View ${dataFormat.toUpperCase()}`}
                                </button>
                                <button 
                                    className="btn btn-success" 
                                    onClick={handleExport}
                                    style={{ transition: 'none', width: '150px' }}
                                >
                                    Export as {dataFormat.toUpperCase()}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* JSON/CSV Viewer */}
            {showData && (
                <div className="card mb-4" style={{ transition: 'none' }}>
                    <div className="card-body" style={{ transition: 'none' }}>
                        <h5 className="card-title" style={{ transition: 'none' }}>{dataFormat === 'json' ? 'JSON Data' : 'CSV Data'}</h5>
                        <div className="p-3 rounded" style={{ 
                            overflowX: 'auto', 
                            maxHeight: '500px', 
                            backgroundColor: '#2c3034', 
                            color: 'white',
                            transition: 'none' 
                        }}>
                            <pre style={{ transition: 'none' }}>{formatData()}</pre>
                        </div>
                    </div>
                </div>
            )}

            {/* Table of logs */}
            <div className="table-responsive" style={{ transition: 'none', width: '100%'}}>
                <table className="table table-hover" style={{ transition: 'none', width: '100%', tableLayout: 'fixed' }}>
                    <thead style={{ transition: 'none' }}>
                        <tr style={{ transition: 'none' }}>
                            <th style={{ width: '5%', textAlign: 'center', transition: 'none', whiteSpace: 'nowrap', overflow: 'hidden' }}>Status</th>
                            <th className="sortable-header" onClick={() => handleSortChange('event_info')} style={{ width: '15%', transition: 'none' }}>
                                Event Info{getSortIndicator('event_info')}
                            </th>
                            <th className="sortable-header" onClick={() => handleSortChange('organization')} style={{ width: '11%', textAlign: 'center', transition: 'none' }}>
                                Organization{getSortIndicator('organization')}
                            </th>
                            <th className="sortable-header" onClick={() => handleSortChange('shared_by')} style={{ width: '20%', transition: 'none' }}>
                                Shared By{getSortIndicator('shared_by')}
                            </th>
                            <th className="sortable-header" onClick={() => handleSortChange('shared_at')} style={{ width: '10%', transition: 'none' }}>
                                Shared At{getSortIndicator('shared_at')}
                            </th>
                            <th className="sortable-header" onClick={() => handleSortChange('misp_servers')} style={{ width: '11%', textAlign: 'center', transition: 'none' }}>
                                MISP Servers{getSortIndicator('misp_servers')}
                            </th>
                            <th className="sortable-header" onClick={() => handleSortChange('deleted_by')} style={{ width: '20%', transition: 'none' }}>
                                Deleted By{getSortIndicator('deleted_by')}
                            </th>
                            <th className="sortable-header" onClick={() => handleSortChange('deleted_at')} style={{ width: '10%', transition: 'none' }}>
                                Deleted At{getSortIndicator('deleted_at')}
                            </th>
                            <th className="text-center" style={{ width: '8%', transition: 'none' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ transition: 'none' }}>
                        {sortedShareLogs.map((log) => {
                            const mispServers = extractMispServers(log);
                            return (
                                <tr key={log.id} style={{ transition: 'none' }}>
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle', transition: 'none' }}>
                                        <div 
                                            style={{ 
                                                width: '12px', 
                                                height: '12px', 
                                                borderRadius: '50%', 
                                                backgroundColor: log.is_unshared ? '#dc3545' : '#28a745',
                                                margin: '0 auto',
                                                transition: 'none'
                                            }} 
                                            title={log.is_unshared ? "Unshared" : "Shared"}
                                        />
                                    </td>
                                    <td style={{ 
                                        transition: 'none', 
                                        wordBreak: 'break-word', 
                                        whiteSpace: 'normal', 
                                        overflow: 'hidden' 
                                    }}>{log.event_info}</td>
                                    <td style={{ 
                                        transition: 'none', 
                                        wordBreak: 'break-word',
                                        whiteSpace: 'normal',
                                        overflow: 'hidden',
                                        textAlign: 'center'
                                    }}>{log.organization}</td>
                                    <td style={{ 
                                        transition: 'none',
                                        wordBreak: 'break-word',
                                        whiteSpace: 'normal',
                                        overflow: 'hidden'
                                    }}>
                                        <div className="d-flex flex-column" style={{ transition: 'none' }}>
                                            <span style={{ transition: 'none' }}><strong>Username:</strong> {log.shared_by.username}</span>
                                            <span style={{ transition: 'none' }}><strong>Email:</strong> {log.shared_by.email}</span>
                                        </div>
                                    </td>
                                    <td style={{ 
                                        transition: 'none',
                                        wordBreak: 'break-word',
                                        whiteSpace: 'normal',
                                        overflow: 'hidden'
                                    }}>{formatDateDisplay(log.shared_at)}</td>
                                    <td style={{ 
                                        transition: 'none',
                                        textAlign: 'center',
                                        verticalAlign: 'middle'
                                    }}>
                                        {mispServers.length > 0 ? (
                                            <span 
                                                className="badge rounded-pill" 
                                                style={{
                                                    fontSize: '0.9rem',
                                                    padding: '8px 14px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease',
                                                    backgroundColor: '#0d6efd'
                                                }}
                                                onClick={() => handleMispServersClick(mispServers)}
                                                onMouseOver={(e) => e.target.style.backgroundColor = '#0257d5'}
                                                onMouseOut={(e) => e.target.style.backgroundColor = '#0d6efd'}
                                                title="Click to view MISP servers"
                                            >
                                                {mispServers.length} {mispServers.length === 1 ? 'server' : 'servers'}
                                            </span>
                                        ) : (
                                            <span className="badge bg-secondary">None</span>
                                        )}
                                    </td>
                                    <td style={{ 
                                        transition: 'none',
                                        wordBreak: 'break-word',
                                        whiteSpace: 'normal',
                                        overflow: 'hidden'
                                    }}>
                                        {log.deleted_by ? (
                                            <div className="d-flex flex-column" style={{ transition: 'none' }}>
                                                <span style={{ transition: 'none' }}><strong>Username:</strong> {log.deleted_by.username}</span>
                                                <span style={{ transition: 'none' }}><strong>Email:</strong> {log.deleted_by.email}</span>
                                            </div>
                                        ) : ''}
                                    </td>
                                    <td style={{ 
                                        transition: 'none',
                                        wordBreak: 'break-word',
                                        whiteSpace: 'normal',
                                        overflow: 'hidden'
                                    }}>
                                        {formatDeletedAtDisplay(log.deleted_at) || ''}
                                    </td>
                                    <td className="text-center" style={{ 
                                        transition: 'none',
                                        wordBreak: 'break-word',
                                        whiteSpace: 'normal',
                                        overflow: 'hidden'
                                    }}>
                                        <button 
                                            className="btn btn-link"
                                            onClick={() => navigate(`/event/${log.event_id}`)}
                                            style={{ transition: 'none' }}
                                        >
                                            View Event
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {sortedShareLogs.length === 0 && (
                            <tr style={{ transition: 'none' }}>
                                <td colSpan="9" className="text-center py-3" style={{ transition: 'none' }}>
                                    No share logs found matching your criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
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