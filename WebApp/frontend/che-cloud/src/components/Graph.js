import React, { useEffect, useState } from 'react';
import * as d3 from 'd3';
import { jsPDF } from 'jspdf';
import 'svg2pdf.js';

const StaticGraph = ({ data }) => {
    const [graphRendered, setGraphRendered] = useState(false);

    useEffect(() => {
        if (data.nodes.length === 0 || data.links.length === 0 || graphRendered) return;
        
        // Render the graph once without animation
        renderStaticGraph();
        setGraphRendered(true);
    }, [data, graphRendered]);

    const renderStaticGraph = () => {
        const svgElement = document.getElementById("graph");
        const width = svgElement.clientWidth;
        const height = svgElement.clientHeight;
        const svg = d3.select("#graph");
        const categories = Array.from(new Set(data.nodes.map(node => node.category)));
        const colorScale = d3.scaleOrdinal()
            .domain(categories)
            .range(["#bddbcf", "#f6f0e4", '#6fa990','#debaa9']);

        // Define the boundary between connected and isolated nodes
        const boundaryX = width * 0.6;
    
        // Clear previous graph elements
        svg.selectAll("*").remove();
    
        // Draw color legend
        const legend = svg.append("g").attr("transform", "translate(10, 10)");
    
        legend.selectAll("rect")
            .data(categories)
            .enter().append("rect")
            .attr("x", 0)
            .attr("y", (d, i) => i * 20)
            .attr("width", 20)
            .attr("height", 15)
            .attr("fill", d => colorScale(d));
    
        legend.selectAll("text")
            .data(categories)
            .enter().append("text")
            .attr("x", 30)
            .attr("y", (d, i) => i * 20 + 12)
            .text(d => d)
            .attr("class", "legend");
        
        // Identify nodes with and without links
        const linkedNodeIds = new Set();
        data.links.forEach(link => {
            linkedNodeIds.add(typeof link.source === 'object' ? link.source.id : link.source);
            linkedNodeIds.add(typeof link.target === 'object' ? link.target.id : link.target);
        });
        
        // Split nodes into connected and isolated
        const connectedNodes = data.nodes.filter(node => linkedNodeIds.has(node.id));
        const isolatedNodes = data.nodes.filter(node => !linkedNodeIds.has(node.id));
        
        // Process links to ensure they reference only connected nodes
        const validLinks = data.links.filter(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return linkedNodeIds.has(sourceId) && linkedNodeIds.has(targetId);
        });
        
        // Pre-calculate positions for connected nodes using D3 force layout
        // but run it synchronously without animation
        const simulation = d3.forceSimulation(connectedNodes)
            .force("link", d3.forceLink(validLinks).id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-25))
            .force("center", d3.forceCenter(width / 3, height / 2))
            .force("collide", d3.forceCollide(35))
            .force("x", d3.forceX(width / 3).strength(0.05))
            .force("y", d3.forceY(height / 2).strength(0.05));
        
        // Run the simulation immediately to completion
        // This skips the animation and calculates final positions
        for (let i = 0; i < 300; ++i) simulation.tick();
        
        // Calculate positions for isolated nodes in a grid
        const isolatedNodesPerRow = Math.max(1, Math.floor(Math.sqrt(isolatedNodes.length)));
        const rightSideStartX = boundaryX + 50;
        const rightSideWidth = width - rightSideStartX - 30;
        const xSpacing = Math.min(70, rightSideWidth / isolatedNodesPerRow);
        const ySpacing = Math.min(70, (height - 100) / (Math.ceil(isolatedNodes.length / isolatedNodesPerRow) || 1));
        
        isolatedNodes.forEach((node, i) => {
            const row = Math.floor(i / isolatedNodesPerRow);
            const col = i % isolatedNodesPerRow;
            node.x = rightSideStartX + col * xSpacing;
            node.y = 100 + row * ySpacing;
        });
        
        // Ensure all connected nodes stay within boundaries
        connectedNodes.forEach(node => {
            node.x = Math.min(Math.max(node.x, 30), boundaryX - 40);
            node.y = Math.min(Math.max(node.y, 30), height - 30);
        });
        
        // Draw the divider line
        svg.append("line")
            .attr("x1", boundaryX)
            .attr("y1", 0)
            .attr("x2", boundaryX)
            .attr("y2", height)
            .attr("stroke", "#ccc")
            .attr("stroke-dasharray", "5,5")
            .attr("stroke-width", 1);
        
        // Add a label for isolated nodes section
        if (isolatedNodes.length > 0) {
            svg.append("text")
                .attr("x", boundaryX + (width - boundaryX) / 2)
                .attr("y", 30)
                .attr("text-anchor", "middle")
                .attr("font-size", "14px")
                .attr("font-weight", "bold")
                .text("Isolated Nodes");
        }
        
        // Draw links
        svg.append("g")
            .selectAll("line")
            .data(validLinks)
            .enter().append("line")
            .attr("class", "link")
            .attr("data-source", d => typeof d.source === 'object' ? d.source.id : d.source)
            .attr("data-target", d => typeof d.target === 'object' ? d.target.id : d.target)
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
            .attr("stroke", "grey")
            .attr("stroke-width", 1)
            .attr("stroke-opacity", 0.3);
        
        // Draw connected nodes
        const connectedNodeGroups = svg.append("g")
            .selectAll("g.connected")
            .data(connectedNodes)
            .enter().append("g")
            .attr("class", "node-group connected")
            .attr("data-id", d => d.id)
            .attr("transform", d => `translate(${d.x},${d.y})`);
            
        connectedNodeGroups.each(function(d) {
            const g = d3.select(this);
            const a = g.append("a")
                .attr("xlink:href", d => d.url)
                .attr("target", "_blank")
                .style("cursor", "pointer");
                
            a.append("circle")
                .attr("r", 25)
                .attr("fill", d => colorScale(d.category))
                .attr("class", "node-circle");
            
            a.append("text")
                .attr("fill", "black")
                .attr("font-size", "10px")
                .attr("font-weight", "bold")
                .attr("text-anchor", "middle")
                .attr("dy", ".35em")
                .text(d => abbreviateText(d.title || d.id, 6));
        });
        
        // Draw isolated nodes
        const isolatedNodeGroups = svg.append("g")
            .selectAll("g.isolated")
            .data(isolatedNodes)
            .enter().append("g")
            .attr("class", "node-group isolated")
            .attr("data-id", d => d.id)
            .attr("transform", d => `translate(${d.x},${d.y})`);
            
        isolatedNodeGroups.each(function(d) {
            const g = d3.select(this);
            const a = g.append("a")
                .attr("xlink:href", d => d.url)
                .attr("target", "_blank")
                .style("cursor", "pointer");
                
            a.append("circle")
                .attr("r", 25)
                .attr("fill", d => colorScale(d.category))
                .style("opacity", 0.8);
            
            a.append("text")
                .attr("fill", "black")
                .attr("font-size", "10px")
                .attr("font-weight", "bold")
                .attr("text-anchor", "middle")
                .attr("dy", ".35em")
                .text(d => abbreviateText(d.title || d.id, 6));
        });
        
        // Add hover effects for connected nodes
        connectedNodeGroups.on("mouseover", (event, d) => {
            const nodeId = d.id;
            // Highlight links connected to this node
            svg.selectAll(".link").classed("highlighted", link => {
                const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                return sourceId === d.id || targetId === d.id;
            });
            d3.select(event.currentTarget).select("circle").classed("highlighted", true);

            svg.selectAll(".node-group").each(function(otherNode) {
                const otherNodeId = otherNode.id;
                const isConnected = data.links.some(link => {
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    return (sourceId === nodeId && targetId === otherNodeId) ||
                           (targetId === nodeId && sourceId === otherNodeId);
                });

                if (isConnected) {
                    d3.select(this).select("circle").classed("highlighted", true);
                }
            })
        })
        .on("mouseout", (event) => {
            // Remove highlight when mouse leaves
            svg.selectAll(".link").classed("highlighted", false);
            d3.select(event.currentTarget).select("circle").classed("highlighted", false);
            // Unhighlight all node circles
            svg.selectAll(".node-circle").classed("highlighted", false);
        });

        // Add hover effects for connected nodes
        isolatedNodeGroups.on("mouseover", (event, d) => {
            // Highlight links connected to this node
            d3.select(event.currentTarget).select("circle").classed("highlighted", true);
        })
        .on("mouseout", (event) => {
            // Remove highlight when mouse leaves
            d3.select(event.currentTarget).select("circle").classed("highlighted", false);
        });
    };
    
    function abbreviateText(text, maxLength) {
        if (!text) return "";
        if (text.length > maxLength) {
            return text.substring(0, maxLength) + "...";
        }
        return text;
    }

    const handleDownload = () => {
        const svgElement = document.getElementById("graph");
        const clonedSvg = svgElement.cloneNode(true);
    
        // Add necessary namespaces
        clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    
        // Add styles for exported SVG
        const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
        styleElement.textContent = `
            .link { stroke: #aaa; stroke-width: 2; transition: stroke 0.3s; }
            .highlighted { stroke: orange !important; stroke-width: 4 !important; }
            .link.highlighted {
                stroke: orange;
                stroke-width: 4px;
                stroke-opacity: 1;
            }
            .legend { font-size: 12px; }
            .isolated { opacity: 0.8; }
            .node-circle {
                stroke: none;
                stroke-width: 2px;
                transition: stroke 0.3s, stroke-width 0.3s;
            }

            .node-circle.highlighted {
                stroke: orange;
                stroke-width: 4px;
            }
        `;
        clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);
    
        // Add a script for interactivity when opened in the browser
        const scriptContent = `
            document.addEventListener('DOMContentLoaded', function() {
                const nodes = document.querySelectorAll('.node-group');
                const links = document.querySelectorAll('.link');

                function getNodeId(node) {
                    return node.getAttribute('data-id');
                }

                function isConnected(a, b) {
                    return Array.from(links).some(link => {
                        const source = link.getAttribute('data-source');
                        const target = link.getAttribute('data-target');
                        return (source === a && target === b) || (source === b && target === a);
                    });
                }

                nodes.forEach(node => {
                    const nodeId = getNodeId(node);
                    const circle = node.querySelector('circle');

                    node.addEventListener('mouseover', () => {
                        // Highlight links
                        links.forEach(link => {
                            const source = link.getAttribute('data-source');
                            const target = link.getAttribute('data-target');
                            if (source === nodeId || target === nodeId) {
                                link.classList.add('highlighted');
                            }
                        });

                        // Highlight this node
                        circle.classList.add('highlighted');

                        // Highlight connected nodes
                        nodes.forEach(otherNode => {
                            const otherNodeId = getNodeId(otherNode);
                            if (otherNodeId !== nodeId && isConnected(nodeId, otherNodeId)) {
                                const otherCircle = otherNode.querySelector('circle');
                                if (otherCircle) otherCircle.classList.add('highlighted');
                            }
                        });
                    });

                    node.addEventListener('mouseout', () => {
                        // Remove highlights
                        links.forEach(link => link.classList.remove('highlighted'));
                        nodes.forEach(n => {
                            const c = n.querySelector('circle');
                            if (c) c.classList.remove('highlighted');
                        });
                    });

                    // Open link if clicked
                    node.addEventListener('click', function() {
                        const url = node.getAttribute('data-url');
                        if (url) {
                            window.open(url, "_blank");
                        }
                    });
                });
            });
            `;
        
        const scriptElement = document.createElementNS("http://www.w3.org/2000/svg", "script");
        scriptElement.textContent = scriptContent;
        clonedSvg.appendChild(scriptElement);
    
        // Convert to blob and trigger download
        const serializer = new XMLSerializer();
        const svgData = serializer.serializeToString(clonedSvg);
        const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
    
        const link = document.createElement("a");
        link.href = url;
        link.download = "static-graph.svg";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPNG = () => {
        const svgElement = document.getElementById("graph");
        const serializer = new XMLSerializer();
        const svgData = serializer.serializeToString(svgElement);
    
        const scaleFactor = 1;
        const originalWidth = svgElement.clientWidth;
        const originalHeight = svgElement.clientHeight;
        const width = originalWidth * scaleFactor;
        const height = originalHeight * scaleFactor;
    
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
    
        const ctx = canvas.getContext("2d");
    
        const image = new Image();
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
    
        image.onload = () => {
            ctx.drawImage(image, 0, 0, width, height);
            URL.revokeObjectURL(url);
    
            canvas.toBlob(blob => {
                const link = document.createElement("a");
                link.download = "static-graph.png";
                link.href = URL.createObjectURL(blob);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, "image/png");
        };
    
        image.src = url;
    };

    const handleDownloadPDF = () => {
        const svgElement = document.getElementById("graph");
        const svgWidth = svgElement.clientWidth;
        const svgHeight = svgElement.clientHeight;
        
        const clonedSvg = svgElement.cloneNode(true);
        
        clonedSvg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
        
        clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
        
        // Add styles for exported PDF
        const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
        styleElement.textContent = `
            .link { stroke: #aaa; stroke-width: 2; }
            .highlighted { stroke: orange; stroke-width: 4; }
            .link.highlighted {
                stroke: orange;
                stroke-width: 4px;
                stroke-opacity: 1;
            }
            .legend { font-size: 12px; }
            .isolated { opacity: 0.8; }
            .node-circle {
                stroke: none;
                stroke-width: 2px;
            }
            .node-circle.highlighted {
                stroke: orange;
                stroke-width: 4px;
            }
        `;
        clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);
        
        const serializer = new XMLSerializer();
        const svgData = serializer.serializeToString(clonedSvg);
        
        let orientation = svgWidth > svgHeight ? 'landscape' : 'portrait';
        
        // Create a new PDF with jsPDF
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'pt',
            format: [svgWidth, svgHeight]
        });
        
        // Add SVG to PDF document
        const element = document.createElement('div');
        element.innerHTML = svgData;
        const svgElement2 = element.firstChild;
        
        // Convert SVG to PDF
        pdf.svg(svgElement2, {
            x: 0,
            y: 0,
            width: svgWidth,
            height: svgHeight
        })
        .then(() => {
            // Save the PDF file
            pdf.save('static-graph.pdf');
        });
    };

    return (
        <div style={{ height: "100vh", width: "100vw", margin: 0, padding: 0 }}>
            <button 
                id="download" 
                onClick={handleDownload}
                style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    zIndex: 10
                }}
            >
                Download SVG
            </button>
            <button 
                onClick={handleDownloadPNG}
                style={{
                    position: "absolute",
                    top: 50,
                    right: 10,
                    zIndex: 10
                }}
            >
                Download PNG
            </button>
            <button 
                onClick={handleDownloadPDF}
                style={{
                    position: "absolute",
                    top: 90,
                    right: 10,
                    zIndex: 10
                }}
            >
                Download PDF
            </button>
            <svg id="graph" width="100%" height="100%">
                {data.nodes.length === 0 && (
                    <text x="50%" y="50%" textAnchor="middle" fontSize="16px">
                        Loading graph data...
                    </text>
                )}
            </svg>
        </div>
    );
};

export default StaticGraph;