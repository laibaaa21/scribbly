import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './Mindmap.css';

const Mindmap = () => {
    const svgRef = useRef();

    useEffect(() => {
        // Fetch mindmap data from your FastAPI endpoint
        const fetchMindmap = async () => {
            try {
                const response = await fetch('http://localhost:8000/Mindmap-gen', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: "Technology has become an inseparable part of our daily lives...",
                        max_depth: 3
                    })
                });
                const data = await response.json();
                renderMindmap(data.mindmap);
            } catch (error) {
                console.error('Error fetching mindmap:', error);
            }
        };

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

        fetchMindmap();
    }, []);

    return (
        <div className="mindmap-container">
            <div ref={svgRef}></div>
        </div>
    );
};

export default Mindmap;