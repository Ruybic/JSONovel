let gameData = { title: "New Game", nodes: [] };
let currentNode = null;

// Grab DOM Elements
const mainMenu = document.getElementById('main-menu');
const gameStage = document.getElementById('game-stage');
const nodeEditor = document.getElementById('node-editor');
const fileUpload = document.getElementById('game-upload');

const bgLayer = document.getElementById('background-layer');
const charSprite = document.getElementById('character-sprite');
const speakerName = document.getElementById('speaker-name');
const dialogueText = document.getElementById('dialogue-text');
const choicesContainer = document.getElementById('choices-container');
const bgmPlayer = document.getElementById('bgm-player');

// ==========================================
// 1. UPLOAD & PLAY LOGIC
// ==========================================
fileUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            gameData = JSON.parse(e.target.result);
            startGame();
        } catch (error) {
            alert("Oops! That JSON file is invalid.");
        }
    };
    reader.readAsText(file);
});

function startGame() {
    mainMenu.classList.add('hidden');
    nodeEditor.classList.add('hidden');
    gameStage.classList.remove('hidden');
    
    // Find the 'start' node or default to the first one in the array
    const startNode = gameData.nodes.find(n => n.id === "start") || gameData.nodes[0];
    if(startNode) renderNode(startNode);
    else alert("No nodes found in this game data!");
}

function renderNode(node) {
    currentNode = node;

    if (node.background) bgLayer.style.backgroundImage = `url('${node.background}')`;
    
    if (node.audio && bgmPlayer.src !== node.audio) {
        bgmPlayer.src = node.audio;
        bgmPlayer.play().catch(e => console.log("Auto-play blocked by browser"));
    }

    if (node.character) {
        charSprite.src = node.character;
        charSprite.className = ''; 
        if (node.animation) charSprite.classList.add(node.animation);
        void charSprite.offsetWidth; // Force CSS reflow to restart animation
        charSprite.classList.add('sprite-active');
    } else {
        charSprite.className = ''; 
        charSprite.src = '';
    }

    speakerName.innerText = node.speaker || "";
    speakerName.style.display = node.speaker ? "block" : "none";
    dialogueText.innerText = node.text || "";

    choicesContainer.innerHTML = '';
    
    if (node.choices && node.choices.length > 0) {
        node.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerText = choice.text;
            btn.onclick = () => jumpToNode(choice.target);
            choicesContainer.appendChild(btn);
        });
    } else if (node.next) {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = "Continue...";
        btn.onclick = () => jumpToNode(node.next);
        choicesContainer.appendChild(btn);
    }
}

function jumpToNode(targetId) {
    const nextNode = gameData.nodes.find(n => n.id === targetId);
    if (nextNode) {
        renderNode(nextNode);
    } else {
        alert("End of the game path!");
        location.reload(); 
    }
}

// ==========================================
// 2. NODE EDITOR LOGIC
// ==========================================
function createNewGame() {
    gameData = {
        title: "New Project",
        nodes: [{
            id: "start", speaker: "System", text: "Welcome to your new game. Edit me!",
            background: "", character: "", animation: "fade-in-up", next: null, choices: []
        }]
    };
    mainMenu.classList.add('hidden');
    nodeEditor.classList.remove('hidden');
    refreshNodeMap();
}

function refreshNodeMap() {
    const container = document.getElementById('node-container');
    container.innerHTML = '';

    gameData.nodes.forEach(node => {
        const box = document.createElement('div');
        box.className = 'node-box';
        // Display a preview of the node
        box.innerHTML = `<strong>${node.id}</strong><small>${node.text ? node.text.substring(0, 30) : ''}...</small>`;
        box.onclick = () => loadNodeIntoEditor(node.id);
        container.appendChild(box);
    });
}

function loadNodeIntoEditor(id) {
    const node = gameData.nodes.find(n => n.id === id);
    if(!node) return;
    
    document.getElementById('edit-id').value = node.id || "";
    document.getElementById('edit-speaker').value = node.speaker || "";
    document.getElementById('edit-text').value = node.text || "";
    document.getElementById('edit-bg').value = node.background || "";
    document.getElementById('edit-char').value = node.character || "";
    document.getElementById('edit-anim').value = node.animation || "fade-in-left";
    
    // Store the ID we are currently editing
    document.getElementById('editor-sidebar').dataset.editingId = id;
}

function saveNodeEdits() {
    const originalId = document.getElementById('editor-sidebar').dataset.editingId;
    const node = gameData.nodes.find(n => n.id === originalId);
    if(!node) { alert("Click on a box first to edit it!"); return; }

    // Update data
    node.id = document.getElementById('edit-id').value;
    node.speaker = document.getElementById('edit-speaker').value;
    node.text = document.getElementById('edit-text').value;
    node.background = document.getElementById('edit-bg').value;
    node.character = document.getElementById('edit-char').value;
    node.animation = document.getElementById('edit-anim').value;

    refreshNodeMap();
}

function addNode() {
    const newId = "scene_" + Math.floor(Math.random() * 1000);
    gameData.nodes.push({
        id: newId, speaker: "New Character", text: "New dialogue...",
        background: "", character: "", animation: "fade-in-left", next: null, choices: []
    });
    refreshNodeMap();
    loadNodeIntoEditor(newId); // Open it immediately
}

function testGameFromEditor() {
    startGame();
}

function exportGame() {
    const dataStr = JSON.stringify(gameData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my_game_cartridge.json";
    link.click();
}
