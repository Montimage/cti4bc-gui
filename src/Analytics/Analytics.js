import React, { useState, useEffect } from 'react';
// Suppression of useNavigate import as it is no longer used directly in this component
import NavBar from '../NavBar/NavBar';
import { useTheme } from '../ThemeContext';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import 'bootstrap/dist/css/bootstrap.min.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const SERVER_URL = process.env.REACT_APP_API_URL;

const colorPalette = {
    primary: [
        'rgba(52, 152, 219, 1)',  // #3498db
        'rgba(41, 128, 185, 1)',  // #2980b9
        'rgba(26, 188, 156, 1)',  // #1abc9c
        'rgba(22, 160, 133, 1)'   // #16a085
    ],
    danger: [
        'rgba(231, 76, 60, 1)',   // #e74c3c
        'rgba(192, 57, 43, 1)',   // #c0392b
        'rgba(211, 84, 0, 1)',    // #d35400
        'rgba(230, 126, 34, 1)'   // #e67e22
    ],
    success: [
        'rgba(46, 204, 113, 1)',  // #2ecc71
        'rgba(39, 174, 96, 1)',   // #27ae60
        'rgba(34, 153, 84, 1)',   // #229954
        'rgba(30, 132, 73, 1)'    // #1e8449
    ],
    warning: [
        'rgba(241, 196, 15, 1)',  // #f1c40f
        'rgba(243, 156, 18, 1)',  // #f39c12
        'rgba(214, 137, 16, 1)',  // #d68910
        'rgba(185, 119, 14, 1)'   // #b9770e
    ],
    neutral: [
        'rgba(149, 165, 166, 1)', // #95a5a6
        'rgba(127, 140, 141, 1)', // #7f8c8d
        'rgba(112, 123, 124, 1)', // #707b7c
        'rgba(97, 106, 107, 1)'   // #616a6b
    ]
};

const addAlpha = (rgbaColor, alpha) => {
    return rgbaColor.replace(/1\)$/, `${alpha})`);
};

function Analytics() {
    // Removal of unused navigate declaration
    const { theme } = useTheme();
    const [timeRange, setTimeRange] = useState('day');
    const [attackTypeFilter, setAttackTypeFilter] = useState('all');
    const [dashboardType, setDashboardType] = useState('event'); // 'event' or 'ip'
    const [allEvents, setAllEvents] = useState([]);
    const [ipData, setIpData] = useState({
        ipRecords: [],
        ipStats: {
            totalIps: 0,
            maliciousCount: 0,
            cleanCount: 0,
            unknownCount: 0,
            avgThreatScore: 0,
            sourceDistribution: {},
            threatScoreRanges: {
                critical: 0, // 80-100
                high: 0,     // 60-79
                medium: 0,   // 40-59
                low: 0,      // 20-39
                minimal: 0   // 0-19
            },
            kafkaSourceIps: {}
        }
    });
    const [stats, setStats] = useState({
        totalEvents: 0,
        threatLevels: {
            high: 0,
            medium: 0,
            low: 0,
            undefined: 0
        },
        shareStatus: {
            sharedInTime: 0,
            sharedLate: 0,
            expired: 0,
            pending: 0
        },
        frequencyData: {
            day: [],
            week: [],
            month: []
        },
        monthlyTrends: {
            events: [],
            shares: []
        },
        responseMetrics: {
            avgResponseTime: 0,
            quickestResponse: 0,
            slowestResponse: 0
        },
        attackTypes: {}
    });

    useEffect(() => {
        const getChartConfig = () => {
            const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            const textColor = theme === 'dark' ? '#e0e0e0' : '#666';

            ChartJS.defaults.color = textColor;
            ChartJS.defaults.scale.grid.color = gridColor;
            ChartJS.defaults.scale.ticks.color = textColor;
        };

        getChartConfig();
    }, [theme]);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        
        fetch(`${SERVER_URL}/event/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })
        .then(res => res.json())
        .then(data => {
            const events = data.events || [];
            setAllEvents(events);
            
            const attackTypes = events.reduce((acc, event) => {
                const info = event.info || "Unknown";
                acc[info] = (acc[info] || 0) + 1;
                return acc;
            }, {});
            
            setStats(prevStats => ({
                ...prevStats,
                attackTypes
            }));
        });
    }, []);

    useEffect(() => {
        if (allEvents.length === 0) return;
        
        const filteredEvents = allEvents.filter(event => {
            return attackTypeFilter === 'all' || event.info === attackTypeFilter;
        });
        
        const now = new Date();
        
        const threatLevels = {
            high: filteredEvents.filter(event => Number(event.threat_level_id) === 1).length,
            medium: filteredEvents.filter(event => Number(event.threat_level_id) === 2).length,
            low: filteredEvents.filter(event => Number(event.threat_level_id) === 3).length,
            undefined: filteredEvents.filter(event => Number(event.threat_level_id) === 4).length
        };

        const shareStatus = filteredEvents.reduce((acc, event) => {
            const eventDate = new Date(event.date);
            const timeDiff = now - eventDate;
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            if (event.shared) {
                const sharedDate = new Date(event.shared_at);
                const shareTimeDiff = sharedDate - eventDate;
                const shareHoursDiff = shareTimeDiff / (1000 * 60 * 60);
                
                if (shareHoursDiff <= 24) {
                    acc.sharedInTime++;
                } else {
                    acc.sharedLate++;
                }
            } else if (hoursDiff > 24) {
                acc.expired++;
            } else {
                acc.pending++;
            }
            return acc;
        }, { sharedInTime: 0, sharedLate: 0, expired: 0, pending: 0 });

        const responseTimes = filteredEvents
            .filter(event => event.shared)
            .map(event => {
                const shareDate = new Date(event.shared_at);
                const eventDate = new Date(event.date);
                return (shareDate - eventDate) / (1000 * 60 * 60);
            });

        const responseMetrics = {
            avgResponseTime: responseTimes.length > 0 ? 
                responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
            quickestResponse: Math.min(...(responseTimes.length ? responseTimes : [0])),
            slowestResponse: Math.max(...(responseTimes.length ? responseTimes : [0]))
        };

        const monthlyTrends = calculateMonthlyTrends(filteredEvents);
        const frequencyData = {
            day: calculateFrequency(filteredEvents, 'day', now),
            week: calculateFrequency(filteredEvents, 'week', now),
            month: calculateFrequency(filteredEvents, 'month', now)
        };

        setStats(prevStats => ({
            ...prevStats,
            totalEvents: filteredEvents.length,
            threatLevels,
            shareStatus,
            frequencyData,
            monthlyTrends,
            responseMetrics
        }));
    }, [attackTypeFilter, allEvents]);

    // Fetch IP reputation data
    useEffect(() => {
        if (dashboardType !== 'ip') return;
        
        const token = localStorage.getItem('accessToken');
        
        // Fetch IP reputation records
        fetch(`${SERVER_URL}/ip_reputation/records/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })
        .then(res => res.json())
        .then(data => {
            const records = data || [];
            setIpData(prevData => ({
                ...prevData,
                ipRecords: records
            }));
            
            // Calculate statistics
            if (records.length > 0) {
                const totalIps = records.length;
                const maliciousCount = records.filter(ip => ip.is_malicious === true).length;
                const cleanCount = records.filter(ip => ip.is_malicious === false).length;
                const unknownCount = records.filter(ip => ip.is_malicious === null).length;
                
                // Calculate average threat score
                const totalThreatScore = records.reduce((acc, ip) => acc + (ip.threat_score || 0), 0);
                const avgThreatScore = totalThreatScore / totalIps;
                
                // Group by reporting sources
                const sourceDistribution = {};
                records.forEach(ip => {
                    if (ip.reported_by) {
                        Object.keys(ip.reported_by).forEach(source => {
                            sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;
                        });
                    }
                });
                
                // Group by threat score ranges
                const threatScoreRanges = {
                    critical: records.filter(ip => ip.threat_score >= 80).length,
                    high: records.filter(ip => ip.threat_score >= 60 && ip.threat_score < 80).length,
                    medium: records.filter(ip => ip.threat_score >= 40 && ip.threat_score < 60).length,
                    low: records.filter(ip => ip.threat_score >= 20 && ip.threat_score < 40).length,
                    minimal: records.filter(ip => ip.threat_score < 20).length
                };
                
                // Update state with calculated stats
                setIpData(prevData => ({
                    ...prevData,
                    ipStats: {
                        ...prevData.ipStats,
                        totalIps,
                        maliciousCount,
                        cleanCount,
                        unknownCount,
                        avgThreatScore,
                        sourceDistribution,
                        threatScoreRanges
                    }
                }));
            }
        })
        .catch(error => {
                    });
        
        // Fetch Kafka message IPs
        fetch(`${SERVER_URL}/consumer/messages/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })
        .then(res => res.json())
        .then(data => {
            const messages = data.messages || [];
            const kafkaSourceIps = {};
            
            // Extract IPs from Kafka messages
            messages.forEach(msg => {
                try {
                    const parsedMsg = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
                    if (parsedMsg && parsedMsg.src_ip) {
                        kafkaSourceIps[parsedMsg.src_ip] = (kafkaSourceIps[parsedMsg.src_ip] || 0) + 1;
                    }
                } catch (e) {
                                    }
            });
            
            setIpData(prevData => ({
                ...prevData,
                ipStats: {
                    ...prevData.ipStats,
                    kafkaSourceIps
                }
            }));
        })
        .catch(error => {
                    });
    }, [dashboardType]);

    const calculateMonthlyTrends = (events) => {
        const last6Months = Array.from({ length: 6 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            return date.toLocaleString('en-US', { month: 'short' });
        }).reverse();

        const monthlyEvents = last6Months.map(month => ({
            month,
            events: events.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate.toLocaleString('en-US', { month: 'short' }) === month;
            }).length
        }));

        const monthlyShares = last6Months.map(month => ({
            month,
            shares: events.filter(event => {
                const eventDate = new Date(event.shared_at);
                return eventDate && eventDate.toLocaleString('en-US', { month: 'short' }) === month;
            }).length
        }));

        return {
            events: monthlyEvents,
            shares: monthlyShares
        };
    };

    const calculateFrequency = (events, period, now) => {
        const periods = {
            day: { count: 24, unit: 'hours' },
            week: { count: 7, unit: 'days' },
            month: { count: 30, unit: 'days' }
        };

        const result = [];
        const periodConfig = periods[period];

        for (let i = periodConfig.count - 1; i >= 0; i--) {
            const date = new Date(now);
            if (period === 'day') {
                date.setHours(date.getHours() - i);
                date.setMinutes(0, 0, 0);
            } else {
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
            }

            const nextDate = new Date(date);
            if (period === 'day') {
                nextDate.setHours(date.getHours() + 1);
            } else {
                nextDate.setDate(date.getDate() + 1);
            }

            const count = events.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate >= date && eventDate < nextDate;
            }).length;

            result.push({
                label: date.toLocaleString('en-US', { 
                    hour: period === 'day' ? 'numeric' : undefined,
                    weekday: period === 'week' ? 'short' : undefined,
                    day: period === 'month' ? 'numeric' : undefined,
                    month: period === 'month' ? 'short' : undefined
                }),
                count
            });
        }

        return result;
    };

    const chartConfigs = {
        threatLevel: {
            data: {
                labels: ['High', 'Medium', 'Low', 'Undefined'],
                datasets: [{
                    data: [
                        stats.threatLevels.high,
                        stats.threatLevels.medium,
                        stats.threatLevels.low,
                        stats.threatLevels.undefined
                    ],
                    backgroundColor: colorPalette.danger,
                    borderWidth: 0
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: { padding: 20 }
                    }
                }
            }
        },
        shareStatus: {
            data: {
                labels: ['Shared in Time', 'Shared Late', 'Expired', 'Pending'],
                datasets: [{
                    data: [
                        stats.shareStatus.sharedInTime,
                        stats.shareStatus.sharedLate,
                        stats.shareStatus.expired,
                        stats.shareStatus.pending
                    ],
                    backgroundColor: [
                        colorPalette.success[0],
                        colorPalette.warning[0],
                        colorPalette.danger[0],
                        colorPalette.neutral[0]
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: { padding: 20 }
                    }
                }
            }
        },
        frequency: {
            data: {
                labels: stats.frequencyData[timeRange].map(item => item.label),
                datasets: [{
                    label: 'Events',
                    data: stats.frequencyData[timeRange].map(item => item.count),
                    backgroundColor: colorPalette.primary[0],
                    borderColor: colorPalette.primary[0],
                    borderWidth: 1
                }]
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        },
        monthlyTrends: {
            data: {
                labels: stats.monthlyTrends.events.map(item => item.month),
                datasets: [
                    {
                        label: 'Events',
                        data: stats.monthlyTrends.events.map(item => item.events),
                        backgroundColor: addAlpha(colorPalette.primary[0], 0.5),
                        borderColor: colorPalette.primary[0],
                        borderWidth: 2,
                        tension: 0.4
                    },
                    {
                        label: 'Shares',
                        data: stats.monthlyTrends.shares.map(item => item.shares),
                        backgroundColor: addAlpha(colorPalette.success[0], 0.5),
                        borderColor: colorPalette.success[0],
                        borderWidth: 2,
                        tension: 0.4
                    }
                ]
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                },
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: { padding: 20 }
                    }
                }
            }
        },
        responseMetrics: {
            data: {
                labels: ['Average Response Time', 'Quickest Response', 'Slowest Response'],
                datasets: [{
                    data: [
                        stats.responseMetrics.avgResponseTime,
                        stats.responseMetrics.quickestResponse,
                        stats.responseMetrics.slowestResponse
                    ],
                    backgroundColor: [
                        colorPalette.primary[0],
                        colorPalette.success[0],
                        colorPalette.danger[0]
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const labels = [
                                    'Average time taken to share events across all incidents',
                                    'Fastest sharing time recorded for any event',
                                    'Longest sharing time recorded for any event'
                                ];
                                return `${context.raw.toFixed(1)}h - ${labels[context.dataIndex]}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Hours'
                        }
                    }
                }
            }
        },
        attackTypes: {
            data: {
                labels: Object.keys(stats.attackTypes || {}),
                datasets: [{
                    data: Object.values(stats.attackTypes || {}),
                    backgroundColor: [
                        'rgba(52, 152, 219, 1)',
                        'rgba(231, 76, 60, 1)',
                        'rgba(46, 204, 113, 1)',
                        'rgba(241, 196, 15, 1)',
                        'rgba(155, 89, 182, 1)',
                        'rgba(230, 126, 34, 1)',
                        'rgba(52, 73, 94, 1)',
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'right',
                        labels: { padding: 20 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${value} events (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        }
    };

    const ipChartConfigs = {
        maliciousStatus: {
            data: {
                labels: ['Malicious', 'Clean', 'Unknown'],
                datasets: [{
                    data: [
                        ipData.ipStats.maliciousCount,
                        ipData.ipStats.cleanCount,
                        ipData.ipStats.unknownCount
                    ],
                    backgroundColor: [
                        colorPalette.danger[0],
                        colorPalette.success[0],
                        colorPalette.neutral[0]
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: { padding: 20 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${value} IPs (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        },
        threatScoreRanges: {
            data: {
                labels: ['Critical (80-100)', 'High (60-79)', 'Medium (40-59)', 'Low (20-39)', 'Minimal (0-19)'],
                datasets: [{
                    data: [
                        ipData.ipStats.threatScoreRanges.critical,
                        ipData.ipStats.threatScoreRanges.high,
                        ipData.ipStats.threatScoreRanges.medium,
                        ipData.ipStats.threatScoreRanges.low,
                        ipData.ipStats.threatScoreRanges.minimal
                    ],
                    backgroundColor: [
                        colorPalette.danger[0],
                        colorPalette.danger[1],
                        colorPalette.warning[0],
                        colorPalette.warning[1],
                        colorPalette.success[0]
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: { padding: 20 }
                    }
                }
            }
        },
        reportingSources: {
            data: {
                labels: Object.keys(ipData.ipStats.sourceDistribution || {}),
                datasets: [{
                    data: Object.values(ipData.ipStats.sourceDistribution || {}),
                    backgroundColor: [
                        colorPalette.primary[0],
                        colorPalette.danger[0],
                        colorPalette.success[0],
                        colorPalette.warning[0]
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'right',
                        labels: { padding: 20 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const source = context.label;
                                return `${source}: ${value} detections`;
                            }
                        }
                    }
                }
            }
        },
        kafkaSourceIps: {
            data: {
                labels: Object.keys(ipData.ipStats.kafkaSourceIps || {}),
                datasets: [{
                    label: 'Occurrences in Kafka Messages',
                    data: Object.values(ipData.ipStats.kafkaSourceIps || {}),
                    backgroundColor: colorPalette.primary.map(color => addAlpha(color, 0.7)),
                    borderColor: colorPalette.primary[0],
                    borderWidth: 1
                }]
            },
            options: {
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Occurrences'
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        }
    };

    const handleAttackTypeFilterChange = (e) => {
        const newAttackTypeFilter = e.target.value;
        setAttackTypeFilter(newAttackTypeFilter);
    };
    
    const handleDashboardToggle = (type) => {
        setDashboardType(type);
    };

    return (
        <div className="container-fluid mt-4 px-4 theme-transition">
            <NavBar />

            <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="mb-0">{dashboardType === 'event' ? 'Event Analytics Dashboard' : 'IP Analytics Dashboard'}</h2>
                    
                    <div className="btn-group mx-auto">
                        <button 
                            className={`btn ${dashboardType === 'event' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => handleDashboardToggle('event')}
                        >
                            Event Analytics
                        </button>
                        <button 
                            className={`btn ${dashboardType === 'ip' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => handleDashboardToggle('ip')}
                        >
                            IP Analytics
                        </button>
                    </div>
                    
                    {dashboardType === 'event' ? (
                        <div className="d-flex align-items-center gap-3">
                            <span className="text-muted fw-bold">Filters:</span>
                            <div className="d-flex gap-2" style={{ minWidth: '250px' }}>
                                <select 
                                    className="form-select"
                                    value={attackTypeFilter}
                                    onChange={handleAttackTypeFilterChange}
                                    style={{ minWidth: '200px', transition: 'none' }}
                                >
                                    <option value="all">All Attack Types</option>
                                    {Object.keys(stats.attackTypes || {}).filter(type => type !== "Unknown").map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div style={{ minWidth: '250px' }}></div> // Empty space to maintain alignment when filters are not visible
                    )}
                </div>
            </div>

            {dashboardType === 'event' ? (
                // Event Analytics Dashboard
                <>
                    <div className="row g-4 mb-4">
                        <div className="col-md-3">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">Total Events</h5>
                                    <h2 className="display-4 text-center my-3">{stats.totalEvents}</h2>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">Shared Events</h5>
                                    <h2 className="display-4 text-center my-3">
                                        {stats.totalEvents ? ((stats.shareStatus.sharedInTime + stats.shareStatus.sharedLate) / stats.totalEvents * 100).toFixed(1) : 0}%
                                    </h2>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">High Threat Events</h5>
                                    <h2 className="display-4 text-center my-3">
                                        {stats.threatLevels.high}
                                    </h2>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">Avg Response Time</h5>
                                    <h2 className="display-4 text-center my-3">
                                        {stats.responseMetrics.avgResponseTime.toFixed(1)}h
                                    </h2>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">Threat Level Distribution</h5>
                                    <div style={{ height: '300px' }} className="d-flex align-items-center">
                                        <Doughnut 
                                            data={chartConfigs.threatLevel.data}
                                            options={chartConfigs.threatLevel.options}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="col-md-4">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">Share Status Distribution</h5>
                                    <div style={{ height: '300px' }} className="d-flex align-items-center">
                                        <Doughnut 
                                            data={chartConfigs.shareStatus.data}
                                            options={chartConfigs.shareStatus.options}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-4">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">Attack Types Distribution</h5>
                                    <div style={{ height: '300px' }} className="d-flex align-items-center">
                                        <Doughnut 
                                            data={chartConfigs.attackTypes.data}
                                            options={chartConfigs.attackTypes.options}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-12">
                            <div className="card">
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="d-flex align-items-center">
                                            <h5 className="card-title mb-0">Event Frequency</h5>
                                            <span 
                                                className="ms-2" 
                                                style={{ cursor: 'help' }}
                                                title="Distribution of events over the selected time period"
                                            >
                                                ⓘ
                                            </span>
                                        </div>
                                        <div className="btn-group">
                                            <button 
                                                className={`btn ${timeRange === 'day' ? 'btn-primary' : 'btn-outline-primary'}`}
                                                onClick={() => setTimeRange('day')}
                                            >
                                                Day
                                            </button>
                                            <button 
                                                className={`btn ${timeRange === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
                                                onClick={() => setTimeRange('week')}
                                            >
                                                Week
                                            </button>
                                            <button 
                                                className={`btn ${timeRange === 'month' ? 'btn-primary' : 'btn-outline-primary'}`}
                                                onClick={() => setTimeRange('month')}
                                            >
                                                Month
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ height: '300px' }}>
                                        <Bar 
                                            data={chartConfigs.frequency.data}
                                            options={chartConfigs.frequency.options}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row g-4">
                        <div className="col-md-12">
                            <div className="card">
                                <div className="card-body">
                                    <h5 className="card-title">Monthly Activity Trends</h5>
                                    <div style={{ height: '300px' }}>
                                        <Line 
                                            data={chartConfigs.monthlyTrends.data}
                                            options={chartConfigs.monthlyTrends.options}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                // IP Analytics Dashboard
                <>
                    <div className="row g-4 mb-4">
                        <div className="col-md-3">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">Total IPs Analyzed</h5>
                                    <h2 className="display-4 text-center my-3">{ipData.ipStats.totalIps}</h2>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">Malicious IPs</h5>
                                    <h2 className="display-4 text-center my-3">
                                        {ipData.ipStats.maliciousCount}
                                    </h2>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">Average Threat Score</h5>
                                    <h2 className="display-4 text-center my-3">
                                        {ipData.ipStats.avgThreatScore.toFixed(1)}
                                    </h2>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">Kafka Source IPs</h5>
                                    <h2 className="display-4 text-center my-3">
                                        {Object.keys(ipData.ipStats.kafkaSourceIps || {}).length}
                                    </h2>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">IP Status Distribution</h5>
                                    <div style={{ height: '300px' }} className="d-flex align-items-center">
                                        <Doughnut 
                                            data={ipChartConfigs.maliciousStatus.data}
                                            options={ipChartConfigs.maliciousStatus.options}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">Threat Score Distribution</h5>
                                    <div style={{ height: '300px' }} className="d-flex align-items-center">
                                        <Doughnut 
                                            data={ipChartConfigs.threatScoreRanges.data}
                                            options={ipChartConfigs.threatScoreRanges.options}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card h-100">
                                <div className="card-body">
                                    <h5 className="card-title">Reporting Sources</h5>
                                    <div style={{ height: '300px' }} className="d-flex align-items-center">
                                        <Doughnut 
                                            data={ipChartConfigs.reportingSources.data}
                                            options={ipChartConfigs.reportingSources.options}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="row g-4 mb-4">
                        <div className="col-md-12">
                            <div className="card">
                                <div className="card-body">
                                    <h5 className="card-title">IP Reputation Data</h5>
                                    <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                                        <table className="table table-striped table-hover">
                                            <thead className="sticky-top bg-body">
                                                <tr>
                                                    <th>IP Address</th>
                                                    <th>Status</th>
                                                    <th>Threat Score</th>
                                                    <th>Confidence</th>
                                                    <th>Sources</th>
                                                    <th>Last Checked</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ipData.ipRecords.map((ip, index) => (
                                                    <tr key={index} className={ip.is_malicious ? (theme === 'dark' ? 'border border-danger' : 'table-danger') : ''} 
                                                        style={ip.is_malicious && theme === 'dark' ? { backgroundColor: 'rgba(220, 53, 69, 0.2)' } : {}}>
                                                        <td>{ip.ip_address}</td>
                                                        <td>
                                                            {ip.is_malicious === true && <span className="badge bg-danger">Malicious</span>}
                                                            {ip.is_malicious === false && <span className="badge bg-success">Clean</span>}
                                                            {ip.is_malicious === null && <span className="badge bg-secondary">Unknown</span>}
                                                        </td>
                                                        <td>
                                                            <div className="progress" style={{ height: '20px' }}>
                                                                <div 
                                                                    className={`progress-bar ${ip.threat_score > 60 ? 'bg-danger' : ip.threat_score > 40 ? 'bg-warning' : 'bg-success'}`} 
                                                                    role="progressbar" 
                                                                    style={{ width: `${ip.threat_score}%` }}
                                                                    aria-valuenow={ip.threat_score} 
                                                                    aria-valuemin="0" 
                                                                    aria-valuemax="100"
                                                                >
                                                                    {ip.threat_score.toFixed(1)}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>{ip.confidence_score.toFixed(1)}</td>
                                                        <td>{ip.reported_by ? Object.keys(ip.reported_by).join(", ") : "None"}</td>
                                                        <td>{new Date(ip.last_checked).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default Analytics;
