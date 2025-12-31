import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import { Download, ImageDown, ChevronDown } from "lucide-react";
import Footer from './footer';
import { base_url, kghb_url } from '../api';

const StaticGraph = ({ data }) => {
    const [graphRendered, setGraphRendered] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [hasIsolatedNodes, setHasIsolatedNodes] = useState(false);
    const containerRef = useRef(null);
    const isolatedSectionRef = useRef(null);

    // Handle responsive resizing
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { clientWidth } = containerRef.current;
                // Use full viewport height for the connected section
                const viewportHeight = window.innerHeight;
                setDimensions({ width: clientWidth, height: viewportHeight });
                setGraphRendered(false); // Force re-render on resize
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        if (data.nodes.length === 0 || data.links.length === 0 || !dimensions.width) return;
        
        // Check for isolated nodes
        const linkedNodeIds = new Set();
        data.links.forEach(link => {
            linkedNodeIds.add(typeof link.source === 'object' ? link.source.id : link.source);
            linkedNodeIds.add(typeof link.target === 'object' ? link.target.id : link.target);
        });
        const isolatedNodes = data.nodes.filter(node => !linkedNodeIds.has(node.id));
        setHasIsolatedNodes(isolatedNodes.length > 0);
        
        // Render the graph
        renderStaticGraph();
        setGraphRendered(true);
    }, [data, dimensions]);

    const scrollToIsolated = () => {
        if (isolatedSectionRef.current) {
            isolatedSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const renderStaticGraph = () => {
        const svgElement = document.getElementById("graph");
        const width = dimensions.width;
        // Connected section takes full viewport height
        const connectedHeight = dimensions.height;
        const svg = d3.select("#graph");
        
        // Responsive breakpoints
        const isMobile = width < 768;
        const isTablet = width >= 768 && width < 1024;
        const isDesktop = width >= 1024;
        
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
    
        // Clear previous graph elements
        svg.selectAll("*").remove();
    
        // Responsive legend positioning and sizing
        const legendX = isMobile ? 5 : 10;
        const legendY = isMobile ? 5 : 10;
        const legendSpacing = isMobile ? 18 : 20;
        const legendRectSize = isMobile ? 12 : 15;
        const legendFontSize = isMobile ? 10 : 12;
        
        // Draw color legend
        const legend = svg.append("g").attr("transform", `translate(${legendX}, ${legendY})`);
    
        legend.selectAll("rect")
            .data(categories)
            .enter().append("rect")
            .attr("x", 0)
            .attr("y", (d, i) => i * legendSpacing)
            .attr("width", legendRectSize)
            .attr("height", legendRectSize)
            .attr("fill", d => colorScale(d));
    
        legend.selectAll("text")
            .data(categories)
            .enter().append("text")
            .attr("font-family", "Arial")
            .attr("font-size", `${legendFontSize}px`)
            .attr("x", legendRectSize + 8)
            .attr("y", (d, i) => i * legendSpacing + legendRectSize - 2)
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
        
        // Process links
        const validLinks = data.links.filter(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return linkedNodeIds.has(sourceId) && linkedNodeIds.has(targetId);
        });
        
        // Calculate incoming links
        const incomingLinkCounts = {};
        data.nodes.forEach(node => {
            incomingLinkCounts[node.id] = 0;
        });
        
        data.links.forEach(link => {
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            incomingLinkCounts[targetId] = (incomingLinkCounts[targetId] || 0) + 1;
        });
        
        // Responsive node sizes
        const minNodeSize = isMobile ? 15 : isTablet ? 17 : 26;
        const maxNodeSize = isMobile ? 35 : isTablet ? 40 : 50;
        const maxIncomingLinks = Math.max(1, ...Object.values(incomingLinkCounts));
        
        const nodeSizeScale = d3.scaleLinear()
            .domain([0, maxIncomingLinks])
            .range([minNodeSize, maxNodeSize])
            .clamp(true);
        
        // Calculate isolated section height
        const colSpacing = isMobile ? 50 : isTablet ? 55 : 60;
        const rowSpacing = isMobile ? 65 : isTablet ? 72 : 80;
        const marginLeft = isMobile ? 20 : isTablet ? 35 : 50;
        const marginRight = isMobile ? 20 : isTablet ? 35 : 50;
        const availableWidth = width - marginLeft - marginRight;
        const maxCols = Math.max(1, Math.floor(availableWidth / colSpacing));
        const isolatedRows = Math.ceil(isolatedNodes.length / maxCols);
        const isolatedSectionHeight = isolatedNodes.length > 0 
            ? (isMobile ? 100 : 120) + isolatedRows * rowSpacing + 100 
            : 0;
        
        // Total SVG height - set both as attribute and style for proper rendering
        const totalHeight = connectedHeight + isolatedSectionHeight;
        svg.attr("height", totalHeight);
        svg.style("height", `${totalHeight}px`);
        svg.style("min-height", `${totalHeight}px`);

        // Responsive force simulation parameters
        const linkDistance = isMobile ? 80 : isTablet ? 120 : 150;
        const chargeStrength = isMobile ? -15 : isTablet ? -20 : -25;
        const collisionPadding = isMobile ? 5 : 9;
        
        // Calculate legend height to position nodes next to it
        const legendHeight = categories.length * legendSpacing + 20;
        const topPadding = isMobile ? 30 : 40;

        // Pre-calculate positions for connected nodes - use full connected height
        // Center nodes vertically in the available space, accounting for legend
        const centerY = Math.max(connectedHeight / 2, legendHeight / 2 + topPadding);
        
        const simulation = d3.forceSimulation(connectedNodes)
            .force("link", d3.forceLink(validLinks).id(d => d.id).distance(linkDistance))
            .force("charge", d3.forceManyBody().strength(chargeStrength))
            .force("center", d3.forceCenter(width / 2, centerY))
            .force("collide", d3.forceCollide(d => nodeSizeScale(incomingLinkCounts[d.id]) + collisionPadding))
            .force("x", d3.forceX(width / 2).strength(0.05))
            .force("y", d3.forceY(centerY).strength(0.08));

        for (let i = 0; i < 300; ++i) simulation.tick();

        // Position isolated nodes below the connected section
        isolatedNodes.forEach((node, i) => {
            const row = Math.floor(i / maxCols);
            const col = i % maxCols;

            const nodesInRow = Math.min(maxCols, isolatedNodes.length - row * maxCols);
            const rowWidth = nodesInRow * colSpacing;
            const startX = marginLeft + (availableWidth - rowWidth) / 2 + colSpacing / 2;

            node.x = startX + col * colSpacing;
            node.y = connectedHeight + (isMobile ? 60 : 80) + row * rowSpacing;
        });

        // Ensure connected nodes stay within the connected section bounds
        // Allow nodes to be positioned higher, near the legend
        const padding = isMobile ? 20 : 30;
        const minY = isMobile ? 15 : 20; // Allow nodes closer to top
        connectedNodes.forEach(node => {
            node.x = Math.min(Math.max(node.x, padding), width - padding);
            node.y = Math.min(Math.max(node.y, minY), connectedHeight - padding);
        });

        // Draw divider line between connected and isolated sections
        if (isolatedNodes.length > 0) {
            svg.append("line")
                .attr("x1", 0)
                .attr("y1", connectedHeight)
                .attr("x2", width)
                .attr("y2", connectedHeight)
                .attr("stroke", "#ccc")
                .attr("stroke-dasharray", "5,5")
                .attr("stroke-width", 1);

            // Label for isolated nodes section
            svg.append("text")
                .attr("id", "isolated-section-label")
                .attr("x", width / 2)
                .attr("y", connectedHeight + (isMobile ? 25 : 35))
                .attr("text-anchor", "middle")
                .attr("font-size", isMobile ? "14px" : "16px")
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
            .attr("stroke-width", isMobile ? 0.5 : 1)
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
            
            // Responsive font size
            const baseFontSize = isMobile ? 8 : 10;
            const fontSize = Math.min(baseFontSize + (nodeSize - minNodeSize) / 5, isMobile ? 11 : 14);
            
            a.append("text")
                .attr("fill", "black")
                .attr("font-size", `${fontSize}px`)
                .attr("font-family", "Arial")
                .attr("font-weight", "bold")
                .attr("text-anchor", "middle")
                .attr("dy", ".35em")
                .text(d => abbreviateText(d.title || d.id, nodeSize, isMobile));
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
                .attr("font-size", isMobile ? "8px" : "10px")
                .attr("font-family", "Arial")
                .attr("font-weight", "bold")
                .attr("text-anchor", "middle")
                .attr("dy", ".35em")
                .text(d => abbreviateText(d.title || d.id, nodeSize, isMobile));
        });
        
        // Add hover effects for connected nodes
        connectedNodeGroups.on("mouseover", (event, d) => {
            const nodeId = d.id;
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
            svg.selectAll(".link").classed("highlighted", false);
            d3.select(event.currentTarget).select("circle").classed("highlighted", false);
            svg.selectAll(".node-circle").classed("highlighted", false);
        });

        // Add hover effects for isolated nodes
        isolatedNodeGroups.on("mouseover", (event, d) => {
            d3.select(event.currentTarget).select("circle").classed("highlighted", true);
        })
        .on("mouseout", (event) => {
            d3.select(event.currentTarget).select("circle").classed("highlighted", false);
        });
    };
    
    function abbreviateText(text, nodeRadius, isMobile = false) {
        if (!text) return "";
        
        const scaleFactor = isMobile ? 0.18 : 0.22;
        const maxLength = Math.floor(nodeRadius * scaleFactor);
        
        if (text.length > maxLength) {
            return text.substring(0, maxLength) + "...";
        }
        return text;
    }

    const handleDownload = () => {
        const svgElement = document.getElementById("graph");
        const clonedSvg = svgElement.cloneNode(true);
    
        clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    
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
                        links.forEach(link => {
                            const source = link.getAttribute('data-source');
                            const target = link.getAttribute('data-target');
                            if (source === nodeId || target === nodeId) {
                                link.classList.add('highlighted');
                            }
                        });

                        circle.classList.add('highlighted');

                        nodes.forEach(otherNode => {
                            const otherNodeId = getNodeId(otherNode);
                            if (otherNodeId !== nodeId && isConnected(nodeId, otherNodeId)) {
                                const otherCircle = otherNode.querySelector('circle');
                                if (otherCircle) otherCircle.classList.add('highlighted');
                            }
                        });
                    });

                    node.addEventListener('mouseout', () => {
                        links.forEach(link => link.classList.remove('highlighted'));
                        nodes.forEach(n => {
                            const c = n.querySelector('circle');
                            if (c) c.classList.remove('highlighted');
                        });
                    });

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
        
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'pt',
            format: [svgWidth, svgHeight]
        });
        
        const element = document.createElement('div');
        element.innerHTML = svgData;
        const svgElement2 = element.firstChild;
        
        pdf.svg(svgElement2, {
            x: 0,
            y: 0,
            width: svgWidth,
            height: svgHeight
        })
        .then(() => {
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

    // Determine if we're on mobile for button layout
    const isMobileView = dimensions.width < 768;

    return (
        <div
          style={{
            height: "100vh",
            width: "100vw",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            fontFamily: "sans-serif",
            overflow: "hidden",
          }}
        >
          {/* Scrollable content area */}
          <div 
            ref={containerRef}
            style={{ 
              flex: 1, 
              position: "relative", 
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <svg id="graph" width="100%">
              {data.nodes.length === 0 && (
                <text x="50%" y="50%" textAnchor="middle" fontSize="16px" fill="#555">
                  Loading graph data...
                </text>
              )}
            </svg>
            
            {/* Invisible anchor for isolated section */}
            <div ref={isolatedSectionRef} style={{ position: 'absolute', top: dimensions.height, left: 0 }} />
            
            {/* Button Bar - Now inside scrollable area, below isolated nodes */}
            <div
              style={{
                  padding: isMobileView ? "12px" : "20px",
                  display: "flex",
                  flexDirection: isMobileView ? "column" : "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: isMobileView ? "10px" : "20px",
                  backgroundColor: "#f9fafb",
                  borderTop: "1px solid #e5e7eb",
              }}
            >
              <button
                id="download"
                onClick={handleDownload}
                style={buttonStyle("#3B82F6", "#2563EB", isMobileView)}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#2563EB")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#3B82F6")}
              >
                {isMobileView ? "SVG" : "Download cloud as SVG"}
              </button>
              <button
                onClick={handleDownloadPNG}
                style={buttonStyle("#10B981", "#059669", isMobileView)}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#059669")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#10B981")}
              >
                {isMobileView ? "PNG" : "Download Cloud as PNG"}
              </button>
              <button
                onClick={handleDownloadPDF}
                style={buttonStyle("#EF4444", "#DC2626", isMobileView)}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#DC2626")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#EF4444")}
              >
                {isMobileView ? "PDF" : "Download Cloud as PDF"}
              </button>
              <button
                onClick={handleDownloadCSV}
                style={buttonStyle("#F59E0B", "#D97706", isMobileView)}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#D97706")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#F59E0B")}
              >
                {isMobileView ? "CSV" : "Download Cloud as CSV"}
              </button>
            </div>
            
            <Footer />
          </div>
          
          {/* Fixed "View Isolated Nodes" button - bottom right corner */}
          {hasIsolatedNodes && (
            <button
              onClick={scrollToIsolated}
              style={{
                position: "fixed",
                bottom: isMobileView ? "15px" : "20px",
                right: isMobileView ? "15px" : "20px",
                padding: isMobileView ? "8px 12px" : "10px 16px",
                backgroundColor: "#3380af",
                color: "white",
                border: "none",
                borderRadius: "9999px",
                boxShadow: "0 3px 10px rgba(51, 128, 175, 0.8)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                fontSize: isMobileView ? "11px" : "12px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                zIndex: 1000,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#0d9af2ff";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 5px 14px rgba(51, 128, 175, 1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#3380af";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 3px 10px rgba(51, 128, 175, 0.8)";
              }}
            >
              <ChevronDown size={isMobileView ? 14 : 16} />
              {isMobileView ? "Isolated" : "View Isolated Nodes"}
            </button>
          )}
        </div>
    );

    function buttonStyle(color, hoverColor, isMobile) {
        return {
            padding: isMobile ? "10px 16px" : "10px 20px",
            backgroundColor: color,
            color: "white",
            border: "none",
            borderRadius: "9999px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            cursor: "pointer",
            transition: "all 0.3s ease",
            fontSize: isMobile ? "13px" : "14px",
            width: isMobile ? "100%" : "auto",
            maxWidth: isMobile ? "300px" : "none",
        };
    }
};

export default StaticGraph;