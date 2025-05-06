import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAuth } from '../contexts/AuthContext';
import { getMindmapById, createMindmap } from '../utils/api';

const Mindmap = ({ mindmapId, onMindmapCreated }) => {
    const svgRef = useRef();
    const containerRef = useRef();
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
                color: '#4287f5', // Default color
                children: [
                    { 
                        id: 'child1', 
                        text: 'Topic 1', 
                        color: '#f542a7', // Pink
                        children: [
                            {
                                id: 'child1-1',
                                text: 'Subtopic 1.1',
                                color: '#f5a442',
                                children: []
                            },
                            {
                                id: 'child1-2',
                                text: 'Subtopic 1.2',
                                color: '#42f5e3',
                                children: []
                            }
                        ]
                    },
                    { 
                        id: 'child2', 
                        text: 'Topic 2', 
                        color: '#42f56f', // Green
                        children: [
                            {
                                id: 'child2-1',
                                text: 'Subtopic 2.1',
                                color: '#af42f5',
                                children: []
                            }
                        ] 
                    }
                ]
            };
            setMindmapData({ rootNode: defaultMindmap });
            setLoading(false);
        }
    }, [mindmapId, token]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (mindmapData) {
                renderMindmap(mindmapData.rootNode || mindmapData);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [mindmapData]);

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
        if (!svgRef.current || !containerRef.current) return;

        // Get parent container dimensions
        const containerWidth = containerRef.current.clientWidth || 800;
        const containerHeight = 600; // Fixed height for better visualization

        // Clear previous SVG
        d3.select(svgRef.current).selectAll("*").remove();

        // Create SVG container with explicit dimensions
        const svg = d3.select(svgRef.current)
            .append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .style('background-color', 'white')
            .style('border-radius', '8px')
            .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');
            
        // Create a group and add zoom functionality
        const g = svg.append('g')
            .attr('transform', `translate(${containerWidth / 2}, ${containerHeight / 2})`);
            
        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 2])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        
        svg.call(zoom);

        // Define the tree layout - ensure there's enough space for nodes
        const treeLayout = d3.tree()
            .size([containerHeight - 120, (containerWidth / 2) - 80]); // Swap dimensions for horizontal layout

        try {
            // Convert the mindmap data to a hierarchy and validate
            const root = d3.hierarchy(mindmap);
            
            if (!root) {
                console.error("Failed to create hierarchy from data:", mindmap);
                setError("Failed to generate mindmap visualization");
                return;
            }

            // Generate the tree layout
            const treeData = treeLayout(root);

            if (!treeData || !treeData.links || !treeData.descendants) {
                console.error("Invalid tree data generated:", treeData);
                setError("Failed to generate mindmap layout");
                return;
            }

            // Create a curved line generator for links
            const linkGenerator = d3.linkHorizontal()
                .x(d => d.y) // Note: d3.tree swaps x and y for horizontal layout
                .y(d => d.x);

            // Draw the links (lines connecting nodes)
            g.selectAll('.link')
                .data(treeData.links())
                .enter()
                .append('path')
                .attr('class', 'link')
                .attr('d', linkGenerator)
                .style('stroke', d => d.target.data.color || '#999') // Use node color for link if available
                .style('stroke-width', 2)
                .style('fill', 'none')
                .style('opacity', 0.7)
                .style('stroke-dasharray', d => d.target.depth === 1 ? '0' : '5,5'); // Dashed lines for deeper nodes

            // Create groups for nodes
            const nodes = g.selectAll('.node')
                .data(treeData.descendants())
                .enter()
                .append('g')
                .attr('class', 'node')
                .attr('transform', d => `translate(${d.y}, ${d.x})`);

            // Add circles for nodes with different sizes based on depth
            nodes.append('circle')
                .attr('r', d => {
                    // Different sizes based on node depth
                    if (d.depth === 0) return 30; // Root node - larger
                    if (d.depth === 1) return 20; // First level
                    return 12; // Other levels
                })
                .attr('fill', d => d.data.color || '#61dafb') // Use node color or default
                .style('stroke', '#fff')
                .style('stroke-width', 2)
                .style('filter', 'drop-shadow(0px 2px 3px rgba(0,0,0,0.2))');

            // Add text labels with different styling based on node type
            nodes.append('text')
                .attr('dy', '.35em')
                .attr('x', d => {
                    if (d.depth === 0) return 0; // Center text in root
                    return d.children ? -30 : 30; // Position based on whether it has children
                })
                .attr('text-anchor', d => {
                    if (d.depth === 0) return 'middle'; // Center root node text
                    return d.children ? 'end' : 'start'; // Others based on position
                })
                .style('fill', d => {
                    if (d.depth === 0) return '#fff'; // White text for root node
                    return '#333'; // Dark text for others
                })
                .style('font-size', d => {
                    if (d.depth === 0) return '16px';
                    if (d.depth === 1) return '14px';
                    return '12px';
                })
                .style('font-weight', d => d.depth <= 1 ? 'bold' : 'normal')
                .text(d => {
                    // Truncate long text to avoid clutter
                    const maxLength = d.depth === 0 ? 25 : (d.depth === 1 ? 20 : 30);
                    return d.data.text.length > maxLength 
                        ? d.data.text.substring(0, maxLength) + '...' 
                        : d.data.text;
                })
                // Add title element for full text on hover
                .append('title')
                .text(d => d.data.text);

            // Add node hover effects
            nodes
                .on('mouseover', function() {
                    d3.select(this).select('circle')
                        .transition()
                        .duration(200)
                        .attr('r', d => {
                            if (d.depth === 0) return 35; 
                            if (d.depth === 1) return 24;
                            return 15;
                        });
                })
                .on('mouseout', function() {
                    d3.select(this).select('circle')
                        .transition()
                        .duration(200)
                        .attr('r', d => {
                            if (d.depth === 0) return 30;
                            if (d.depth === 1) return 20;
                            return 12;
                        });
                });
                
            // Initial zoom to fit the content
            svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(0.8));
                
        } catch (err) {
            console.error("Error rendering mindmap:", err);
            setError("Failed to render mindmap visualization. Please try again.");
        }
    };

    if (loading) {
        return <div className="loading">Loading mindmap...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="feature-container">
            <div className="feature-main mindmap-container" ref={containerRef}>
                <div className="svg-container" ref={svgRef}></div>
                {!mindmapId && (
                    <div className="button-group">
                        <button onClick={saveMindmap} className="primary-button">
                            Save Mindmap
                        </button>
                    </div>
                )}
            </div>
            <style jsx>{`
                .mindmap-container {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                    min-height: 600px;
                }
                
                .svg-container {
                    width: 100%;
                    height: 600px;
                    overflow: visible;
                }
                
                .error-message {
                    color: #e53935;
                    background-color: #ffebee;
                    padding: 10px;
                    border-radius: 4px;
                    margin-bottom: 20px;
                }
                
                .loading {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 300px;
                    color: #666;
                    font-style: italic;
                }
                
                .button-group {
                    margin-top: 20px;
                }
                
                .primary-button {
                    background-color: #61dafb;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 10px 20px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: background-color 0.3s;
                }
                
                .primary-button:hover {
                    background-color: #21a1c7;
                }
            `}</style>
        </div>
    );
};

export default Mindmap;