document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const loveCounter = document.getElementById('love-counter');
    const status = document.getElementById('status');
    const house = document.getElementById('house');
    const restartBtn = document.getElementById('restart');

    // Game state
    let love = 0;
    let gameState = 'playing'; // playing, house
    let allPicked = false;

    // Player
    const player = {
        x: 400,
        y: 450,
        width: 80,
        height: 80,
        speed: 5,
        color: '#FFD700'
    };

    // Plots
    const plots = [];
    const plotSize = 70;
    const plotSpacing = 90;
    const startX = 35;
    const startY = 50;

    for (let i = 0; i < 8; i++) {
        let randomX, randomY, overlapping;
        do {
            overlapping = false;
            randomX = Math.random() * (canvas.width - plotSize - 20) + 10;
            randomY = Math.random() * (canvas.height * 0.35 - plotSize - 20) + (canvas.height * 0.6) + 10;
            
            // Check for overlaps with existing plots
            for (let j = 0; j < plots.length; j++) {
                const plot = plots[j];
                if (!(randomX + plotSize + 20 < plot.x || 
                      randomX > plot.x + plotSize + 20 || 
                      randomY + plotSize + 20 < plot.y || 
                      randomY > plot.y + plotSize + 20)) {
                    overlapping = true;
                    break;
                }
            }
        } while (overlapping);
        
        plots.push({
            x: randomX,
            y: randomY,
            state: 'empty' // empty, planted, grown, picked
        });
    }

    // Door
    const door = {
        x: 400,
        y: 380,
        width: 80,
        height: 120,
        visible: false
    };

    // Images
    const playerImg = new Image();
    playerImg.src = './pixelmom.png';
    const houseImg = new Image();
    houseImg.src = './pink-house.png';
    const roseImg = new Image();
    roseImg.src = './rose.png';
    const dirtImg = new Image();
    dirtImg.src = './dirt.png';
    const skyImg = new Image();
    skyImg.src = './sky.png';
    const grassImg = new Image();
    grassImg.src = './grass.png';

    let playerImgProcessed = null;
    let houseImgProcessed = null;
    let roseImgProcessed = null;
    let dirtImgLoaded = false;
    let skyImgLoaded = false;
    let grassImgLoaded = false;

    function createTransparentCanvas(image) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.width;
        tempCanvas.height = image.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(image, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            const isWhiteBackground = a > 0 && r > 240 && g > 240 && b > 240 && Math.max(r, g, b) - Math.min(r, g, b) < 20;
            if (isWhiteBackground) {
                data[i + 3] = 0;
            }
        }
        tempCtx.putImageData(imageData, 0, 0);
        return tempCanvas;
    }

    playerImg.onload = () => { playerImgProcessed = createTransparentCanvas(playerImg); };
    houseImg.onload = () => { houseImgProcessed = createTransparentCanvas(houseImg); };
    roseImg.onload = () => { roseImgProcessed = createTransparentCanvas(roseImg); };
    dirtImg.onload = () => { dirtImgLoaded = true; };
    skyImg.onload = () => { skyImgLoaded = true; };
    grassImg.onload = () => { grassImgLoaded = true; };

    // Input
    const keys = {};
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Space') {
            e.preventDefault();
            interact();
        }
    });
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    restartBtn.addEventListener('click', restart);

    function update() {
        if (gameState !== 'playing') return;

        // Movement
        if (keys['ArrowUp'] && player.y > 0) player.y -= player.speed;
        if (keys['ArrowDown'] && player.y < canvas.height - player.height) player.y += player.speed;
        if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
        if (keys['ArrowRight'] && player.x < canvas.width - player.width) player.x += player.speed;

        // Check if all picked
        const pickedCount = plots.filter(p => p.state === 'picked').length;
        allPicked = pickedCount === 8;
        if (pickedCount === 8 && !door.visible) {
            door.visible = true;
            status.textContent = 'A magical door has appeared! Walk to it and press SPACE to enter.';
        }
    }

    function draw() {
        // Draw sky
        if (skyImgLoaded && skyImg.width > 0) {
            const skyPattern = ctx.createPattern(skyImg, 'repeat');
            ctx.fillStyle = skyPattern;
            ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
            gradient.addColorStop(0, '#87CEEB'); // Sky blue
            gradient.addColorStop(1, '#b0d4e3');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);
        }

        // Draw ground
        if (grassImgLoaded && grassImg.width > 0) {
            const grassPattern = ctx.createPattern(grassImg, 'repeat');
            ctx.fillStyle = grassPattern;
            ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
        } else {
            const groundGradient = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
            groundGradient.addColorStop(0, '#b3e5b3');
            groundGradient.addColorStop(1, '#8dc68d');
            ctx.fillStyle = groundGradient;
            ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
        }

        // Draw plots
        plots.forEach(plot => {
            // Draw soil
            if (dirtImgLoaded && dirtImg.width > 0) {
                // Use dirt texture
                const pattern = ctx.createPattern(dirtImg, 'repeat');
                ctx.fillStyle = pattern;
                ctx.fillRect(plot.x, plot.y, plotSize, plotSize);
            } else {
                // Fallback to solid brown
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(plot.x, plot.y, plotSize, plotSize);
            }
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 2;
            ctx.strokeRect(plot.x, plot.y, plotSize, plotSize);
            
            if (plot.state === 'planted') {
                // Draw seedling
                ctx.fillStyle = '#228B22';
                ctx.fillRect(plot.x + plotSize/2 - 2, plot.y + plotSize/2 - 10, 4, 10);
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(plot.x + plotSize/2 - 1, plot.y + plotSize/2 - 12, 2, 2);
            } else if (plot.state === 'grown') {
                    const source = roseImgProcessed || roseImg;
                if (source.width > 0 && source.height > 0) {
                    const maxSize = plotSize * 0.9;
                    const scale = Math.min(maxSize / source.width, maxSize / source.height);
                    const w = source.width * scale;
                    const h = source.height * scale;
                    ctx.drawImage(source, plot.x + plotSize/2 - w/2, plot.y + plotSize/2 - h/2, w, h);
                } else {
                    // Draw rose fallback
                    drawRose(plot.x + plotSize/2, plot.y + plotSize/2);
                }
            } else if (plot.state === 'picked') {
                drawHeart(plot.x + plotSize/2, plot.y + plotSize/2, 8, '#FF69B4');
            }
        });

        // Draw door
        if (door.visible) {
            const sourceHouse = houseImgProcessed || houseImg;
            if (sourceHouse.width > 0 && sourceHouse.height > 0) {
                const maxWidth = 260;
                const maxHeight = 180;
                const scale = Math.min(maxWidth / sourceHouse.width, maxHeight / sourceHouse.height);
                const w = sourceHouse.width * scale;
                const h = sourceHouse.height * scale;
                ctx.drawImage(sourceHouse, door.x - (w - door.width) / 2, door.y - (h - door.height), w, h);
            } else {
                // Draw house frame fallback
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(door.x - 10, door.y - 20, door.width + 20, door.height + 40);
                ctx.fillStyle = '#FF69B4';
                ctx.fillRect(door.x - 5, door.y - 15, door.width + 10, door.height + 30);
                // Door
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(door.x, door.y, door.width, door.height);
                ctx.fillStyle = '#FF1493';
                ctx.fillRect(door.x + 5, door.y + 5, door.width - 10, door.height - 10);
                // Knob
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(door.x + door.width - 10, door.y + door.height/2, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw player
        drawCharacter(player.x, player.y);
    }

    function drawRose(x, y) {
        // Stem
        ctx.strokeStyle = '#228B22';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - 25);
        ctx.stroke();
        
        // Leaves
        ctx.fillStyle = '#32CD32';
        ctx.beginPath();
        ctx.ellipse(x - 5, y - 10, 8, 4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 5, y - 15, 8, 4, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Petals
        ctx.fillStyle = '#FF1493';
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const px = x + Math.cos(angle) * 10;
            const py = y - 25 + Math.sin(angle) * 10;
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Inner petals
        ctx.fillStyle = '#FF69B4';
        for (let i = 0; i < 3; i++) {
            const angle = (i * Math.PI * 2) / 3 + Math.PI / 6;
            const px = x + Math.cos(angle) * 5;
            const py = y - 25 + Math.sin(angle) * 5;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Center
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc(x, y - 25, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawHeart(x, y, size, color) {
        const top = y - size / 3;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + size / 2, y - size / 2, x + size, y + size / 3, x, y + size);
        ctx.bezierCurveTo(x - size, y + size / 3, x - size / 2, y - size / 2, x, y);
        ctx.fill();
    }

    function drawHarvestedBackground() {
        ctx.fillStyle = '#9ddf9d';
        ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
        ctx.fillStyle = '#8ace8a';
        for (let y = canvas.height / 2; y < canvas.height; y += 24) {
            for (let x = 0; x < canvas.width; x += 24) {
                ctx.fillRect(x + 4, y + 4, 12, 8);
            }
        }
        ctx.fillStyle = '#ffb6c1';
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height / 2 + 40);
        ctx.bezierCurveTo(canvas.width / 2 + 80, canvas.height / 2 - 20, canvas.width / 2 + 140, canvas.height / 2 + 80, canvas.width / 2, canvas.height / 2 + 140);
        ctx.bezierCurveTo(canvas.width / 2 - 140, canvas.height / 2 + 80, canvas.width / 2 - 80, canvas.height / 2 - 20, canvas.width / 2, canvas.height / 2 + 40);
        ctx.fill();
    }

    function drawCharacter(x, y) {
        const sourcePlayer = playerImgProcessed || playerImg;
        if (sourcePlayer.width > 0 && sourcePlayer.height > 0) {
            const maxWidth = 60;
            const maxHeight = 120;
            const scale = Math.min(maxWidth / sourcePlayer.width, maxHeight / sourcePlayer.height);
            const w = sourcePlayer.width * scale;
            const h = sourcePlayer.height * scale;
            ctx.drawImage(sourcePlayer, x + player.width / 2 - w / 2, y + player.height - h, w, h);
            return;
        }

        // Fallback character drawing
        // Body
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x + 5, y + 10, 10, 15);
        
        // Head
        ctx.fillStyle = '#FFDBAC';
        ctx.beginPath();
        ctx.arc(x + 10, y + 5, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + 8, y + 3, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 12, y + 3, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Smile
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + 10, y + 6, 3, 0, Math.PI);
        ctx.stroke();
        
        // Arms
        ctx.strokeStyle = '#FFDBAC';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 15);
        ctx.lineTo(x, y + 20);
        ctx.moveTo(x + 15, y + 15);
        ctx.lineTo(x + 20, y + 20);
        ctx.stroke();
        
        // Legs
        ctx.strokeStyle = '#000080';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 7, y + 25);
        ctx.lineTo(x + 5, y + 35);
        ctx.moveTo(x + 13, y + 25);
        ctx.lineTo(x + 15, y + 35);
        ctx.stroke();
    }

    function interact() {
        if (gameState !== 'playing') return;

        // Check plots
        plots.forEach(plot => {
            if (Math.abs(player.x + player.width/2 - (plot.x + plotSize/2)) < 30 &&
                Math.abs(player.y + player.height/2 - (plot.y + plotSize/2)) < 30) {
                if (plot.state === 'empty') {
                    plot.state = 'grown'; // Immediate growth for simplicity
                    status.textContent = 'You planted a rose! It grew instantly.';
                } else if (plot.state === 'grown') {
                    plot.state = 'picked';
                    love++;
                    loveCounter.textContent = `Love received: ${love}`;
                    status.textContent = 'You picked a rose and received love!';
                }
            }
        });

        // Check door
        if (door.visible &&
            Math.abs(player.x + player.width/2 - (door.x + door.width/2)) < 40 &&
            Math.abs(player.y + player.height/2 - (door.y + door.height/2)) < 60) {
            enterHouse();
        }
    }

    function enterHouse() {
        gameState = 'house';
        house.style.display = 'block';
        canvas.style.display = 'none';
        document.getElementById('ui').style.display = 'none';
        document.getElementById('instructions').style.display = 'none';
    }

    function restart() {
        love = 0;
        loveCounter.textContent = 'Love received: 0';
        status.textContent = 'Plant some roses to start!';
        gameState = 'playing';
        player.x = 400;
        player.y = 300;
        plots.forEach(plot => plot.state = 'empty');
        door.visible = false;
        house.style.display = 'none';
        canvas.style.display = 'block';
        document.getElementById('ui').style.display = 'block';
        document.getElementById('instructions').style.display = 'block';
    }

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    gameLoop();
});