let gameData = { nodes: [] };
let activeNodeId = null;

// ==========================================
// 1. INIT & AUTO-SAVE LOGIC
// ==========================================
function initEditor(mode) {
    if (mode === 'load' && localStorage.getItem('vn_project')) {
        gameData = JSON.parse(localStorage.getItem('vn_project'));
    } else if (mode === 'new') {
        gameData = {
            nodes: [{
                id: "start", speaker: "System", text: "New node created. Start typing!",
                bgUrl: "", bgScale: 100, bgX: 50, bgY: 50,
                charUrl: "", charPos: "pos-center", charAnim: "fade-in-up", charGlow: "#ffffff",
                choices: []
            }]
        };
        saveToLocal();
    } else {
        alert("No save found! Starting new archive.");
        initEditor('new');
        return;
    }

    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('node-editor').classList.remove('hidden');
    refreshCanvas();
    loadIntoSidebar(gameData.nodes[0].id);
}

function saveToLocal() {
    localStorage.setItem('vn_project', JSON.stringify(gameData));
    refreshCanvas(); // Update visual boxes
}

function wipeProject() {
    if(confirm("Are you sure? This deletes your browser save entirely.")) {
        localStorage.removeItem('vn_project');
        location.reload();
    }
}

// ==========================================
// 2. EDITOR SYNC (The "Auto-Save" Engine)
// ==========================================
function loadIntoSidebar(id) {
    activeNodeId = id;
    const node = gameData.nodes.find(n => n.id === id);
    if (!node) return;

    document.getElementById('edit-id').value = node.id;
    document.getElementById('edit-speaker').value = node.speaker || "";
    document.getElementById('edit-text').value = node.text || "";
    
    document.getElementById('edit-bgUrl').value = node.bgUrl || "";
    document.getElementById('edit-bgScale').value = node.bgScale || 100;
    document.getElementById('edit-bgX').value = node.bgX || 50;
    document.getElementById('edit-bgY').value = node.bgY || 50;
    
    document.getElementById('edit-charUrl').value = node.charUrl || "";
    document.getElementById('edit-charPos').value = node.charPos || "pos-center";
    document.getElementById('edit-charAnim').value = node.charAnim || "fade-in-up";
    document.getElementById('edit-charGlow').value = node.charGlow || "#ffffff";

    renderChoicesEditor(node.choices || []);
    
    // Highlight active box
    document.querySelectorAll('.node-box').forEach(b => b.classList.remove('active'));
    document.getElementById(`box-${id}`).classList.add('active');
}

// Fired every time you type a letter in the sidebar
function autoSave() {
    if (!activeNodeId) return;
    const node = gameData.nodes.find(n => n.id === activeNodeId);
    
    const newId = document.getElementById('edit-id').value;
    if (newId !== activeNodeId && !gameData.nodes.find(n => n.id === newId)) {
        node.id = newId;
        activeNodeId = newId;
    }

    node.speaker = document.getElementById('edit-speaker').value;
    node.text = document.getElementById('edit-text').value;
    
    node.bgUrl = document.getElementById('edit-bgUrl').value;
    node.bgScale = document.getElementById('edit-bgScale').value;
    node.bgX = document.getElementById('edit-bgX').value;
    node.bgY = document.getElementById('edit-bgY').value;
    
    node.charUrl = document.getElementById('edit-charUrl').value;
    node.charPos = document.getElementById('edit-charPos').value;
    node.charAnim = document.getElementById('edit-charAnim').value;
    node.charGlow = document.getElementById('edit-charGlow').value;

    document.getElementById('bg-scale-val').innerText = node.bgScale;

    // Gather choices
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

// ==========================================
// 3. CANVAS (Sub-rectangles for choices)
// ==========================================
function refreshCanvas() {
    const container = document.getElementById('node-container');
    container.innerHTML = '';

    gameData.nodes.forEach(node => {
        const box = document.createElement('div');
        box.className = `node-box ${node.id === activeNodeId ? 'active' : ''}`;
        box.id = `box-${node.id}`;
        box.onclick = () => loadIntoSidebar(node.id);
        
        let choicesHTML = (node.choices || []).map(c => `<div class="sub-rect">↳ ${c.text} ➡ [${c.target}]</div>`).join('');

        box.innerHTML = `
            <div class="node-header">${node.id}</div>
            <div class="node-body">"${node.text ? node.text.substring(0, 40) : ''}..."</div>
            ${choicesHTML ? `<div class="node-choices">${choicesHTML}</div>` : ''}
        `;
        container.appendChild(box);
    });
}

function addNode() {
    const newId = "scene_" + Math.floor(Math.random() * 1000);
    gameData.nodes.push({ id: newId, text: "New node...", choices: [] });
    saveToLocal();
    loadIntoSidebar(newId);
}

function addChoice() {
    const node = gameData.nodes.find(n => n.id === activeNodeId);
    if(!node.choices) node.choices = [];
    node.choices.push({ text: "New Choice", target: "target_id" });
    renderChoicesEditor(node.choices);
    autoSave();
}

function renderChoicesEditor(choices) {
    const list = document.getElementById('choices-list');
    list.innerHTML = '';
    choices.forEach((c, index) => {
        const row = document.createElement('div');
        row.className = 'choice-edit-row';
        row.innerHTML = `
            <input type="text" value="${c.text}" placeholder="Choice Text" oninput="autoSave()">
            <input type="text" value="${c.target}" placeholder="Target Node ID" oninput="autoSave()">
            <button class="del-btn" onclick="removeChoice(${index})">X</button>
        `;
        list.appendChild(row);
    });
}

function removeChoice(index) {
    const node = gameData.nodes.find(n => n.id === activeNodeId);
    node.choices.splice(index, 1);
    renderChoicesEditor(node.choices);
    autoSave();
}

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

    // Setup Background (Scale and Position)
    const bg = document.getElementById('background-layer');
    if (node.bgUrl) {
        bg.style.backgroundImage = `url('${node.bgUrl}')`;
        bg.style.backgroundSize = `${node.bgScale || 100}%`;
        bg.style.backgroundPosition = `${node.bgX || 50}% ${node.bgY || 50}%`;
    }

    // Setup Character & Glow
    const charWrapper = document.getElementById('char-container');
    const sprite = document.getElementById('character-sprite');
    const glow = document.getElementById('char-glow');

    if (node.charUrl) {
        sprite.src = node.charUrl;
        charWrapper.className = node.charPos || "pos-center";
        glow.style.background = node.charGlow || "#ffffff";
        
        sprite.style.animation = 'none';
        void sprite.offsetWidth; // Trigger reflow
        sprite.className = node.charAnim || "fade-in-up";
    } else {
        sprite.src = "";
        glow.style.background = "transparent";
    }

    // Setup Text
    document.getElementById('speaker-name').innerText = node.speaker || "";
    document.getElementById('dialogue-text').innerText = node.text || "";

    // Setup Choices
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
    } else {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = "Next...";
        // If no choices, attempt to just find the next node in the array (fallback)
        const currIndex = gameData.nodes.indexOf(node);
        if(currIndex < gameData.nodes.length - 1) {
            btn.onclick = () => playNode(gameData.nodes[currIndex + 1].id);
            choicesBox.appendChild(btn);
        }
    }
}

// Download JSON Data
function exportGame() {
    const blob = new Blob([JSON.stringify(gameData, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "harmony_project.json";
    link.click();
        }
