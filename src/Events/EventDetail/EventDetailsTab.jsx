import React from "react";
import "./EventDetail.css";

const EventDetails = ({ jsonData, onUpdate }) => {
    if (!jsonData) {
        return <p>Loading event details...</p>;
    }

    const handleTextChange = (property, newValue) => {
        onUpdate(prevEvent => ({ ...prevEvent, [property]: newValue }));
    };

    const handleSelectChange = (property, newValue) => {
        onUpdate(prevEvent => ({
            ...prevEvent,
            [property]: typeof prevEvent[property] === "object" ? 
                { ...prevEvent[property], action: newValue } : 
                newValue
        }));
    };

    const handleCheckboxChange = (property, checked) => {
        if (property === "published" && checked) {
            onUpdate(prevEvent => ({ ...prevEvent, published: true, locked: false }));
            return;
        }
        if (property === "locked" && checked) {
            onUpdate(prevEvent => ({ ...prevEvent, locked: true, published: false }));
            return;
        }
        onUpdate(prevEvent => ({ ...prevEvent, [property]: checked }));
    };

    return (
        <div className="container mt-4">
            <h2>Organization</h2>
            <table className="table table-hover">
                <tbody>
                {jsonData && (
                    <>
                    <tr><td>Organization ID</td><td>{jsonData.org_id}</td><td></td></tr>
                    <tr><td>Event creator organization ID</td><td>{jsonData.orgc_id}</td><td></td></tr>
                    <tr><td>Creator Email</td>
                    <td>
                        <input
                        type="text"
                        value={jsonData.event_creator_email || ''}
                        onChange={(e) => handleTextChange('event_creator_email', e.target.value)}/>
                    </td>
                    <td></td></tr>
                    <tr><td>Lock Email Notifications</td>
                    <td>
                        <input
                        type="checkbox"
                        checked={jsonData.proposal_email_lock}
                        onChange={(e) => handleCheckboxChange('proposal_email_lock', e.target.checked)}/>
                    </td>
                    <td></td></tr>
                    <tr><td>Shared Date</td>
                    <td className="d-flex align-items-center">
                        <span className="text-nowrap me-3">{jsonData.shared_date || '-'}</span>
                    </td>
                    <td></td></tr>
                    </>
                )}
                </tbody>
            </table>

            <h2>Event Details</h2>
            <table className="table table-hover">
                <tbody>
                    <tr>
                        <td>Detection Date</td>
                        <td>
                        <div className="d-flex align-items-center">
                            <span className="text-nowrap">{jsonData.date.value}</span>
                            <select 
                                value={jsonData.date.action} 
                                onChange={(e) => handleSelectChange("date", e.target.value)}
                                className="form-select ms-2"
                            >
                                <option value="%Y-%m-%d">Complete Date</option>
                                <option value="%Y">Year</option>
                                <option value="%Y-%m">Year and Month</option>
                            </select>
                            <span className="badge bg-primary ms-2">AWARE4BC</span>
                        </div>
                       </td>
                    </tr>
                    <tr>
                        <td>Info</td>
                        <td>
                        <div className="d-flex align-items-center">
                            <textarea
                                className="form-control"
                                value={jsonData.info}
                                onChange={(e) => handleTextChange("info", e.target.value)}
                            />
                            <span className="badge bg-primary ms-2">AWARE4BC</span>
                        </div>
                        </td>
                    </tr>
                    <tr>
                        <td>Threat Level</td>
                        <td>
                            <select 
                                value={jsonData.threat_level_id} 
                                onChange={(e) => handleSelectChange("threat_level_id", e.target.value)}
                                className="form-select"
                            >
                                <option value="1">High</option>
                                <option value="2">Medium</option>
                                <option value="3">Low</option>
                                <option value="4">Undefined</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>Analysis</td>
                        <td>
                            <select 
                                value={jsonData.analysis} 
                                onChange={(e) => handleSelectChange("analysis", e.target.value)}
                                className="form-select"
                            >
                                <option value="0">Initial</option>
                                <option value="1">Ongoing</option>
                                <option value="2">Complete</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>Distribution</td>
                        <td>
                            <select 
                                value={jsonData.distribution} 
                                onChange={(e) => handleSelectChange("distribution", e.target.value)}
                                className="form-select"
                            >
                                <option value="0">This organization only</option>
                                <option value="1">This community only</option>
                                <option value="2">Connected communities</option>
                                <option value="3">All communities</option>
                                <option value="4">Sharing group</option>
                                <option value="5">Inherit event</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>Published</td>
                        <td>
                            <input
                                type="checkbox"
                                checked={jsonData.published}
                                onChange={(e) => handleCheckboxChange("published", e.target.checked)}
                                disabled={jsonData.locked}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>Lock Event</td>
                        <td>
                            <input
                                type="checkbox"
                                checked={jsonData.locked}
                                onChange={(e) => handleCheckboxChange("locked", e.target.checked)}
                                disabled={jsonData.published}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>Disable Correlation</td>
                        <td>
                            <input
                                type="checkbox"
                                checked={jsonData.disable_correlation}
                                onChange={(e) => handleCheckboxChange("disable_correlation", e.target.checked)}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default EventDetails;