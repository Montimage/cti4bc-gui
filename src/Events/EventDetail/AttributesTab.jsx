import React, {useEffect} from "react";

const SERVER_URL = process.env.REACT_APP_API_URL;

const EventAttributes = ({ jsonData, onUpdate }) => {
    useEffect(() => {
        if (jsonData) {
            setTimeout(() => {
                ["RISK4BC", "SOAR4BC", "AWARE4BC"].forEach(source => {
                    jsonData.Attribute[source]?.forEach((_, index) => {
                        adjustTextareaHeight(source, index, "comment");
                        adjustTextareaHeight(source, index, "value");
                    });
                });
            }, 0);
        }
    }, [jsonData]);

    if (!jsonData) {
        return <p>Loading event attributes...</p>;
    }

    const handleRefresh = async (source) => {
        const confirmed = window.confirm(
            `This action will retrieve the latest available data from the system and attributes on this page will be overwritten.\n\n` +
            `Do you want to continue?`
        );
        if (!confirmed) return;

        let url = "";
        switch (source) {
            case "RISK4BC":
                url = `${SERVER_URL}/event/update_risk_profile/${jsonData.id}/`;
                break;
            case "SOAR4BC":
                url = `${SERVER_URL}/event/update_playbook/${jsonData.id}/`;
                break;
            default:
                console.error("Unknown source for refresh:", source);
                return;
        }

        try {
            const token = localStorage.getItem("accessToken");
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            console.log(`[refresh:${source}] response:`, response);

            if (response.status === 204){
                return;
            }

            if (!response.ok){
                throw new Error(`Failed to refresh ${source}: ${response.status}`);
            }

            const data = await response.json();

            const attrs = data?.Attribute?.[source];
            if (Array.isArray(attrs)){
                onUpdate(prevEvent => ({
                    ...prevEvent,
                    Attribute: {
                        ...prevEvent.Attribute,
                        [source]: attrs,
                    },
                }));
            } else {
                console.warn(`No valid ${source} attributes found in response`);
            }   
        } catch (error) {
            console.error(error);
            window.alert(`Error refreshing ${source}: ${error.message}`);
        }
    };

    const handleAttributeChange = (source, attrIndex, key, value) => {
        onUpdate(prevEvent => ({
            ...prevEvent,
            Attribute: {
                ...prevEvent.Attribute,
                [source]: prevEvent.Attribute[source].map((attr, i) => 
                    i === attrIndex ? { ...attr, [key]: value } : attr
                )
            }
        }));

        setTimeout(() => adjustTextareaHeight(source, attrIndex, key), 0);
    };

    const adjustTextareaHeight = (source, attrIndex, key) => {
        const textarea = document.getElementById(`${key}-${source}-${attrIndex}`);
        if (textarea) {
            textarea.style.height = "auto"; // Reset height first
            textarea.style.height = `${textarea.scrollHeight}px`; // Set height to content
        }
    };

    const handleAttributeActionOptionChange = (attrIndex, newOption) => {
        onUpdate(prevEvent => ({
            ...prevEvent,
            Attribute: {
                ...prevEvent.Attribute,
                AWARE4BC: prevEvent.Attribute.AWARE4BC.map((attr, i) => {
                    if (i === attrIndex) {
                        return { 
                            ...attr, 
                            action: {
                                ...attr.action,
                                option: newOption
                            }
                        };
                    }
                    return attr;
                })
            }         
        }));
    };

    const handleDeleteAttribute = (source, attrIndex) => {
        const isConfirmed = window.confirm("Are you sure you want to delete this attribute?");
        if (!isConfirmed) return;

        onUpdate(prevEvent => ({
            ...prevEvent,
            Attribute: {
                ...prevEvent.Attribute,
                [source]: prevEvent.Attribute[source].filter((_, i) => i !== attrIndex)
            }
        }));
    };

    const isValidIPv4 = (value) => {
        const ipv4Pattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipv4Pattern.test(value);
    };
    
    const isValidIPv6 = (value) => {
        const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}([0-9a-fA-F]{1,4}|:)$/;
        return ipv6Pattern.test(value);
    };
    
    const isValidIP = (value) => {
        return isValidIPv4(value) || isValidIPv6(value);
    };

    const handleAttributeActionChange = (attrIndex, newAction) => {
        onUpdate(prevEvent => ({
            ...prevEvent,
            Attribute: {
                ...prevEvent.Attribute,
                AWARE4BC: prevEvent.Attribute.AWARE4BC.map((attr, i) => {
                    if (i === attrIndex) {
                        return { ...attr, 
                                action: {
                                    ...attr.action,
                                    type: newAction,
                                    option: newAction === 'ipmask' ? attr.action.option : 'none'
                                    } 
                                };
                    }
                    return attr;
                })
            }         
        }));
    };

    return (
        <div className="container mt-4">
            {/* Risk Assessment */}
            <h2>Risk Assessment 
                <span className="badge bg-primary ms-2" style={{ fontSize: '0.9rem' }}>RISK4BC</span>
                <button
                    className="btn btn-link btn-sm ms-2 p-0"
                    style={{ fontSize: "1.25rem", verticalAlign: "middle" }}
                    onClick= {() => handleRefresh("RISK4BC")}
                >
                    <i className="bi bi-arrow-clockwise"></i>
                </button>
            </h2>
            {jsonData.Attribute.RISK4BC && jsonData.Attribute.RISK4BC.length > 0 ? (
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Type</th>
                            <th>Value</th>
                            <th>To IDS</th>
                            <th>Comment</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {jsonData.Attribute.RISK4BC.map((attr, index) => (
                            <tr key={index}>
                                <td>{attr.category}</td>
                                <td>{attr.type}</td>
                                <td>{attr.value}</td>
                                <td>
                                    <input 
                                        type="checkbox" 
                                        checked={attr.to_ids} 
                                        onChange={e => handleAttributeChange("RISK4BC", index, "to_ids", e.target.checked)}
                                    />
                                </td>
                                <td>
                                    <textarea
                                        id={`comment-RISK4BC-${index}`} 
                                        className="form-control"
                                        value={attr.comment} 
                                        onChange={e => handleAttributeChange("RISK4BC", index, "comment", e.target.value)}
                                    />
                                </td>
                                <td>
                                    <button className="btn btn-outline-danger" onClick={() => handleDeleteAttribute("RISK4BC", index)}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : <p>Risk assessment is not available yet</p>}

            {/* System Reaction */}
            <h2>System Reaction 
                <span className="badge bg-primary ms-2" style={{ fontSize: '0.9rem' }}>SOAR4BC</span>
                <button
                    className="btn btn-link btn-sm ms-2 p-0"
                    style={{ fontSize: "1.25rem", verticalAlign: "middle" }}
                    onClick= {() => handleRefresh("SOAR4BC")}
                >
                    <i className="bi bi-arrow-clockwise"></i>
                </button>
            </h2>
            {jsonData.Attribute.SOAR4BC && jsonData.Attribute.SOAR4BC.length > 0 ? (
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Type</th>
                            <th>Value</th>
                            <th>To IDS</th>
                            <th>Comment</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {jsonData.Attribute.SOAR4BC.map((attr, index) => (
                            <tr key={index}>
                                <td>{attr.category}</td>
                                <td>{attr.type}</td>
                                <td>{/* {attr.value} */}
                                <textarea
                                id={`value-SOAR4BC-${index}`}
                                className="form-control"
                                value={attr.value}
                                onChange={e => handleAttributeChange("SOAR4BC", index, "value", e.target.value)}
                                />
                                </td>
                                <td>
                                    <input 
                                        type="checkbox" 
                                        checked={attr.to_ids} 
                                        onChange={e => handleAttributeChange("SOAR4BC", index, "to_ids", e.target.checked)}
                                    />
                                </td>
                                <td>
                                    <textarea
                                        id={`comment-SOAR4BC-${index}`} 
                                        className="form-control"
                                        value={attr.comment} 
                                        onChange={e => handleAttributeChange("SOAR4BC", index, "comment", e.target.value)}
                                    />
                                </td>
                                <td>
                                    <button className="btn btn-outline-danger" onClick={() => handleDeleteAttribute("SOAR4BC", index)}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : <p>System reaction is not available yet</p>}

            {/* Event Attributes */}
            <h2>Event Attributes <span className="badge bg-primary ms-2" style={{ fontSize: '0.9rem' }}>AWARE4BC</span></h2>
            {jsonData.Attribute.AWARE4BC && jsonData.Attribute.AWARE4BC.length > 0 ? (
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Type</th>
                            <th>Value</th>
                            <th>To IDS</th>
                            <th>Anonymization Scheme</th>
                            <th>Comment</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {jsonData.Attribute.AWARE4BC.map((attr, index) => (
                            <tr key={index}>
                                <td>{attr.category}</td>
                                <td>{attr.type}</td>
                                <td>{attr.value}</td>
                                <td>
                                    <input 
                                        type="checkbox" 
                                        checked={attr.to_ids} 
                                        onChange={e => handleAttributeChange("AWARE4BC", index, "to_ids", e.target.checked)}
                                    />
                                </td>
                                <td>
                                    <select value={attr.action.type}
                                    onChange={(e) => handleAttributeActionChange(index, e.target.value)}>
                                        <option value="none">None</option>
                                        <option value="encrypt">Encrypt</option>
                                        {isValidIP(attr.value) && <option value="ipmask">IP Masking</option>}
                                    </select>
                                        {attr.action.type === 'ipmask' && (
                                            <select className="mt-2" value={attr.action.option} onChange={(e) => handleAttributeActionOptionChange(index, e.target.value)}>
                                            <option value="none">Select mask</option>
                                            {isValidIPv4(attr.value) && (
                                            <>
                                                <option value="24">24 (IPv4)</option>
                                                <option value="16">16 (IPv4)</option>
                                                <option value="8">8 (IPv4)</option>
                                            </>
                                            )}
                                            {isValidIPv6(attr.value) && (
                                            <>
                                                <option value="64">64 (IPv6)</option>
                                                <option value="56">56 (IPv6)</option>
                                                <option value="48">48 (IPv6)</option>
                                            </>
                                            )}
                                            </select>
                                        )} 
                                </td>
                                <td>
                                    <textarea
                                        id={`comment-AWARE4BC-${index}`}
                                        className="form-control"
                                        value={attr.comment} 
                                        onChange={e => handleAttributeChange("AWARE4BC", index, "comment", e.target.value)}
                                    />
                                </td>
                                <td>
                                    <button className="btn btn-outline-danger" onClick={() => handleDeleteAttribute("AWARE4BC", index)}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : <p>No event attributes available</p>}
        </div>
    );
};

export default EventAttributes;