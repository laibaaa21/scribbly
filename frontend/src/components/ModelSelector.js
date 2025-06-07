import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './ModelSelector.css';

const ModelSelector = ({ onModelSelect, selectedModel }) => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { token } = useAuth();

    useEffect(() => {
        fetchAvailableModels();
    }, [token]);

    const fetchAvailableModels = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5001/models/available', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch models');
            }

            const data = await response.json();
            setModels(data);
            setError('');
        } catch (err) {
            setError('Failed to load available models');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleModelChange = (event) => {
        const modelId = event.target.value;
        const selectedModelInfo = models.find(m => m.id === modelId);
        onModelSelect(selectedModelInfo);
    };

    if (loading) {
        return <div className="model-selector-loading">Loading models...</div>;
    }

    if (error) {
        return <div className="model-selector-error">{error}</div>;
    }

    return (
        <div className="model-selector">
            <label htmlFor="model-select">Select Model:</label>
            <select
                id="model-select"
                value={selectedModel?.id || ''}
                onChange={handleModelChange}
                className="model-select"
            >
                <option value="">Choose a model...</option>
                {models.map((model) => (
                    <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                    </option>
                ))}
            </select>

            {selectedModel && (
                <div className="model-info">
                    <h4>{selectedModel.name}</h4>
                    <p>{selectedModel.description}</p>
                    <div className="model-stats">
                        <span>Max Tokens: {selectedModel.max_tokens}</span>
                        <span>Cost per 1K: ${selectedModel.cost_per_1k}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelSelector; 