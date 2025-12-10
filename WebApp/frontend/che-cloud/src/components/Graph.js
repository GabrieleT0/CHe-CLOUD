import React, { useEffect, useState } from 'react';
import * as d3 from 'd3';
import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import { Download, ImageDown } from "lucide-react";
import Footer from './footer';
import { base_url, kghb_url } from '../api';

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
        const categoryColors = {
            "Tangible": "#bddbcf",
            "Intangible": "#6fa990",
            "Generic": "#debaa9",
            "Natural": "#f6f0e4"
        };
        const colorScale = d3.scaleOrdinal()
            .domain(Object.keys(categoryColors))
            .range(Object.values(categoryColors));

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
            .attr("font-family", "Arial")
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
        
        // Calculate the number of incoming links for each node
        const incomingLinkCounts = {};
        data.nodes.forEach(node => {
            incomingLinkCounts[node.id] = 0;
        });
        
        data.links.forEach(link => {
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            incomingLinkCounts[targetId] = (incomingLinkCounts[targetId] || 0) + 1;
        });
        
        // Create a scale for node sizes based on incoming links
        const minNodeSize = 25;
        const maxNodeSize = 60;
        const maxIncomingLinks = Math.max(1, ...Object.values(incomingLinkCounts));
        
        const nodeSizeScale = d3.scaleLinear()
            .domain([0, maxIncomingLinks])
            .range([minNodeSize, maxNodeSize])
            .clamp(true);
        
        // Define the boundary between connected and isolated nodes (horizontal split)
        const boundaryY = height * 0.7;

        // Split nodes into connected and isolated remains the same

        // Pre-calculate positions for connected nodes using D3 force layout
        const simulation = d3.forceSimulation(connectedNodes)
            .force("link", d3.forceLink(validLinks).id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-25))
            .force("center", d3.forceCenter(width / 2, boundaryY / 2))
            .force("collide", d3.forceCollide(d => nodeSizeScale(incomingLinkCounts[d.id]) + 9))
            .force("x", d3.forceX(width / 2).strength(0.05))
            .force("y", d3.forceY(boundaryY / 2).strength(0.05));

        for (let i = 0; i < 300; ++i) simulation.tick();

        // Calculate positions for isolated nodes in a grid below connected nodes
        const isolatedCols = Math.ceil(Math.sqrt(isolatedNodes.length));
        const colSpacing = 60; 
        const rowSpacing = 80; 
        const maxCols = Math.floor(width / colSpacing) || 1; // max number of columns that fit horizontally
        const marginLeft = 50;   // left margin
        const marginRight = 50;
        const availableWidth = width - marginLeft - marginRight;

        isolatedNodes.forEach((node, i) => {
            const row = Math.floor(i / maxCols);
            const col = i % maxCols;

            // Center row horizontally
            const nodesInRow = Math.min(maxCols, isolatedNodes.length - row * maxCols);
            const rowWidth = nodesInRow * colSpacing;
            const startX = marginLeft + (availableWidth - rowWidth) / 2 + colSpacing / 2;

            node.x = startX + col * colSpacing;
            node.y = boundaryY + 80 + row * rowSpacing;
        });

        // Ensure connected nodes stay within top area
        connectedNodes.forEach(node => {
            node.x = Math.min(Math.max(node.x, 30), width - 30);
            node.y = Math.min(Math.max(node.y, 30), boundaryY - 30);
        });

        // Draw the horizontal divider line
        svg.append("line")
            .attr("x1", 0)
            .attr("y1", boundaryY)
            .attr("x2", width)
            .attr("y2", boundaryY)
            .attr("stroke", "#ccc")
            .attr("stroke-dasharray", "5,5")
            .attr("stroke-width", 1);

        // Add label for isolated nodes
        if (isolatedNodes.length > 0) {
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", boundaryY + 30)
                .attr("text-anchor", "middle")
                .attr("font-size", "14px")
                .attr("font-family", "Arial")
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
            const nodeSize = nodeSizeScale(incomingLinkCounts[d.id]);
            
            // Add a tooltip with link count information
            const tooltip = g.append("title")
                .text(d => `${d.title || d.id}\nIncoming links: ${incomingLinkCounts[d.id]}`);
                
            const a = g.append("a")
                .attr("xlink:href", d => d.url)
                .attr("target", "_blank")
                .style("cursor", "pointer");
                
            a.append("circle")
                .attr("r", nodeSize)
                .attr("fill", d => colorScale(d.category))
                .attr("class", "node-circle");
            
            a.append("text")
                .attr("fill", "black")
                .attr("font-size", d => Math.min(10 + (nodeSize - minNodeSize) / 5, 14) + "px") // Scale font size with node
                .attr("font-family", "Arial")
                .attr("font-weight", "bold")
                .attr("text-anchor", "middle")
                .attr("dy", ".35em")
                .text(d => abbreviateText(d.title || d.id, nodeSize));
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
            // Isolated nodes get the minimum size
            const nodeSize = minNodeSize;
            
            const tooltip = g.append("title")
                .text(d => `${d.title || d.id}\nIncoming links: 0`);
                
            const a = g.append("a")
                .attr("xlink:href", d => d.url)
                .attr("target", "_blank")
                .style("cursor", "pointer");
                
            a.append("circle")
                .attr("r", nodeSize)
                .attr("fill", d => colorScale(d.category))
                .style("opacity", 0.8);
            
            a.append("text")
                .attr("fill", "black")
                .attr("font-size", "10px")
                .attr("font-family", "Arial")
                .attr("font-weight", "bold")
                .attr("text-anchor", "middle")
                .attr("dy", ".35em")
                .text(d => abbreviateText(d.title || d.id, nodeSize));
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

        // Add hover effects for isolated nodes
        isolatedNodeGroups.on("mouseover", (event, d) => {
            // Highlight links connected to this node
            d3.select(event.currentTarget).select("circle").classed("highlighted", true);
        })
        .on("mouseout", (event) => {
            // Remove highlight when mouse leaves
            d3.select(event.currentTarget).select("circle").classed("highlighted", false);
        });
    };
    
    function abbreviateText(text, nodeRadius) {
        if (!text) return "";
        
        // Determine maxLength based on the node size (scale factor can be adjusted)
        const scaleFactor = 0.22; // tweak this to control label length per radius unit
        const maxLength = Math.floor(nodeRadius * scaleFactor);
        
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


const handleDownloadCSV = async () => {
    try {
        const response = await fetch(`${base_url}/CHe_cloud_data/export_csv`);
        
        if (!response.ok) {
        throw new Error('Failed to download CSV');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'CHeCLOUD_datasets.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading CSV:', error);
        alert('Failed to download CSV. Please try again.');
    }
    };

    return (
        <div
          style={{
            height: "100vh", // Full height of the viewport
            width: "100vw",  // Full width of the viewport
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            fontFamily: "sans-serif",
          }}
        >
          {/* Graph Area */}
          <div style={{ flex: 1, position: "relative", overflowY: "auto" }}>
            <svg id="graph" width="100%" height="100%">
              {data.nodes.length === 0 && (
                <text x="50%" y="50%" textAnchor="middle" fontSize="16px" fill="#555">
                  Loading graph data...
                </text>
              )}
            </svg>
          </div>
    
          {/* Button Bar */}
          <div
            style={{
                padding: "20px",
                display: "flex",
                justifyContent: "center",
                gap: "20px",
                backgroundColor: "#f9fafb",
                borderTop: "1px solid #e5e7eb",
            }}
          >
            <button
              id="download"
              onClick={handleDownload}
              style={buttonStyle("#3B82F6", "#2563EB")}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#2563EB")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#3B82F6")}
            >
              Download cloud as SVG
            </button>
            <button
              onClick={handleDownloadPNG}
              style={buttonStyle("#10B981", "#059669")}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#059669")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#10B981")}
            >
              Download Cloud as PNG
            </button>
            <button
              onClick={handleDownloadPDF}
              style={buttonStyle("#EF4444", "#DC2626")}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#DC2626")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#EF4444")}
            >
              Download Cloud as PDF
            </button>
            
            <button
              onClick={handleDownloadCSV}
              style={buttonStyle("#F59E0B", "#D97706")}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#D97706")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#F59E0B")}
            >
              Download Cloud as CSV
            </button>
          </div>
          <Footer />
        </div>
      );

    function buttonStyle(color, hoverColor) {
        return {
        padding: "10px 20px",
        backgroundColor: color,
        color: "white",
        border: "none",
        borderRadius: "9999px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        cursor: "pointer",
        transition: "all 0.3s ease",
        };
    }
};

export default StaticGraph;