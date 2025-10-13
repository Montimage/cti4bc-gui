import { useState, useEffect } from 'react';
import StrategyModal from './StrategyModal';

const SERVER_URL = process.env.REACT_APP_API_URL;

const SharingStrategies = ({ strategies, setStrategies, setJsonData })=> {
    const [userIsStaff, setUserIsStaff] = useState(false);
    const [selectedStrategy, setSelectedStrategy] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        const token = localStorage.getItem('accessToken');
        try {
            const response = await fetch(`${SERVER_URL}/api/users/info/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
        });

        if (response.ok){
            const userData = await response.json();
            setUserIsStaff(userData.is_staff);
        }

        } catch (error) {
                    }

    };

    const fetchStrategyDetails = async (id) => {
        const token = localStorage.getItem('accessToken');

        try{
            const response = await fetch(`${SERVER_URL}/strategy/${id}/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch strategy details");
            }

            const data = await response.json();
            setSelectedStrategy(data.strategy);
        } catch (error) {
                    }
    };

    const fetchStrategies = async () => {
        const token = localStorage.getItem('accessToken');
        try {
            const response = await fetch(`${SERVER_URL}/strategy/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch strategies');
            }

            const data = await response.json();
            if (!data.strategies || data.strategies.length === 0) {
                throw new Error('No strategies found');
            }

            setStrategies(data.strategies);
        } catch (error) {
                    }
    };

    useEffect(()=> {
        if (strategies.length > 0){
            fetchStrategyDetails(strategies[0].id);
        }
    }, [strategies]);

    if (!strategies) {
        return <p>Loading sharing strategies...</p>;
    }

    const handleStrategyChange = (e) => {
        const strategyId = parseInt(e.target.value, 10);
        const strategy = strategies.find(s => s.id === strategyId);
        if (strategy) {
            fetchStrategyDetails(strategyId);
        }
    };

    const openModal = () => setShowModal(true);
    const closeModal = () => setShowModal(false);

    const applyStrategy = async () => {
        if (!selectedStrategy) {
                        return;
        }

        const token = localStorage.getItem('accessToken');

        try {
            const response = await fetch(`${SERVER_URL}/strategy/${selectedStrategy.id}/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to apply strategy');
            }

            const data = await response.json();
            if (!data.strategy || !data.strategy.template) {
                throw new Error('Invalid strategy data received form the server.');
            }

            const template = data.strategy.template;

            // Apply the strategy
            setJsonData(prevEvent => {
                if (!prevEvent || !prevEvent.Attribute){
                                        return prevEvent;
                }

                const updatedAttributes = Object.keys(prevEvent.Attribute).reduce((acc, category) =>{
                    acc[category] = prevEvent.Attribute[category].map(attr => {
                        const templateAttr = template.Attribute.find(tAttr => tAttr.type === attr.type);
                        if (templateAttr){
                            return {
                                ...attr,
                                action: templateAttr.action,
                                to_ids: templateAttr.hasOwnProperty('to_ids') ? templateAttr.to_ids === true : attr.to_ids,
                            };
                        }
                        return attr;
                    });
                    return acc;
                }, {});

                return {
                    ...prevEvent,
                    ...template,
                    Attribute: updatedAttributes,
                    published: template.hasOwnProperty('published') ? template.published === "true" : prevEvent.published,
                    locked: template.hasOwnProperty('locked') ? template.locked === "true" : prevEvent.locked,
                    disable_correlation: template.hasOwnProperty('disable_correlation') ? template.disable_correlation === "true" : prevEvent.disable_correlation,
                    proposal_email_lock: template.hasOwnProperty('proposal_email_lock') ? template.proposal_email_lock === "true" : prevEvent.proposal_email_lock,
                };
            });
        } catch (error) {
                    }
    };

    const handleDeleteStrategy = async () => {
        if (!selectedStrategy) return;

        if (!window.confirm(`Are you sure you want to delete the strategy "${selectedStrategy.name}"?`)) {
            return;
        }
        const token = localStorage.getItem('accessToken');

        try {
            const response = await fetch(`${SERVER_URL}/strategy/delete/${selectedStrategy.id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok){
                // Refresh the strategies list and reset selected strategy
                await fetchStrategies();
                setSelectedStrategy(null);
            } else {
                await response.json(); // Parse error response
                // Error handling for strategy deletion
            }
        } catch (error) {
                    }
    };

    return (
        <div className='mb-3'>
            <select
                className='form-select'
                id='strategy-select'
                value={selectedStrategy ? selectedStrategy.id : ''}
                onChange={handleStrategyChange}
            >
                {strategies.map((strategy) => (
                    <option key={strategy.id} value={strategy.id}>
                        {strategy.name}
                    </option>
                ))}
            </select>

            <div className="d-flex mt-3">
                <button className="btn btn-outline-secondary me-auto" onClick={openModal}>Create New</button>
                <button className="btn btn-primary" onClick={applyStrategy}>Apply</button>
            </div>

            {selectedStrategy && (
                <div className="mt-3 p-3 border rounded">
                    <h4>Details</h4>
                    <table className='table'>
                        <tbody>
                            <tr>
                                <th>ID</th>
                                <td>{selectedStrategy.id}</td>
                            </tr>
                            <tr>
                                <th>Description</th>
                                <td>{selectedStrategy.description}</td>
                            </tr>
                            <tr>
                                <th>Template</th>
                                <td>
                                    <pre className="bg-light p-2 border rounded mb-0">
                                    <code>{JSON.stringify(selectedStrategy.template, null, 2)}</code>
                                    </pre>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    {userIsStaff && (
                        <div className='d-flex justify-content-end mt-3'>
                        <button
                            className="btn btn-danger"
                            onClick={handleDeleteStrategy}
                        >
                            Delete
                        </button>
                        </div>
                    )}

                </div>
            )}

            { /* Strategy Modal */}
            <StrategyModal show={showModal} handleClose={closeModal} onStrategyAdded={fetchStrategies}/>
        </div>
    );
};

export default SharingStrategies;