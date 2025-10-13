import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import JsonViewer from "./JsonViewer";
import StrategyModal from "./StrategyModal";

const SERVER_URL = process.env.REACT_APP_API_URL;

const EventViewer = forwardRef(({ data, id }, ref) => {
    const [jsonData, setJsonData] = useState(null);
    const [showJson, setShowJson] = useState(false);
    const [strategies, setStrategies] = useState({list: [], selected: ''});
    const [showModal, setShowModal] = useState(false);

    const openModal = () => {
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };

    const fetchStrategies = () => {
        const token = localStorage.getItem('accessToken');
        fetch(`${SERVER_URL}/strategy/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })
            .then(response => response.json())
            .then(data => {
                if (data.strategies.length > 0){
                    setStrategies({ list: data.strategies, selected: data.strategies[0].id });
                }
            })
    };

    const handleStrategyAdded = () => {
        fetchStrategies();
    };

    useImperativeHandle(ref, () => ({
        getJsonData: () => jsonData
    }));

    useEffect(() => {
        if(data){
            const eventData = data;
            const transformedAttributes = {
                ...eventData.Attribute,
                AWARE4BC: eventData.Attribute.AWARE4BC.map(attr => ({
                    ...attr,
                    action: {
                        type:'none',
                        option: 'none'
                    }
                }))
            }     
            
            // New transformed event
            const transformedEvent = {
                ...eventData,
                published: eventData.published || false,
                locked: eventData.locked || false,
                Attribute: transformedAttributes,
                date: typeof eventData.date === 'object' && eventData.date !== null && 'value' in eventData.date && 'action' in eventData.date
                    ? eventData.date
                    : { value: eventData.date, action: "%Y-%m-%d" },
            };
            setJsonData(transformedEvent);

            const adjustTextareaHeight = (attributeType) =>{
                transformedEvent.Attribute[attributeType].forEach((attr, attrIndex) => {
                    const textarea = document.getElementById(`comment-${attributeType}-${attrIndex}`);
                    if (textarea) {
                        textarea.style.height = 'auto';
                        textarea.style.height = `${textarea.scrollHeight}px`;
                    }
                });
            }

            setTimeout(() => {
                // Adjust the height of the comment textarea
                adjustTextareaHeight('RISK4BC');
                adjustTextareaHeight('SOAR4BC');
                adjustTextareaHeight('AWARE4BC');

                // Adjust the height of the info box
                const infoBox = document.getElementById('info-box');
                if (infoBox) {
                    infoBox.style.height = 'auto';
                    infoBox.style.height = `${infoBox.scrollHeight}px`;
                }

                fetchStrategies();
            }, 0);
        }
    }, [data]);

    const handleSelectChange = (property, newValue) => {
        setJsonData(preEvent => {
            // If the property is an object, update its action subfield
            // Otherwise, just update the property
            if (typeof preEvent[property] === 'object' && preEvent[property] !== null) {
                return { 
                    ...preEvent, 
                    [property]: { ...preEvent[property], action: newValue } };
            } else {
                return { ...preEvent, [property]: newValue };
            }
        });
    };

    const handleTextChange = (property, newValue) => {
        setJsonData(prevEvent => ({ ...prevEvent, [property]: newValue }));
        // Adjust the height of the info box
        if (property === 'info') {
            setTimeout(() => {
                const infoBox = document.getElementById('info-box');
                if (infoBox) {
                    infoBox.style.height = 'auto';
                    infoBox.style.height = `${infoBox.scrollHeight}px`;
                }
            }, 0);
        }
    };

    const handleCheckboxChange = (property, checked) => {
        if (property === 'published' && checked) {
            setJsonData(prevEvent => ({ ...prevEvent, published: true, locked: false }));
            return;
        }
        if (property === 'locked' && checked) {
            setJsonData(prevEvent => ({ ...prevEvent, locked: true, published: false }));
            return;
        }

        setJsonData(preEvent => ({ ...preEvent, [property]: checked }));
    };

    const handleAttributeToIdsChange = (source, attrIndex, newToIds) => {
        setJsonData(prevEvent => ({
            ...prevEvent,
            Attribute: {
                ...prevEvent.Attribute,
                [source]: prevEvent.Attribute[source].map((attr, i) => {
                    if (i === attrIndex) {
                        return { 
                            ...attr, 
                            to_ids: newToIds
                        };
                    }
                    return attr;
                })
            }
        }));
    };

    const handleAttributeActionChange = (attrIndex, newAction) => {
        setJsonData(prevEvent => ({
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

    const handleAttributeActionOptionChange = (attrIndex, newOption) => {
        setJsonData(prevEvent => ({
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

    const handleAttributeCommentChange = (source, attrIndex, newComment) => {
        setJsonData(prevEvent => ({
            ...prevEvent,
            Attribute: {
                ...prevEvent.Attribute,
                [source]: prevEvent.Attribute[source].map((attr, i) => {
                    if (i === attrIndex) {
                        return { 
                            ...attr, 
                            comment: newComment
                        };
                    }
                    return attr;
                })
            }
        }));

        setTimeout(() => {
            const textarea = document.getElementById(`comment-${source}-${attrIndex}`);
            if (textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
            }
        }, 0);
    };

    const handleDeleteAttribute = (source, attrIndex) => {
        // Confirmation dialog
        const isConfirmed = window.confirm('Are you sure you want to delete this attribute?');
        if (!isConfirmed) {
            return;
        }

        // Remove the attribute at attrIndex
        setJsonData(prevEvent => ({
            ...prevEvent,
            Attribute: {
                ...prevEvent.Attribute,
                [source]: prevEvent.Attribute[source].filter((_, i) => i !== attrIndex)
            }
        }));
    };

    const toggleJsonView = () => {
        setShowJson(!showJson);
    };

    const handleStrategyChange = (e) => {
        setStrategies({ ...strategies, selected: e.target.value });
    };

    const applyStrategy = () => {
        const token = localStorage.getItem('accessToken');
        fetch(`${SERVER_URL}/strategy/${strategies.selected}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })
            .then(response => response.json())
            .then(data => {
                const template = data.strategy.template;
    
                setJsonData(prevEvent => {
                    const updatedAttributes = prevEvent.Attribute.map(attr => {
                        const templateAttr = template.Attribute.find(tAttr => tAttr.type === attr.type);
                        if (templateAttr) {
                            return {
                                ...attr,
                                action: templateAttr.action,
                            };
                        }
                        return attr;
                    });
    
                    return {
                        ...prevEvent,
                        ...template,
                        Attribute: updatedAttributes,
                    };
                });
            })
            .catch(error => {
                // Error handling for attribute update
            });
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

    return (
        <div className={showJson != null ? "split-view" : ""}>
            <div className={showJson != null ? "split-half" : ""}>
                <div className="container mt-4">
                    <div className="table-responsive">
                        <div className="mb-3">
                            <h2>Sharing Strategies</h2>
                            <select className="form-select" id="strategy-select"  onChange={handleStrategyChange}>
                            {strategies.list.map((strategy) => (
                                <option key={strategy.id} value={strategy.id}>{strategy.name}</option>
                            ))}
                            </select>
                            <div className="d-flex">
                                <button className="btn btn-secondary mt-2 me-2" onClick={openModal}>New Strategy</button>
                                <button className="btn btn-primary mt-2 ms-auto" onClick={applyStrategy}>Apply</button>
                            </div>
                            <StrategyModal show={showModal} handleClose={closeModal} onStrategyAdded={handleStrategyAdded} />
                            
                        </div>
                        
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
                                </>
                            )}
                            </tbody>
                        </table>

                        <h2>Event Details</h2>
                        <table className="table table-hover">
                            <tbody>
                                {jsonData && (
                                    <>
                                        <tr><td>Date</td>
                                            <td>{jsonData.date.value}</td>
                                            <td>
                                                <select value={jsonData.date.action} onChange={(e) => handleSelectChange('date', e.target.value)}>
                                                    <option value="%Y-%m-%d">Complete Date</option>
                                                    <option value="%Y">Year</option>
                                                    <option value="%Y-%m">Year and Month</option>
                                                </select>
                                                <span className="badge bg-primary ms-2">AWARE4BC</span>
                                            </td>
                                        </tr>
                                        <tr>
                                        <td>Info</td>
                                        <td><textarea id='info-box'
                                            value={jsonData.info} 
                                            onChange={e => handleTextChange('info', e.target.value)}
                                        /></td>
                                        <td><span className="badge bg-primary ms-2">AWARE4BC</span></td>
                                        </tr>
                                        <tr><td>Threat Level</td>
                                        <td>
                                            <select value={jsonData.threat_level_id} onChange={(e) => handleSelectChange('threat_level_id', e.target.value)}>
                                            <option value="1">High</option>
                                            <option value="2">Medium</option>
                                            <option value="3">Low</option>
                                            <option value="4">Undefined</option>
                                            </select>
                                        </td>
                                        <td></td></tr>
                                        <tr><td>Analysis</td>
                                        <td>
                                            <select value={jsonData.analysis} onChange={(e) => handleSelectChange('analysis', e.target.value)}>
                                            <option value="0">Initial</option>
                                            <option value="1">Ongoing</option>
                                            <option value="2">Complete</option>
                                            </select>
                                        </td>
                                        <td></td></tr>
                                        <tr><td>Distribution</td>
                                        <td>
                                            <select value={jsonData.distribution} onChange={(e) => handleSelectChange('distribution', e.target.value)}>
                                            <option value="0">This organization only</option>
                                            <option value="1">This community only</option>
                                            <option value="2">Connected communities</option>
                                            <option value="3">All communities</option>
                                            <option value="4">Sharing group</option>
                                            <option value="5">Inherit event</option>
                                            </select>
                                        </td>
                                        <td></td></tr>
                                        <tr><td>Published</td>
                                        <td>
                                            <input 
                                            type="checkbox"
                                            checked={jsonData.published}
                                            onChange={(e) => handleCheckboxChange('published', e.target.checked)}
                                            disabled={jsonData.locked}/>
                                        </td><td></td></tr>
                                        <tr><td>Lock Event</td>
                                        <td>
                                            <input 
                                            type="checkbox"
                                            checked={jsonData.locked}
                                            onChange={(e) => handleCheckboxChange('locked', e.target.checked)}
                                            disabled={jsonData.published}/>
                                        </td>
                                        <td></td></tr>
                                        <tr><td>Disable Correlation</td>
                                        <td>
                                            <input
                                            type="checkbox"
                                            checked={jsonData.disable_correlation}
                                            onChange={(e) => handleCheckboxChange('disable_correlation', e.target.checked)}/>
                                        </td>
                                        <td></td></tr>
                                    </>
                                )}
                            </tbody>
                        </table>

                        { /* Table for attributes */ }
                        {jsonData && jsonData.Attribute && (
                        <div className="mt-3">
                            <h2>Risk assessment <span className="badge bg-primary ms-2" style={{ fontSize: '0.75rem' }}>RISK4BC</span></h2>
                            { jsonData.Attribute.RISK4BC && jsonData.Attribute.RISK4BC.length > 0 ? (
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
                                    <td><input type="checkbox" checked={attr.to_ids} onChange={(e) => handleAttributeToIdsChange("RISK4BC", index, e.target.checked)}/></td>
                                    
                                    <td><textarea id={`comment-RISK4BC-${index}`} value={attr.comment} onChange={(e) => handleAttributeCommentChange("RISK4BC", index, e.target.value)}/></td>
                                    <td><button className="btn btn-outline-danger"
                                        onClick={() =>handleDeleteAttribute("RISK4BC", index)}>
                                        <i className="fas fa-trash"></i>
                                        </button>
                                    </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            ) : (
                                <p>Risk assessment is not available yet</p>
                            )}

                            <h2>System Reaction <span className="badge bg-primary ms-2" style={{ fontSize: '0.75rem' }}>SOAR4BC</span></h2>
                            { jsonData.Attribute.SOAR4BC && jsonData.Attribute.SOAR4BC.length > 0 ? (
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
                                    <td>{attr.value}</td>
                                    <td><input type="checkbox" checked={attr.to_ids} onChange={(e) => handleAttributeToIdsChange("SOAR4BC",index, e.target.checked)}/></td>
                                    
                                    <td><textarea id={`comment-SOAR4BC-${index}`} value={attr.comment} onChange={(e) => handleAttributeCommentChange("SOAR4BC", index, e.target.value)}/></td>
                                    <td><button className="btn btn-outline-danger"
                                        onClick={() =>handleDeleteAttribute("SOAR4BC", index)}>
                                        <i className="fas fa-trash"></i>
                                        </button>
                                    </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            ) : (
                                <p>System reaction is not available yet</p>
                            )}

                            <h2>Event Attributes <span className="badge bg-primary ms-2" style={{ fontSize: '0.75rem' }}>AWARE4BC</span></h2>
                            { jsonData.Attribute.AWARE4BC && jsonData.Attribute.AWARE4BC.length > 0 ? (
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
                                    <td><input type="checkbox" checked={attr.to_ids} onChange={(e) => handleAttributeToIdsChange("AWARE4BC",index, e.target.checked)}/></td>
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
                                    <td><textarea id={`comment-AWARE4BC-${index}`} value={attr.comment} onChange={(e) => handleAttributeCommentChange("AWARE4BC", index, e.target.value)}/></td>
                                    <td><button className="btn btn-outline-danger"
                                        onClick={() =>handleDeleteAttribute("AWARE4BC", index)}>
                                        <i className="fas fa-trash"></i>
                                        </button>
                                    </td>
                                    </tr>
                                ))}
                                </tbody>
                                </table>
                            ): (
                                <p>No event attributes available</p>
                            )}
                        </div>
                        )}
                        { /* Files attached */ }

                        { /* Sharing options */ }
                        {/* <div className="mt-3">
                            <h2>Sharing options</h2>
                            to be completed
                            sharing_group_id
                        </div> */}
                        <div className="d-flex justify-content-end">
                            <button className="btn btn-secondary"
                                onClick={() => toggleJsonView()}>
                                {showJson ? 'Hide JSON' : 'Show JSON'}
                            </button>                       
                        </div>
                    </div>
                </div>
            </div>
            {showJson && (
                <div className='split-half'>
                    <JsonViewer data={jsonData} />
                </div>
            )}
        </div>
    );
});

export default EventViewer;