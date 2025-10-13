import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useEffect } from 'react';
import { useToast } from '../../components/Toast';

const SERVER_URL = process.env.REACT_APP_API_URL;

const StrategyModal = ({ show, handleClose, onStrategyAdded}) => {
    const { showError, showSuccess } = useToast();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [template, setTemplate] = useState('{ "distribution": "", "published":"" , "locked":"", "disable_correlation":"", "proposal_email_lock":"", "Attribute": [{"type":"", "to_ids":false,"action": {"type": "none", "option":"none"}}]}');

    const handleChangeTemplate = (newValue) => {
        setTemplate(newValue);
        setTimeout(() => {
            const templateBox = document.getElementById('template-box');
            if (templateBox) {
                templateBox.style.height = `${templateBox.scrollHeight}px`;
            }
        }, 0);
    };

    const handlePublishedChange = (e) => {
        const newPublished = e.target.value;
        setTemplate((prevTemplate) => {
            const parsedTemplate = JSON.parse(prevTemplate);
            parsedTemplate.published = newPublished;
            parsedTemplate.locked = newPublished ? false : parsedTemplate.locked;
            return JSON.stringify(parsedTemplate);
        });
    };

    const handleLockedChange = (e) => {
        const newLocked = e.target.value;
        setTemplate((prevTemplate) => {
            const parsedTemplate = JSON.parse(prevTemplate);
            parsedTemplate.locked = newLocked;
            parsedTemplate.published = newLocked ? false : parsedTemplate.published;
            return JSON.stringify(parsedTemplate);
        });
    };

    const handleSave = () => {
        if (!name || !description || !template) {
            showError('All fields are required');
            return;
        }
        let parsedTemplate;
        try {
            parsedTemplate = JSON.parse(template);
        } catch (error) {
            showError('Invalid JSON in template');
            return;
        }

        const attributes = JSON.parse(template).Attribute;
        
        if (!attributes.every(attribute => attribute.type)) {
            showError('All attributes must have a type');
            return;
        }

        const strategy = { 
            name, 
            description, 
            template: parsedTemplate 
        };

        const token = localStorage.getItem('accessToken');
        fetch(`${SERVER_URL}/strategy/add/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(strategy),
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                showSuccess('Strategy added successfully!');
                setName('');
                setDescription('');
                setTemplate('{ "distribution": "", "published":"" , "locked":"", "disable_correlation":"", "proposal_email_lock":"", "Attribute": [{"type":"", "to_ids":false, "action": {"type": "none", "option":"none"}}]}');
                handleClose();
                onStrategyAdded();
            } else if (data.error) {
                showError(data.error);
            }
        })
        .catch((error) => {
            showError('Error adding strategy: ' + error.message);
        });
    };

    useEffect(() => {
        if (show) {
            setTimeout(() => {
                const templateBox = document.getElementById('template-box');
                if (templateBox) {
                    templateBox.style.height = 'auto';
                    templateBox.style.height = `${templateBox.scrollHeight}px`;
                }
            }, 0);
        }
    }, [show]);

    // Create a select input
    const createSelectInput = (label, value, options, onChange, note = null) => (
        <div className='row mb-3'>
            <div className="col-3">
                <label className='form-label'>{label}</label></div>
            <div className="col-9 d-flex align-items-center">
                <select value={value} onChange={onChange}>
                    {options.map(([optionValue, optionLabel]) => (
                        <option value={optionValue} key={optionValue}>{optionLabel}</option>
                    ))}
                </select>
                {note && <span className="text-muted small ms-2">{note}</span>}
            </div>
        </div>
    );

    // Handle the change of a select input
    const handleSelectChange = (field) => (e) => {
        if (field === 'published') {
            handlePublishedChange(e);
        } else if (field === 'locked') {
            handleLockedChange(e);
        } else {
        const newTemplate = JSON.parse(template);
        newTemplate[field] = e.target.value;
        setTemplate(JSON.stringify(newTemplate));
        }
    };

    // Handle the change of an action type of an attribute
    const handleActionTypeChange = (index, newActionType) => {
        const newTemplate = JSON.parse(template);
        newTemplate.Attribute[index].action.type = newActionType;
        newTemplate.Attribute[index].action.option = 'none';
        setTemplate(JSON.stringify(newTemplate));
    };

    const genericOptions = [
        ["", "Not defined"],
        ["true", "Yes"],
        ["false", "No"],
    ];

    const distributionOptions = [
        ["", "Not defined"],
        ["0", "This organization only"],
        ["1", "This community only"],
        ["2", "Connected communities"],
        ["3", "All communities"],
        ["4", "Sharing group"],
        ["5", "Inherit event"],
    ];

    const handleRemoveAttribute = (index) => {
        const newTemplate = JSON.parse(template);
        newTemplate.Attribute.splice(index, 1);
        setTemplate(JSON.stringify(newTemplate));
    };

    const handleAttributeTypeChange = (index, newType) => {
        const newTemplate = JSON.parse(template);
        newTemplate.Attribute[index].type = newType;
        setTemplate(JSON.stringify(newTemplate));
    };

    const handleToIdsChange = (index, newToIds) => {
        const newTemplate = JSON.parse(template);
        newTemplate.Attribute[index].to_ids = newToIds;
        setTemplate(JSON.stringify(newTemplate));
    };

    const handleAddAttribute = () => {
        const newTemplate = JSON.parse(template);
        const newAttribute = {
            type: "",
            to_ids: false,
            action: {
                type: "none",
                option: "none"
            }
        };
        newTemplate.Attribute.push(newAttribute);
        setTemplate(JSON.stringify(newTemplate));
    };

    const handleAttributeActionOptionChange = (index, newOption) => {
        const newTemplate = JSON.parse(template);
        newTemplate.Attribute[index].action.option = newOption;
        setTemplate(JSON.stringify(newTemplate));
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>New Strategy</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row mb-3">
                    <div className="col-3">
                    <label className="form-label">Name</label>
                    </div>
                    <div className="col-9">
                    <input type="text" className="form-control" placeholder="Enter name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                </div>
                <hr />
                <div className="row mb-3">
                    <div className="col-3"><label className="form-label">Description</label></div>
                    <div className="col-9"><input type="text" className="form-control" placeholder="Enter description" value={description} onChange={e => setDescription(e.target.value)} /></div>
                </div>
                <hr />
                {createSelectInput(
                    "Distribution",
                    JSON.parse(template).distribution,
                    distributionOptions,
                    handleSelectChange("distribution")
                )}
                <hr />
                {createSelectInput(
                    "Published",
                    JSON.parse(template).published,
                    genericOptions,
                    handleSelectChange("published"),
                    'Cannot be true when Locked'
                )}
                <hr />
                {createSelectInput(
                    "Locked",
                    JSON.parse(template).locked,
                    genericOptions,
                    handleSelectChange("locked"),
                    'Cannot be true when Published'
                )}
                <hr />
                {createSelectInput(
                    "Disable correlation",
                    JSON.parse(template).disable_correlation,
                    genericOptions,
                    handleSelectChange("disable_correlation")
                )}
                <hr />
                {createSelectInput(
                    "Lock email notifications",
                    JSON.parse(template).proposal_email_lock,
                    genericOptions,
                    handleSelectChange("proposal_email_lock")
                )}
                <hr />
                <div className='row mb-3'>
                    <div className="col-12">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>To IDS</th>
                                    <th>Anonymization Scheme</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                            {JSON.parse(template).Attribute.map((attribute, index) => (
                                <tr key={index}>
                                    <td>
                                    <input
                                        type="text"
                                        value={attribute.type}
                                        onChange={e => handleAttributeTypeChange(index, e.target.value)}
                                    />
                                    </td>
                                    <td>
                                    <input
                                        type="checkbox"
                                        checked={attribute.to_ids}
                                        onChange={e => handleToIdsChange(index, e.target.checked)}
                                    />
                                    </td>
                                    <td>
                                    <select
                                        value={attribute.action.type}
                                        onChange={e => handleActionTypeChange(index, e.target.value)}
                                    >
                                        <option value="none">None</option>
                                        <option value="encrypt">Encrypt</option>
                                        <option value="ipmask">IP Masking</option>
                                    </select>

                                    {attribute.action.type === 'ipmask' && (
                                            <select className="mt-2" value={attribute.action.option} onChange={(e) => handleAttributeActionOptionChange(index, e.target.value)}>
                                            <option value="none">Select mask</option>
                                            <option value="24">24 (IPv4)</option>
                                            <option value="16">16 (IPv4)</option>
                                            <option value="8">8 (IPv4)</option>
                                            <option value="64">64 (IPv6)</option>
                                            <option value="56">56 (IPv6)</option>
                                            <option value="48">48 (IPv6)</option>
                                            </select>
                                    )}
                                    </td>
                                    <td>
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleRemoveAttribute(index)}>Remove</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                    </div>
                </div>
                <div className="d-flex justify-content-end">
                    <button className="btn btn-primary btn-sm" onClick={handleAddAttribute}>Add Attribute</button>
                </div>
                <hr />
                <div className='row mb-3'>
                    <div className="col-3"><label className='form-label'>Template</label></div>
                    <div className="col-9"><textarea id='template-box' className='form-control' placeholder='Enter template' value={template} onChange={e => handleChangeTemplate(e.target.value)} /></div>
                </div>

            </Modal.Body>
            <Modal.Footer>
                <button className="btn btn-secondary" onClick={handleClose}>
                    Close
                </button>
                <button className="btn btn-primary" onClick={handleSave}>
                    Save Changes
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default StrategyModal;