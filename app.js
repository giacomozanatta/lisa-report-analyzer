// Enhanced LiSA CFG Analyzer with Force-Directed Layout and Expression Highlighting
class LiSACFGAnalyzer {
    constructor() {
        this.currentData = null;
        this.svg = null;
        this.zoom = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.width = 900;
        this.height = 700;
        this.activeTab = 'json-input';
        this.descriptions = new Map();
        this.mainNodes = new Set();
        this.showDetailNodes = false;
        this.currentSelectedNode = null;
        
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApp());
        } else {
            this.setupApp();
        }
    }

    setupApp() {
        console.log('Setting up app...');
        this.setupEventListeners();
        this.setupSVG();
        this.checkURLParameters();
        // Load sequential sample on startup
        //setTimeout(() => this.loadSequentialSample(), 100);
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!btn.disabled) {
                    this.switchTab(e.target.dataset.tab);
                }
            });
        });

        // Main controls
        const visualizeBtn = document.getElementById('visualizeBtn');
        const clearBtn = document.getElementById('clearBtn');
        const loadSequentialBtn = document.getElementById('loadSequentialBtn');
        const loadConditionalBtn = document.getElementById('loadConditionalBtn');
        const shareResultsBtn = document.getElementById('shareResultsBtn');
        
        if (visualizeBtn) {
            visualizeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.visualizeGraph();
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearInput();
            });
        }
        
        if (loadSequentialBtn) {
            loadSequentialBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadSequentialSample();
            });
        }
        
        if (loadConditionalBtn) {
            loadConditionalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadConditionalSample();
            });
        }
        
        if (shareResultsBtn) {
            shareResultsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showShareModal();
            });
        }

        // Graph controls
        const resetZoomBtn = document.getElementById('resetZoomBtn');
        const toggleDetailsBtn = document.getElementById('toggleDetailsBtn');
        const closePanelBtn = document.getElementById('closePanelBtn');
        
        if (resetZoomBtn) {
            resetZoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetZoom();
            });
        }
        
        if (toggleDetailsBtn) {
            toggleDetailsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleDetailNodes();
            });
        }
        
        if (closePanelBtn) {
            closePanelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideDetailsPanel();
            });
        }

        // Modal controls
        const closeModalBtn = document.getElementById('closeModalBtn');
        const copyUrlBtn = document.getElementById('copyUrlBtn');
        const modalBackdrop = document.querySelector('.modal-backdrop');
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideShareModal();
            });
        }
        
        if (copyUrlBtn) {
            copyUrlBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.copyShareUrl();
            });
        }
        
        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideShareModal();
            });
        }
    }

    setupSVG() {
        console.log('Setting up SVG...');
        const svgElement = document.getElementById('graphSvg');
        if (!svgElement) {
            console.error('SVG element not found!');
            return;
        }

        this.svg = d3.select('#graphSvg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        this.svg.selectAll('*').remove();

        // Define arrow markers
        const defs = this.svg.append('defs');
        
        // Sequential edge arrow
        defs.append('marker')
            .attr('id', 'arrowhead-sequential')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 36)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 12)
            .attr('markerHeight', 12)
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10,0 L 0,5')
            .attr('fill', '#218385');

        // True edge arrow - orange
        defs.append('marker')
            .attr('id', 'arrowhead-true')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 14)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 12)
            .attr('markerHeight', 12)
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10,0 L 0,5')
            .attr('fill', '#f97316');

        // False edge arrow - red
        defs.append('marker')
            .attr('id', 'arrowhead-false')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 14)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 12)
            .attr('markerHeight', 12)
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10,0 L 0,5')
            .attr('fill', '#C0152F');

        // Setup zoom
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.svg.select('.zoom-group').attr('transform', event.transform);
            });

        this.svg.call(this.zoom);
        
        // Create main group for zoom/pan
        this.svg.append('g').attr('class', 'zoom-group');
        
        console.log('SVG setup complete');
    }

    checkURLParameters() {
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);
        const compressed = params.get('data'); 

        if (compressed) {
            try {
                // safer: handle compressed/encoded data
                const parsedData = JSON.parse(LZString.decompressFromEncodedURIComponent(compressed));
                const jsonInput = document.getElementById('jsonInput');
                if (jsonInput) {
                    jsonInput.value = JSON.stringify(parsedData, null, 2);
                    this.showMessage('CFG data loaded from shared URL!', 'success');
                    setTimeout(() => this.visualizeGraph(), 500);
                }
            } catch (error) {
                this.showError('Failed to load shared CFG data: ' + error.message);
            }
        }
    }

    loadSequentialSample() {
        console.log('Loading sequential sample...');
        const sequentialExample = {
            "name": "void Main::main(String*[] args)",
            "description": null,
            "nodes": [
                {"id": 0, "subNodes": [1, 2], "text": "b1 = B(8)"},
                {"id": 1, "text": "b1"},
                {"id": 2, "subNodes": [3], "text": "B(8)"},
                {"id": 3, "text": "8"},
                {"id": 4, "subNodes": [5, 6], "text": "b3 = B(9)"},
                {"id": 5, "text": "b3"},
                {"id": 6, "subNodes": [7], "text": "B(9)"},
                {"id": 7, "text": "9"},
                {"id": 8, "text": "ret"}
            ],
            "edges": [
                {"sourceId": 0, "destId": 4, "kind": "SequentialEdge"},
                {"sourceId": 4, "destId": 8, "kind": "SequentialEdge"}
            ],
            "descriptions": [
                {"nodeId": 0, "description": {"expressions": ["b1"], "info": {"clinit": "_|_"}, "state": {"heap": {"args": ["heap[s]:pp@'Main.java':2:28"], "b1": ["heap[s]:pp@'Main.java':3:15"], "heap[s]:pp@'Main.java':3:15[c]": ["heap[s]:pp@'B.java':13:15"]}, "type": {"args": ["String*[]*"], "b1": ["B*"], "heap[s]:pp@'B.java':13:15": ["C"], "heap[s]:pp@'B.java':13:15[a]": ["int"], "heap[s]:pp@'Main.java':2:28": ["String*[]"], "heap[s]:pp@'Main.java':2:28[len]": ["int"], "heap[s]:pp@'Main.java':3:15": ["B"], "heap[s]:pp@'Main.java':3:15[c]": ["C*"], "heap[s]:pp@'Main.java':3:15[i]": ["int"], "heap[s]:pp@'Main.java':3:15[x]": ["int"]}, "value": {"heap[s]:pp@'B.java':13:15[a]": "[8, 8]", "heap[s]:pp@'Main.java':2:28[len]": "[0, +Inf]", "heap[s]:pp@'Main.java':3:15[i]": "[10, 10]", "heap[s]:pp@'Main.java':3:15[x]": "[8, 8]"}}}},
                {"nodeId": 4, "description": {"expressions": ["b3"], "info": {"clinit": "_|_"}, "state": {"heap": {"args": ["heap[s]:pp@'Main.java':2:28"], "b1": ["heap[s]:pp@'Main.java':3:15"], "b3": ["heap[s]:pp@'Main.java':4:15"], "heap[s]:pp@'Main.java':3:15[c]": ["heap[w]:pp@'B.java':13:15"], "heap[s]:pp@'Main.java':4:15[c]": ["heap[w]:pp@'B.java':13:15"]}, "type": {"args": ["String*[]*"], "b1": ["B*"], "b3": ["B*"], "heap[s]:pp@'Main.java':2:28": ["String*[]"], "heap[s]:pp@'Main.java':2:28[len]": ["int"], "heap[s]:pp@'Main.java':3:15": ["B"], "heap[s]:pp@'Main.java':3:15[c]": ["C*"], "heap[s]:pp@'Main.java':3:15[i]": ["int"], "heap[s]:pp@'Main.java':3:15[x]": ["int"], "heap[s]:pp@'Main.java':4:15": ["B"], "heap[s]:pp@'Main.java':4:15[c]": ["C*"], "heap[s]:pp@'Main.java':4:15[i]": ["int"], "heap[s]:pp@'Main.java':4:15[x]": ["int"], "heap[w]:pp@'B.java':13:15": ["C"], "heap[w]:pp@'B.java':13:15[a]": ["int"]}, "value": {"heap[s]:pp@'Main.java':2:28[len]": "[0, +Inf]", "heap[s]:pp@'Main.java':3:15[i]": "[10, 10]", "heap[s]:pp@'Main.java':3:15[x]": "[8, 8]", "heap[s]:pp@'Main.java':4:15[i]": "[10, 10]", "heap[s]:pp@'Main.java':4:15[x]": "[9, 9]", "heap[w]:pp@'B.java':13:15[a]": "[0, 9]"}}}},
                {"nodeId": 8, "description": {"expressions": ["skip"], "info": {"clinit": "_|_"}, "state": {"heap": {"args": ["heap[s]:pp@'Main.java':2:28"], "b1": ["heap[s]:pp@'Main.java':3:15"], "b3": ["heap[s]:pp@'Main.java':4:15"], "heap[s]:pp@'Main.java':3:15[c]": ["heap[w]:pp@'B.java':13:15"], "heap[s]:pp@'Main.java':4:15[c]": ["heap[w]:pp@'B.java':13:15"]}, "type": {"args": ["String*[]*"], "b1": ["B*"], "b3": ["B*"], "heap[s]:pp@'Main.java':2:28": ["String*[]"], "heap[s]:pp@'Main.java':2:28[len]": ["int"], "heap[s]:pp@'Main.java':3:15": ["B"], "heap[s]:pp@'Main.java':3:15[c]": ["C*"], "heap[s]:pp@'Main.java':3:15[i]": ["int"], "heap[s]:pp@'Main.java':3:15[x]": ["int"], "heap[s]:pp@'Main.java':4:15": ["B"], "heap[s]:pp@'Main.java':4:15[c]": ["C*"], "heap[s]:pp@'Main.java':4:15[i]": ["int"], "heap[s]:pp@'Main.java':4:15[x]": ["int"], "heap[w]:pp@'B.java':13:15": ["C"], "heap[w]:pp@'B.java':13:15[a]": ["int"]}}}}
            ]
        };
        
        const jsonInput = document.getElementById('jsonInput');
        if (jsonInput) {
            jsonInput.value = JSON.stringify(sequentialExample, null, 2);
            this.showMessage('Sequential example loaded!', 'success');
        }
    }

    loadConditionalSample() {
        console.log('Loading conditional sample...');
        const conditionalExample = {
            "name": "void Main::emptyStructure()",
            "description": null,
            "nodes": [
                {"id": 0, "subNodes": [1, 2], "text": "==(1, 0)"},
                {"id": 1, "text": "1"},
                {"id": 2, "text": "0"},
                {"id": 3, "text": "EMPTY_BLOCK()"},
                {"id": 4, "text": "EMPTY_BLOCK()"},
                {"id": 5, "text": "true"},
                {"id": 6, "text": "EMPTY_BLOCK()"},
                {"id": 7, "text": "true"},
                {"id": 8, "text": "ret"}
            ],
            "edges": [
                {"sourceId": 0, "destId": 3, "kind": "TrueEdge"},
                {"sourceId": 0, "destId": 4, "kind": "FalseEdge"},
                {"sourceId": 3, "destId": 5, "kind": "SequentialEdge"},
                {"sourceId": 4, "destId": 5, "kind": "SequentialEdge"},
                {"sourceId": 5, "destId": 6, "kind": "TrueEdge"},
                {"sourceId": 5, "destId": 7, "kind": "FalseEdge"},
                {"sourceId": 6, "destId": 7, "kind": "SequentialEdge"},
                {"sourceId": 7, "destId": 8, "kind": "FalseEdge"},
                {"sourceId": 7, "destId": 8, "kind": "TrueEdge"}
            ],
            "descriptions": []
        };
        
        const jsonInput = document.getElementById('jsonInput');
        if (jsonInput) {
            jsonInput.value = JSON.stringify(conditionalExample, null, 2);
            this.showMessage('Conditional example loaded!', 'success');
        }
    }

    switchTab(tabId) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Update active tab panel
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Activate the selected tab
        const selectedBtn = document.querySelector(`[data-tab="${tabId}"]`);
        const selectedPanel = document.getElementById(tabId);
        
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }
        
        if (selectedPanel) {
            selectedPanel.classList.add('active');
        }
        
        this.activeTab = tabId;
    }

    showMessage(message, type = 'success') {
        const messageEl = document.getElementById(type === 'success' ? 'successMessage' : 'errorMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.classList.remove('hidden');
            
            // Hide other message type
            const otherMessageEl = document.getElementById(type === 'success' ? 'errorMessage' : 'successMessage');
            if (otherMessageEl) {
                otherMessageEl.classList.add('hidden');
            }
            
            setTimeout(() => {
                messageEl.classList.add('hidden');
            }, 3000);
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    clearInput() {
        const jsonInput = document.getElementById('jsonInput');
        if (jsonInput) {
            jsonInput.value = '';
        }
        
        const errorMsg = document.getElementById('errorMessage');
        const successMsg = document.getElementById('successMessage');
        if (errorMsg) errorMsg.classList.add('hidden');
        if (successMsg) successMsg.classList.add('hidden');
        
        this.clearGraph();
        this.hideDetailsPanel();
        this.resetTabs();
        
        const graphTitle = document.getElementById('graphTitle');
        if (graphTitle) {
            graphTitle.textContent = 'Control Flow Graph';
        }
        
        this.currentData = null;
        this.showMessage('Input cleared!', 'success');
    }

    resetTabs() {
        // Disable tabs except JSON Input
        document.querySelectorAll('.tab-btn').forEach((btn, index) => {
            if (index > 0) {
                btn.disabled = true;
            }
        });
        
        // Switch back to JSON Input
        this.switchTab('json-input');
        
        // Disable share button
        const shareBtn = document.getElementById('shareResultsBtn');
        if (shareBtn) {
            shareBtn.disabled = true;
        }
    }

    visualizeGraph() {
        console.log('Starting visualization...');
        const jsonInput = document.getElementById('jsonInput');
        if (!jsonInput) {
            console.error('JSON input not found');
            return;
        }
        
        const input = jsonInput.value.trim();
        
        if (!input) {
            this.showError('Please enter JSON data to visualize.');
            return;
        }

        try {
            const data = JSON.parse(input);
            console.log('Parsed data:', data);
            this.validateData(data);
            this.currentData = data;
            this.processDescriptions(data);
            this.showMessage('CFG loaded successfully!', 'success');
            this.renderGraph(data);
            this.enableTabs();
            this.switchTab('graph-view');
            
            const graphTitle = document.getElementById('graphTitle');
            if (graphTitle) {
                graphTitle.textContent = data.name || 'Control Flow Graph';
            }
        } catch (error) {
            this.showError(`Error parsing JSON: ${error.message}`);
            console.error('Visualization error:', error);
        }
    }

    validateData(data) {
        if (!data.nodes || !Array.isArray(data.nodes)) {
            throw new Error('Data must contain a "nodes" array.');
        }
        if (!data.edges || !Array.isArray(data.edges)) {
            throw new Error('Data must contain an "edges" array.');
        }
    }

    processDescriptions(data) {
        this.descriptions.clear();
        this.mainNodes.clear();
        
        if (data.descriptions) {
            data.descriptions.forEach(desc => {
                this.descriptions.set(desc.nodeId, desc.description);
            });
        }
        
        // Identify main CFG nodes (those connected by any kind of edge)
        const connectedNodes = new Set();
        data.edges.forEach(edge => {
            connectedNodes.add(edge.sourceId);
            connectedNodes.add(edge.destId);
        });
        
        this.mainNodes = connectedNodes;
        console.log('Main nodes:', this.mainNodes);
    }

    enableTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.disabled = false;
        });
        const shareBtn = document.getElementById('shareResultsBtn');
        if (shareBtn) {
            shareBtn.disabled = false;
        }
    }

    renderGraph(data) {
        console.log('Rendering graph...');
        this.clearGraph();
        this.prepareGraphData(data);
        this.createForceDirectedVisualization();
    }

    clearGraph() {
        const zoomGroup = this.svg.select('.zoom-group');
        zoomGroup.selectAll('*').remove();
        
        // Stop any existing simulation
        if (this.simulation) {
            this.simulation.stop();
        }
    }

    prepareGraphData(data) {
        console.log('Preparing graph data...');
        const nodes = [];
        const links = [];

        // Create nodes with enhanced type classification
        data.nodes.forEach(node => {
            const isMainNode = this.mainNodes.has(node.id);
            let nodeType = 'detail';
            
            if (isMainNode) {
                // Determine if start or end node
                const hasIncoming = data.edges.some(e => e.destId === node.id);
                const hasOutgoing = data.edges.some(e => e.sourceId === node.id);
                
                if (!hasIncoming && hasOutgoing) {
                    nodeType = 'start';
                } else if (hasIncoming && !hasOutgoing) {
                    nodeType = 'end';
                } else {
                    nodeType = 'main';
                }
            }
            
            nodes.push({
                id: node.id,
                text: node.text,
                type: nodeType,
                subNodes: node.subNodes || [],
                data: node,
                description: this.descriptions.get(node.id)
            });
        });

        // Create main edges
        data.edges.forEach(edge => {
            links.push({
                source: edge.sourceId,
                target: edge.destId,
                type: edge.kind || 'SequentialEdge'
            });
        });

        // Create detail node links
        data.nodes.forEach(node => {
            if (node.subNodes && node.subNodes.length > 0) {
                node.subNodes.forEach(subId => {
                    links.push({
                        source: node.id,
                        target: subId,
                        type: 'detail'
                    });
                });
            }
        });

        this.nodes = nodes;
        this.links = links;
        
        console.log('Prepared nodes:', nodes.length);
        console.log('Prepared links:', links.length);
    }

    createForceDirectedVisualization() {
        console.log('Creating force-directed visualization...');
        const zoomGroup = this.svg.select('.zoom-group');

        // Filter nodes and links based on detail visibility
        const visibleNodes = this.showDetailNodes ? 
            this.nodes : 
            this.nodes.filter(n => n.type !== 'detail');
            
        const visibleLinks = this.showDetailNodes ? 
            this.links : 
            this.links.filter(l => l.type !== 'detail');

        console.log('Visible nodes:', visibleNodes.length);
        console.log('Visible links:', visibleLinks.length);

        // Create force simulation
        this.simulation = d3.forceSimulation(visibleNodes)
            .force('link', d3.forceLink(visibleLinks)
                .id(d => d.id)
                .distance(d => d.type === 'detail' ? 80 : 150)
                .strength(0.7)
            )
            .force('charge', d3.forceManyBody()
                .strength(-800)
            )
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide()
                .radius(d => d.type === 'detail' ? 50 : 70)
            );

        // Create links
        const link = zoomGroup.selectAll('.edge')
            .data(visibleLinks)
            .join('line')
            .attr('class', d => d.type === 'detail' ? 'detail-edge' : `edge ${d.type}`)
            .attr('stroke-width', d => d.type === 'detail' ? 1 : 2)
            .attr('stroke', d => {
                if (d.type === 'detail') return '#ccc';
                if (d.type === 'TrueEdge') return '#f97316';
                if (d.type === 'FalseEdge') return '#C0152F';
                return '#218385';
            })
            .attr('stroke-dasharray', d => d.type === 'detail' ? '3,3' : 'none')
            .attr('marker-end', d => {
                if (d.type === 'detail') return null;
                return `url(#arrowhead-${d.type === 'TrueEdge' ? 'true' : d.type === 'FalseEdge' ? 'false' : 'sequential'})`;
            });

        // Create node groups
        const node = zoomGroup.selectAll('.node')
            .data(visibleNodes)
            .join('g')
            .attr('class', d => `node ${d.type}-node`)
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', (event, d) => this.dragstarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragended(event, d))
            )
            .on('click', (event, d) => this.showNodeDetails(d))
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip());

        // Add rectangles to nodes
        node.append('rect')
            .attr('width', d => {
                const textWidth = d.text.length * 8;
                return d.type === 'detail' ? Math.max(80, textWidth) : Math.max(120, textWidth);
            })
            .attr('height', d => d.type === 'detail' ? 35 : 50)
            .attr('x', d => {
                const textWidth = d.text.length * 8;
                const width = d.type === 'detail' ? Math.max(80, textWidth) : Math.max(120, textWidth);
                return -width / 2;
            })
            .attr('y', d => -(d.type === 'detail' ? 35 : 50) / 2)
            .attr('rx', 5)
            .attr('fill', d => {
                if (d.type === 'start') return '#1D7A86';
                if (d.type === 'end') return '#9333ea';
                if (d.type === 'detail') return '#f3f4f6';
                return '#218385';
            })
            .attr('stroke', d => {
                if (d.type === 'start') return '#1A6B75';
                if (d.type === 'end') return '#7c3aed';
                if (d.type === 'detail') return '#d1d5db';
                return '#1D7A86';
            })
            .attr('stroke-width', 2);

        // Add node labels for start/end nodes
        node.filter(d => d.type === 'start' || d.type === 'end')
            .append('text')
            .attr('class', d => `node-label ${d.type}-label`)
            .attr('y', d => -(d.type === 'detail' ? 35 : 50) / 2 - 8)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .attr('fill', '#ffffff')
            .text(d => d.type === 'start' ? 'START' : 'END');

        // Add main text to nodes with expandable functionality
        node.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('font-size', d => d.type === 'detail' ? '10px' : '12px')
            .attr('font-weight', '500')
            .attr('fill', d => d.type === 'detail' ? '#374151' : '#ffffff')
            .style('pointer-events', 'none')
            .each(function(d) {
                const text = d3.select(this);
                const maxLength = d.type === 'detail' ? 10 : 14;
                
                if (d.text.length > maxLength) {
                    text.text(d.text.substring(0, maxLength) + '...')
                        .style('cursor', 'pointer')
                        .attr('class', 'expandable')
                        .style('pointer-events', 'auto')
                        .on('click', function(event) {
                            event.stopPropagation();
                            const currentText = text.text();
                            if (currentText.endsWith('...')) {
                                text.text(d.text);
                            } else {
                                text.text(d.text.substring(0, maxLength) + '...');
                            }
                        });
                } else {
                    text.text(d.text);
                }
            });

        // Add edge labels for conditional edges
        const edgeLabels = zoomGroup.selectAll('.edge-label')
            .data(visibleLinks.filter(l => l.type === 'TrueEdge' || l.type === 'FalseEdge'))
            .join('text')
            .attr('class', d => `edge-label ${d.type === 'TrueEdge' ? 'true' : 'false'}-label`)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('fill', d => d.type === 'TrueEdge' ? '#ea580c' : '#dc2626')
            .text(d => d.type === 'TrueEdge' ? 'T' : 'F');

        // Update positions on each tick
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node.attr('transform', d => `translate(${d.x},${d.y})`);

            edgeLabels.attr('transform', d => {
                const midX = (d.source.x + d.target.x) / 2;
                const midY = (d.source.y + d.target.y) / 2;
                return `translate(${midX}, ${midY})`;
            });
        });

        // Start the simulation
        this.simulation.alpha(1).restart();
        
        console.log('Force simulation started');
    }

    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    toggleDetailNodes() {
        this.showDetailNodes = !this.showDetailNodes;
        const btn = document.getElementById('toggleDetailsBtn');
        if (btn) {
            btn.textContent = this.showDetailNodes ? 'Hide Details' : 'Show Details';
        }
        
        if (this.currentData) {
            this.renderGraph(this.currentData);
        }
    }

    showTooltip(event, d) {
        const tooltip = document.getElementById('tooltip');
        if (!tooltip) return;
        
        const desc = d.description;
        
        let content = `<strong>Node ${d.id}</strong><br>${d.text}<br><em>Type: ${d.type} node</em>`;
        
        if (desc?.expressions) {
            content += `<br><strong>Expressions:</strong> ${desc.expressions.join(', ')}`;
        }
        
        tooltip.innerHTML = content;
        tooltip.classList.remove('hidden');
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY - 10) + 'px';
    }

    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.classList.add('hidden');
        }
    }

    showNodeDetails(nodeData) {
        this.currentSelectedNode = nodeData.id;
        const panel = document.getElementById('detailsPanel');
        const content = document.getElementById('detailsContent');
        
        if (!panel || !content) return;
        
        const description = nodeData.description;
        
        let html = `
            <div class="node-info current-node">
                <h4>Node ${nodeData.id} ${this.getNodeTypeLabel(nodeData.type)}</h4>
                <div class="code">${nodeData.text}</div>
        `;

        if (!description) {
            html += '<p>No detailed description available.</p></div>';
            content.innerHTML = html;
            panel.classList.remove('hidden');
            return;
        }

        // Get current expressions for highlighting
        const currentExpressions = description.expressions || [];
        
        if (description.expressions) {
            html += `
                <div class="state-section">
                    <h5>Current Expressions</h5>
                    <ul class="state-list">
                        ${description.expressions.map(expr => `<li class="highlighted">${expr}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        if (description.state?.heap) {
            const heapEntries = Object.entries(description.state.heap);
            html += `
                <div class="state-section">
                    <h5>Heap State</h5>
                    <ul class="state-list">
                        ${heapEntries.slice(0, 5).map(([key, value]) => {
                            const isHighlighted = this.shouldHighlightEntry(key, currentExpressions);
                            return `<li class="${isHighlighted ? 'highlighted' : ''}"><strong>${key}:</strong> ${JSON.stringify(value)}</li>`;
                        }).join('')}
                    </ul>
                    ${heapEntries.length > 5 ? 
                        `<span class="expand-toggle" onclick="this.nextElementSibling.classList.toggle('show'); this.textContent = this.textContent.includes('Show') ? 'Show less' : 'Show ${heapEntries.length - 5} more items'">Show ${heapEntries.length - 5} more items</span>
                        <div class="expanded-content">
                            <ul class="state-list">
                                ${heapEntries.slice(5).map(([key, value]) => {
                                    const isHighlighted = this.shouldHighlightEntry(key, currentExpressions);
                                    return `<li class="${isHighlighted ? 'highlighted' : ''}"><strong>${key}:</strong> ${JSON.stringify(value)}</li>`;
                                }).join('')}
                            </ul>
                        </div>` : 
                        ''
                    }
                </div>
            `;
        }

        if (description.state?.type) {
            const typeEntries = Object.entries(description.state.type);
            html += `
                <div class="state-section">
                    <h5>Type Information</h5>
                    <ul class="state-list">
                        ${typeEntries.slice(0, 5).map(([key, value]) => {
                            const isHighlighted = this.shouldHighlightEntry(key, currentExpressions);
                            return `<li class="${isHighlighted ? 'highlighted' : ''}"><strong>${key}:</strong> ${JSON.stringify(value)}</li>`;
                        }).join('')}
                    </ul>
                    ${typeEntries.length > 5 ? 
                        `<span class="expand-toggle" onclick="this.nextElementSibling.classList.toggle('show'); this.textContent = this.textContent.includes('Show') ? 'Show less' : 'Show ${typeEntries.length - 5} more items'">Show ${typeEntries.length - 5} more items</span>
                        <div class="expanded-content">
                            <ul class="state-list">
                                ${typeEntries.slice(5).map(([key, value]) => {
                                    const isHighlighted = this.shouldHighlightEntry(key, currentExpressions);
                                    return `<li class="${isHighlighted ? 'highlighted' : ''}"><strong>${key}:</strong> ${JSON.stringify(value)}</li>`;
                                }).join('')}
                            </ul>
                        </div>` : 
                        ''
                    }
                </div>
            `;
        }

        if (description.state?.value) {
            html += `
                <div class="state-section">
                    <h5>Value Information</h5>
                    <ul class="state-list">
                        ${Object.entries(description.state.value).map(([key, value]) => {
                            const isHighlighted = this.shouldHighlightEntry(key, currentExpressions);
                            return `<li class="${isHighlighted ? 'highlighted' : ''}"><strong>${key}:</strong> ${value}</li>`;
                        }).join('')}
                    </ul>
                </div>
            `;
        }

        html += '</div>';
        content.innerHTML = html;
        panel.classList.remove('hidden');
        
        // Highlight the current node in the graph
        this.highlightCurrentNode(nodeData.id);
    }

    shouldHighlightEntry(key, expressions) {
        // Check if the key contains any of the current expressions
        return expressions.some(expr => key.includes(expr));
    }

    getNodeTypeLabel(type) {
        switch(type) {
            case 'start': return '(START)';
            case 'end': return '(END)';
            case 'main': return '(CFG Node)';
            case 'detail': return '(Expression Detail)';
            default: return '';
        }
    }

    highlightCurrentNode(nodeId) {
        // Remove existing highlights
        this.svg.selectAll('.node').classed('highlighted', false);
        
        // Highlight the specific node
        this.svg.selectAll('.node')
            .filter(d => d.id === nodeId)
            .classed('highlighted', true);
    }

    hideDetailsPanel() {
        const panel = document.getElementById('detailsPanel');
        if (panel) {
            panel.classList.add('hidden');
        }
        this.currentSelectedNode = null;
        this.svg.selectAll('.node').classed('highlighted', false);
    }

    showShareModal() {
        if (!this.currentData) {
            this.showError('No data to share. Please visualize a CFG first.');
            return;
        }

        try {
            // Stringify + compress
            const jsonString = JSON.stringify(this.currentData);
            const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(this.currentData));

            // Use #data= instead of ?data=
            const shareUrl = `${window.location.origin}${window.location.pathname}#data=${compressed}`;

            const shareUrlInput = document.getElementById('shareUrl');
            const shareModal = document.getElementById('shareModal');

            if (shareUrlInput && shareModal) {
                shareUrlInput.value = shareUrl;
                shareModal.classList.remove('hidden');
            }
        } catch (error) {
            this.showError('Failed to generate share URL: ' + error.message);
        }
    }

    hideShareModal() {
        const shareModal = document.getElementById('shareModal');
        if (shareModal) {
            shareModal.classList.add('hidden');
        }
    }

    copyShareUrl() {
        const urlInput = document.getElementById('shareUrl');
        if (!urlInput) return;
        
        urlInput.select();
        urlInput.setSelectionRange(0, 99999);
        
        try {
            document.execCommand('copy');
            this.showMessage('Share URL copied to clipboard!', 'success');
            this.hideShareModal();
        } catch (error) {
            this.showError('Failed to copy URL to clipboard');
        }
    }

    resetZoom() {
        if (this.svg && this.zoom) {
            this.svg.transition().duration(750).call(
                this.zoom.transform,
                d3.zoomIdentity
            );
        }
    }
}

// Initialize the application
new LiSACFGAnalyzer();
