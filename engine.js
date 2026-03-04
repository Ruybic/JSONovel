let gameData = { nodes: [] };
let activeNodeId = null;

// ==========================================
// 1. INIT & AUTO-SAVE
// ==========================================
function initEditor(mode) {
    if (mode === 'load' && localStorage.getItem('vn_project')) {
        gameData = JSON.parse(localStorage.getItem('vn_project'));
    } else {
        gameData = {
            nodes: [{
                id: "start", speaker: "System", text: "New game start.",
                editorX: 200, editorY: 200, next: "", choices: []
            }]
        };
        saveToLocal();
    }
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('node-editor').classList.remove('hidden');
    refreshCanvas();
    loadIntoSidebar(gameData.nodes[0].id);
}

function saveToLocal() {
    localStorage.setItem('vn_project', JSON.stringify(gameData));
    refreshCanvas(); 
}

function wipeProject() {
    if(confirm("Delete save?")) { localStorage.removeItem('vn_project'); location.reload(); }
}

// ==========================================
// 2. EDITOR SYNC
// ==========================================
function loadIntoSidebar(id) {
    activeNodeId = id;
    const node = gameData.nodes.find(n => n.id === id);
    if (!node) return;

    document.getElementById('edit-id').value = node.id;
    document.getElementById('edit-speaker').value = node.speaker || "";
    document.getElementById('edit-text').value = node.text || "";
    document.getElementById('edit-next').value = node.next || "";
    
    // BG & Char inputs mapping...
    document.getElementById('edit-bgUrl').value = node.bgUrl || "";
    document.getElementById('edit-charUrl').value = node.charUrl || "";
    document.getElementById('edit-charPos').value = node.charPos || "pos-center";
    document.getElementById('edit-charGlow').value = node.charGlow || "#ffffff";

    renderChoicesEditor(node.choices || []);
    
    document.querySelectorAll('.node-box').forEach(b => b.classList.remove('active'));
    const activeBox = document.getElementById(`box-${id}`);
    if(activeBox) activeBox.classList.add('active');
}

function autoSave() {
    if (!activeNodeId) return;
    const node = gameData.nodes.find(n => n.id === activeNodeId);
    
    node.id = document.getElementById('edit-id').value;
    activeNodeId = node.id; 
    
    node.speaker = document.getElementById('edit-speaker').value;
    node.text = document.getElementById('edit-text').value;
    node.next = document.getElementById('edit-next').value;
    
    node.bgUrl = document.getElementById('edit-bgUrl').value;
    node.charUrl = document.getElementById('edit-charUrl').value;
    node.charPos = document.getElementById('edit-charPos').value;
    node.charGlow = document.getElementById('edit-charGlow').value;

    const choiceRows = document.querySelectorAll('.choice-edit-row');
    node.choices = [];
    choiceRows.forEach(row => {
        node.choices.push({
            text: row.children[0].value,
            target: row.children[1].value
        });
    });

    saveToLocal();
}

function addNode() {
    const newId = "scene_" + Math.floor(Math.random() * 1000);
    // Create new node slightly offset from current view
    const canvas = document.getElementById('canvas-area');
    gameData.nodes.push({ 
        id: newId, text: "New isolated scene", 
        editorX: canvas.scrollLeft + 100, editorY: canvas.scrollTop + 100, 
        choices: [] 
    });
    saveToLocal();
    loadIntoSidebar(newId);
}

// Choices UI
function renderChoicesEditor(choices) {
    const list = document.getElementById('choices-list');
    list.innerHTML = '';
    choices.forEach((c, index) => {
        list.innerHTML += `<div class="choice-edit-row">
            <input type="text" value="${c.text}" oninput="autoSave()">
            <input type="text" value="${c.target}" oninput="autoSave()" style="width: 80px;">
            <button class="del-btn" onclick="removeChoice(${index})">X</button>
        </div>`;
    });
}
function addChoice() {
    const node = gameData.nodes.find(n => n.id === activeNodeId);
    if(!node.choices) node.choices = [];
    node.choices.push({ text: "Action...", target: "" });
    autoSave();
    renderChoicesEditor(node.choices);
}
function removeChoice(index) {
    gameData.nodes.find(n => n.id === activeNodeId).choices.splice(index, 1);
    autoSave();
}

// ==========================================
// 3. CANVAS DRAGGING & LINE DRAWING
// ==========================================
function refreshCanvas() {
    const container = document.getElementById('node-container');
    container.innerHTML = '';

    gameData.nodes.forEach(node => {
        const box = document.createElement('div');
        box.className = `node-box ${node.id === activeNodeId ? 'active' : ''}`;
        box.id = `box-${node.id}`;
        
        // Position from data
        box.style.left = (node.editorX || 100) + 'px';
        box.style.top = (node.editorY || 100) + 'px';

        // Shortify text
        let shortText = node.text ? node.text.substring(0, 25) + "..." : "";
        
        // Render sub-rectangles
        let linksHTML = "";
        if (node.next && (!node.choices || node.choices.length === 0)) {
            linksHTML = `<div class="sub-next">➡ Next: ${node.next}</div>`;
        } else if (node.choices && node.choices.length > 0) {
            linksHTML = `<div class="node-choices">` + node.choices.map(c => {
                let shortC = c.text.length > 10 ? c.text.substring(0, 10) + '...' : c.text;
                return `<div class="sub-rect"><span>${shortC}</span> <span>[${c.target}]</span></div>`;
            }).join('') + `</div>`;
        }

        box.innerHTML = `
            <div class="node-header" onmousedown="startDrag(event, '${node.id}')">
                <span>≡ ${node.id}</span>
            </div>
            <div class="node-body" onclick="loadIntoSidebar('${node.id}')">"${shortText}"</div>
            ${linksHTML}
        `;
        container.appendChild(box);
    });

    drawLines();
}

// SVG Drawing
function drawLines() {
    const svg = document.getElementById('connection-lines');
    svg.innerHTML = '';

    gameData.nodes.forEach(node => {
        const startBox = document.getElementById(`box-${node.id}`);
        if (!startBox) return;

        // X, Y of the Right side of the box
        const startX = startBox.offsetLeft + startBox.offsetWidth;
        const startY = startBox.offsetTop + (startBox.offsetHeight / 2);

        // Draw Linear Next
        if (node.next && (!node.choices || node.choices.length === 0)) {
            drawLineTo(startX, startY, node.next, svg, "#28a745");
        }
        
        // Draw Choices Wires
        if (node.choices && node.choices.length > 0) {
            node.choices.forEach(c => {
                if(c.target) drawLineTo(startX, startY, c.target, svg, "#007bff");
            });
        }
    });
}

function drawLineTo(startX, startY, targetId, svg, color) {
    const targetBox = document.getElementById(`box-${targetId}`);
    if (!targetBox) return;

    // X, Y of the Left side of the target box
    const endX = targetBox.offsetLeft;
    const endY = targetBox.offsetTop + (targetBox.offsetHeight / 2);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    // Curve magic: C x1 y1, x2 y2, xEnd yEnd
    const curve = Math.abs(endX - startX) * 0.5;
    const d = `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`;
    
    line.setAttribute('d', d);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '3');
    line.setAttribute('fill', 'transparent');
    svg.appendChild(line);
}

// Drag Logic
let isDragging = false;
let currentDragId = null;
let offsetX, offsetY;

function startDrag(e, id) {
    isDragging = true;
    currentDragId = id;
    const box = document.getElementById(`box-${id}`);
    
    // Get mouse offset relative to the box top-left corner
    offsetX = e.clientX - box.getBoundingClientRect().left;
    offsetY = e.clientY - box.getBoundingClientRect().top;
    
    // Highlight
    loadIntoSidebar(id);
}

document.addEventListener('mousemove', (e) => {
    if (!isDragging || !currentDragId) return;
    const box = document.getElementById(`box-${currentDragId}`);
    const canvasPlane = document.getElementById('drag-plane');
    const rect = canvasPlane.getBoundingClientRect();

    // Calculate new position within the giant canvas
    let newX = e.clientX - rect.left - offsetX;
    let newY = e.clientY - rect.top - offsetY;

    box.style.left = newX + "px";
    box.style.top = newY + "px";
    
    // Redraw lines instantly while dragging
    drawLines();
});

document.addEventListener('mouseup', () => {
    if (isDragging && currentDragId) {
        const box = document.getElementById(`box-${currentDragId}`);
        const node = gameData.nodes.find(n => n.id === currentDragId);
        
        // Save the dropped coordinates
        node.editorX = parseInt(box.style.left);
        node.editorY = parseInt(box.style.top);
        
        saveToLocal(); // Auto save position
    }
    isDragging = false;
    currentDragId = null;
});

// ==========================================
// 4. GAME PLAYER LOGIC
// ==========================================
function testGameFromEditor() {
    document.getElementById('node-editor').classList.add('hidden');
    document.getElementById('game-stage').classList.remove('hidden');
    playNode(activeNodeId);
}

function exitGame() {
    document.getElementById('game-stage').classList.add('hidden');
    document.getElementById('node-editor').classList.remove('hidden');
}

function playNode(id) {
    const node = gameData.nodes.find(n => n.id === id);
    if(!node) { alert("End of path!"); exitGame(); return; }

    const bg = document.getElementById('background-layer');
    if (node.bgUrl) bg.style.backgroundImage = `url('${node.bgUrl}')`;

    const charWrapper = document.getElementById('char-container');
    const sprite = document.getElementById('character-sprite');
    const glow = document.getElementById('char-glow');

    if (node.charUrl) {
        sprite.src = node.charUrl;
        charWrapper.className = node.charPos || "pos-center";
        glow.style.background = node.charGlow || "#ffffff";
    }

    document.getElementById('speaker-name').innerText = node.speaker || "";
    document.getElementById('dialogue-text').innerText = node.text || "";

    const choicesBox = document.getElementById('choices-container');
    choicesBox.innerHTML = '';
    
    if (node.choices && node.choices.length > 0) {
        node.choices.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerText = c.text;
            btn.onclick = () => playNode(c.target);
            choicesBox.appendChild(btn);
        });
    } else if (node.next) {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = "Next...";
        btn.onclick = () => playNode(node.next);
        choicesBox.appendChild(btn);
    }
}

function exportGame() {
    const blob = new Blob([JSON.stringify(gameData, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "harmony_project.json";
    link.click();
}
