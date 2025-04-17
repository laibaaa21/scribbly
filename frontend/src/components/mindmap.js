import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './Mindmap.css';
import { useAuth } from '../contexts/AuthContext';
import { getMindmapById, createMindmap } from '../utils/api';

const Mindmap = ({ mindmapId, onMindmapCreated }) => {
    const svgRef = useRef();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mindmapData, setMindmapData] = useState(null);
    
    const { token } = useAuth();

    useEffect(() => {
        if (mindmapId) {
            fetchMindmap(mindmapId);
        } else {
            // Use sample data when no mindmap is selected
            const defaultMindmap = {
                id: 'root',
                text: 'New Mindmap',
                children: [
                    { id: 'child1', text: 'Topic 1', children: [] },
                    { id: 'child2', text: 'Topic 2', children: [] }
                ]
            };
            setMindmapData({ rootNode: defaultMindmap });
            setLoading(false);
        }
    }, [mindmapId, token]);

    const fetchMindmap = async (id) => {
        try {
            setLoading(true);
            const data = await getMindmapById(id, token);
            setMindmapData(data);
            setError('');
        } catch (error) {
            setError('Failed to fetch mindmap');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const saveMindmap = async () => {
        if (!token || !mindmapData) return;
        
        try {
            const mindmapToSave = {
                title: 'New Generated Mindmap',
                description: 'Mindmap created from visualization',
                rootNode: mindmapData.rootNode || mindmapData,
                tags: ['generated', 'scribbly']
            };
            
            const savedMindmap = await createMindmap(mindmapToSave, token);
            if (onMindmapCreated) {
                onMindmapCreated(savedMindmap._id);
            }
            return savedMindmap;
        } catch (error) {
            setError('Failed to save mindmap');
            console.error(error);
            return null;
        }
    };

    useEffect(() => {
        if (mindmapData) {
            renderMindmap(mindmapData.rootNode || mindmapData);
        }
    }, [mindmapData]);

    // Render the mindmap using D3.js
    const renderMindmap = (mindmap) => {
        const width = 800;
        const height = 600;

        // Clear previous SVG
        d3.select(svgRef.current).selectAll("*").remove();

        // Create SVG container
        const svg = d3.select(svgRef.current)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background-color', 'white')
            .style('border-radius', '8px')
            .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');

        // Create a group for the mindmap
        const g = svg.append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);

        // Define the tree layout
        const treeLayout = d3.tree()
            .size([width - 100, height - 100]);

        // Convert the mindmap data to a hierarchy
        const root = d3.hierarchy(mindmap);

        // Generate the tree layout
        const treeData = treeLayout(root);

        // Draw the links (lines connecting nodes)
        g.selectAll('.link')
            .data(treeData.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x))
            .style('stroke', '#999')
            .style('stroke-width', 2)
            .style('fill', 'none');

        // Draw the nodes
        const nodes = g.selectAll('.node')
            .data(treeData.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.y}, ${d.x})`);

        // Add circles for nodes
        nodes.append('circle')
            .attr('r', 10)
            .attr('fill', '#61dafb')
            .style('stroke', '#fff')
            .style('stroke-width', 2);

        // Add text labels
        nodes.append('text')
            .attr('dy', '.35em')
            .attr('x', d => d.children ? -13 : 13)
            .style('text-anchor', d => d.children ? 'end' : 'start')
            .style('fill', '#282c34')
            .style('font-size', '12px')
            .text(d => d.data.text);
    };

    if (loading) {
        return <div className="loading">Loading mindmap...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="mindmap-container">
            <div ref={svgRef}></div>
            {!mindmapId && (
                <div className="mindmap-actions">
                    <button onClick={saveMindmap} className="btn btn-save">
                        Save Mindmap
                    </button>
                </div>
            )}
        </div>
    );
};

export default Mindmap;