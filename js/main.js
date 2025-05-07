document.addEventListener('DOMContentLoaded', () => {
    // Preloader Animation
    const progressBar = document.getElementById('progress-bar');
    let progress = 0;
    const interval = setInterval(() => {
        progress += 1;
        progressBar.style.width = `${progress}%`;
        if (progress >= 100) {
            clearInterval(interval);
            gsap.to('#preloader', { opacity: 0, duration: 1, onComplete: () => {
                document.getElementById('preloader').style.display = 'none';
            }});
        }
    }, 20);

    // 3D Background with Three.js
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('background-3d').appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    camera.position.z = 10;

    const animateBackground = () => {
        requestAnimationFrame(animateBackground);
        sphere.rotation.x += 0.005;
        sphere.rotation.y += 0.005;
        renderer.render(scene, camera);
    };
    animateBackground();

    // Window Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // GSAP Animations
    const tl = gsap.timeline();
    tl.from('#logo', { opacity: 0, scale: 0.5, rotationX: 360, duration: 2, ease: 'power2.out', delay: 2 })
      .from('#hero p', { opacity: 0, y: 50, duration: 1, ease: 'power2.out' }, '-=1')
      .from('#navbar', { y: -100, duration: 1, ease: 'power2.out' }, '-=0.5');

    // Animated Stats Counter
    document.querySelectorAll('.counter').forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        gsap.to(counter, {
            innerText: target,
            duration: 2,
            snap: { innerText: 1 },
            ease: 'power1.out',
            delay: 3,
            onUpdate: function() {
                counter.innerText = Math.ceil(counter.innerText) + (counter.innerText.includes('%') ? '%' : '');
            }
        });
    });

    // The Odds API settings
    const ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/{sport}/odds';
    const TODAY = '2025-05-06';
    const TOMORROW = '2025-05-07';

    // Function to format game time
    function formatGameTime(commenceTime) {
        const date = new Date(commenceTime);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'America/Halifax' });
    }

    // Function to create a countdown timer
    function startCountdown(commenceTime, elementId) {
        const gameTime = new Date(commenceTime).getTime();
        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = gameTime - now;

            if (distance < 0) {
                document.getElementById(elementId).innerHTML = 'Game Started';
                return;
            }

            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            document.getElementById(elementId).innerHTML = `${hours}h ${minutes}m ${seconds}s`;
        };
        updateTimer();
        setInterval(updateTimer, 1000);
    }

    // Fetch and display predictions
    async function fetchPredictions(sport, containerId, loadingId, errorId) {
        const url = ODDS_API_URL.replace('{sport}', sport);
        const params = new URLSearchParams({
            apiKey: ODDS_API_KEY,
            regions: 'us',
            markets: 'h2h',
            oddsFormat: 'decimal',
            dateFormat: 'iso'
        });

        try {
            const response = await fetch(`${url}?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const games = await response.json();

            // Filter games for May 6, 2025
            const filteredGames = games.filter(game => {
                const gameTime = new Date(game.commence_time);
                return gameTime >= new Date(TODAY) && gameTime < new Date(TOMORROW);
            });

            const predictionsDiv = document.getElementById(containerId);
            const loadingDiv = document.getElementById(loadingId);
            const errorDiv = document.getElementById(errorId);

            gsap.to(loadingDiv, { opacity: 0, duration: 0.5, onComplete: () => {
                loadingDiv.style.display = 'none';
            }});

            if (filteredGames.length === 0) {
                errorDiv.textContent = `No ${sport === 'basketball_nba' ? 'NBA' : 'MLB'} games scheduled for today.`;
                errorDiv.classList.remove('hidden');
                return;
            }

            // Clear previous predictions to avoid duplicates
            predictionsDiv.innerHTML = '';

            filteredGames.forEach((game, index) => {
                const odds = game.bookmakers[0]?.markets[0]?.outcomes;
                if (!odds) return;

                const homeTeam = odds.find(o => o.name === game.home_team)?.name || game.home_team;
                const awayTeam = odds.find(o => o.name === game.away_team)?.name || game.away_team;
                const homeOdds = odds.find(o => o.name === game.home_team)?.price || 2.0;
                const awayOdds = odds.find(o => o.name === game.away_team)?.price || 2.0;

                // Calculate probabilities from odds
                const homeProb = 1 / homeOdds / (1 / homeOdds + 1 / awayOdds);
                const awayProb = 1 - homeProb;
                const confidence = Math.max(homeProb, awayProb) * (0.8 + Math.random() * 0.1);

                // Game time and countdown timer
                const gameTime = formatGameTime(game.commence_time);
                const timerId = `timer-${sport}-${index}`;

                const card = document.createElement('div');
                card.className = 'card';
                card.setAttribute('data-tilt', '');
                card.innerHTML = `
                    <div class="text-center">
                        <h3 class="text-xl font-exo text-cyan-400 mb-4">${homeTeam} vs ${awayTeam}</h3>
                        <p class="font-exo text-purple-300 mb-2">Game Time: ${gameTime}</p>
                        <p class="font-exo text-cyan-400 mb-4 animate-pulse" id="${timerId}"></p>
                        <div class="mb-2">
                            <p class="font-exo text-purple-300">${homeTeam}: ${(homeProb * 100).toFixed(1)}%</p>
                            <div class="prob-bar"><div class="prob-fill" style="width: ${(homeProb * 100).toFixed(1)}%"></div></div>
                        </div>
                        <div class="mb-2">
                            <p class="font-exo text-purple-300">${awayTeam}: ${(awayProb * 100).toFixed(1)}%</p>
                            <div class="prob-bar"><div class="prob-fill" style="width: ${(awayProb * 100).toFixed(1)}%"></div></div>
                        </div>
                        <p class="font-exo text-gray-400 text-sm">Confidence: ${(confidence * 100).toFixed(1)}%</p>
                    </div>
                `;
                predictionsDiv.appendChild(card);

                // Start countdown timer
                startCountdown(game.commence_time, timerId);

                // Initialize Tilt.js
                VanillaTilt.init(card, {
                    max: 25,
                    speed: 400,
                    glare: true,
                    'max-glare': 0.5
                });

                // Animate card
                gsap.from(card, {
                    opacity: 0,
                    y: 100,
                    rotationX: 90,
                    duration: 1.5,
                    ease: 'power2.out',
                    delay: index * 0.4
                });
            });
        } catch (error) {
            console.error(`Error fetching ${sport} predictions:`, error);
            const loadingDiv = document.getElementById(loadingId);
            const errorDiv = document.getElementById(errorId);
            gsap.to(loadingDiv, { opacity: 0, duration: 0.5, onComplete: () => {
                loadingDiv.style.display = 'none';
            }});
            errorDiv.textContent = `Failed to load ${sport === 'basketball_nba' ? 'NBA' : 'MLB'} predictions.`;
            errorDiv.classList.remove('hidden');
        }
    }

    // Fetch NBA and MLB predictions
    fetchPredictions('basketball_nba', 'nba-predictions', 'nba-loading', 'nba-error');
    fetchPredictions('baseball_mlb', 'mlb-predictions', 'mlb-loading', 'mlb-error');
});