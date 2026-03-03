let gameData = {};
let currentNode = null;

// Grab our HTML elements
const mainMenu = document.getElementById('main-menu');
const gameStage = document.getElementById('game-stage');
const fileUpload = document.getElementById('game-upload');
const bgLayer = document.getElementById('background-layer');
const charSprite = document.getElementById('character-sprite');
const speakerName = document.getElementById('speaker-name');
const dialogueText = document.getElementById('dialogue-text');
const choicesContainer = document.getElementById('choices-container');
const bgmPlayer = document.getElementById('bgm-player');

// 1. Listen for the user uploading a JSON file
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
            console.error(error);
        }
    };
    reader.readAsText(file);
});

// 2. Hide menu and start the first scene
function startGame() {
    mainMenu.classList.add('hidden');
    gameStage.classList.remove('hidden');
    
    // Find the node labeled "start", or just grab the first one
    const startNode = gameData.nodes.find(n => n.id === "start") || gameData.nodes[0];
    renderNode(startNode);
}

// 3. Render the specific "Box/Node" on screen
function renderNode(node) {
    currentNode = node;

    // Update Background
    if (node.background) {
        bgLayer.style.backgroundImage = `url('${node.background}')`;
    }

    // Update Audio (Only restart if it's a new song)
    if (node.audio) {
        if (bgmPlayer.src !== node.audio) {
            bgmPlayer.src = node.audio;
            bgmPlayer.play().catch(e => console.log("Browser blocked auto-play"));
        }
    }

    // Update Character & Animation
    if (node.character) {
        charSprite.src = node.character;
        charSprite.className = ''; // Clear old animations
        
        // Add starting animation position (e.g., 'fade-in-left')
        if (node.animation) charSprite.classList.add(node.animation);
        
        // Trick the browser into restarting the CSS animation
        void charSprite.offsetWidth; 
        
        // Slide them into place
        charSprite.classList.add('sprite-active');
    } else {
        charSprite.className = ''; 
        charSprite.src = '';
    }

    // Update Text
    speakerName.innerText = node.speaker || "";
    speakerName.style.display = node.speaker ? "block" : "none";
    dialogueText.innerText = node.text || "";

    // Generate Choices / Buttons
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
        // If there are no choices, just a "Continue" button
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = "Continue...";
        btn.onclick = () => jumpToNode(node.next);
        choicesContainer.appendChild(btn);
    }
}

// 4. Helper to find and jump to the next scene
function jumpToNode(targetId) {
    const nextNode = gameData.nodes.find(n => n.id === targetId);
    if (nextNode) {
        renderNode(nextNode);
    } else {
        alert("End of the game!");
        location.reload(); // Send back to main menu
    }
}
