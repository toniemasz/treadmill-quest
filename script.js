const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

/**
 * INICJALIZACJA APLIKACJI
 */
async function init() {
    try {
        console.log("Ładowanie Twojej przygody...");
        const [workoutsRes, milestonesRes] = await Promise.all([
            supabaseClient.from('workouts').select('distance'),
            supabaseClient.from('milestones').select('*').order('target_distance', { ascending: true })
        ]);

        if (workoutsRes.error) throw workoutsRes.error;
        if (milestonesRes.error) throw milestonesRes.error;

        const totalKm = workoutsRes.data.reduce((sum, w) => sum + (w.distance || 0), 0);
        const allMilestones = milestonesRes.data || [];

        renderPath(allMilestones, totalKm);
        
        updateUI(totalKm, allMilestones);
        updateRecentLocations(totalKm)
    } catch (err) {
        console.error("Błąd krytyczny:", err.message);
        const container = document.getElementById('milestones-container');
        if (container) container.innerHTML = `<p class="text-red-500 text-center p-4">Błąd bazy: ${err.message}</p>`;
    }
}

/**
 * AKTUALIZACJA GÓRNEGO PANELU I RANGI
 */
function updateUI(total, allMilestones) {
    const totalKmEl = document.getElementById('total-km');
    if (totalKmEl) totalKmEl.innerText = total.toFixed(1);

    if (allMilestones.length > 0) {
        const finalGoal = allMilestones[allMilestones.length - 1].target_distance;
        const goalText = document.getElementById('final-goal-text');
        if (goalText) goalText.innerText = `${finalGoal} km`;

        // Poziomy pasek postępu (całościowy)
        const totalPercent = Math.min((total / finalGoal) * 100, 100);
        const mainBar = document.getElementById('main-progress-bar');
        if (mainBar) mainBar.style.width = `${totalPercent}%`;

        // Logika rang
        const rankEl = document.getElementById('current-rank');
        if (rankEl) {
            if (total < 50) rankEl.innerText = "REKRUT BIEŻNI 👟";
            else if (total < 100) rankEl.innerText = "ZAAWANSOWANY BIEGACZ 🏃";
            else if (total < 180) rankEl.innerText = "WETERAN TRASY 🧗";
            else rankEl.innerText = "LEGENDA DYSTANSU 👑";
        }
    }
}

/**
 * RENDEROWANIE ŚCIEŻKI (START -> STOS -> OKNO WIDOKU)
 */
function renderPath(allMilestones, total) {
    const container = document.getElementById('milestones-container');
    if (!container) return;
    container.innerHTML = '';

    const startNode = { target_distance: 0, name: "START PRZYGODY" };

    // Szukamy indeksu aktualnego celu
    let currentIndex = allMilestones.findIndex(m => total < m.target_distance);
    if (currentIndex === -1) currentIndex = allMilestones.length;

    // Okno widoku: 3 wstecz, 4 naprzód
    const windowStart = Math.max(0, currentIndex - 2);
    const windowEnd = Math.min(allMilestones.length, currentIndex + 4);
    const visibleMilestones = allMilestones.slice(windowStart, windowEnd);

    // 1. Renderujemy węzeł START (Zawsze zdobyty)
    renderSingleNode(container, startNode, true, false, "🚩");

    // 2. Renderujemy STOS (jeśli są milestony przed oknem widoku)
    const hiddenCount = windowStart;
    if (hiddenCount > 0) {
        renderStackedNode(container, hiddenCount);
    }

    // 3. Renderujemy widoczne Milestony
    let nextGoalFound = false;
    visibleMilestones.forEach(m => {
        const isAchieved = total >= m.target_distance;
        const isCurrentGoal = !isAchieved && !nextGoalFound;
        if (isCurrentGoal) nextGoalFound = true;
        renderSingleNode(container, m, isAchieved, isCurrentGoal);
    });

    // 4. Obliczamy i ustawiamy wysokość pomarańczowej linii
    calculateVerticalProgress(total, visibleMilestones, hiddenCount);
}

/**
 * LOGIKA OBLICZANIA WYSOKOŚCI LINII PIONOWEJ
 */
function calculateVerticalProgress(total, visibleMilestones, hiddenCount) {
    const activeLine = document.getElementById('active-line');
    if (!activeLine) return;

    // Ile "przerw" mamy w kontenerze? (Start + opcjonalny Stos + Milestony)
    const totalNodes = 1 + (hiddenCount > 0 ? 1 : 0) + visibleMilestones.length;
    const totalGaps = totalNodes - 1;
    
    let visualPercent = 0;

    // Przerwa Start -> (Stos lub Pierwszy Widoczny) jest zawsze pełna
    visualPercent += (1 / totalGaps) * 100;

    // Jeśli jest stos, przerwa Stos -> Pierwszy Widoczny też jest pełna
    if (hiddenCount > 0) {
        visualPercent += (1 / totalGaps) * 100;
    }

    // Liczymy progres wewnątrz widocznego okna
    if (visibleMilestones.length > 1) {
        const windowGaps = visibleMilestones.length - 1;
        const windowWeight = (windowGaps / totalGaps) * 100;
        
        let windowProgress = 0;
        for (let i = 0; i < windowGaps; i++) {
            const s = visibleMilestones[i].target_distance;
            const e = visibleMilestones[i+1].target_distance;

            if (total >= e) {
                windowProgress += (1 / windowGaps);
            } else if (total > s && total < e) {
                windowProgress += ((total - s) / (e - s)) / windowGaps;
                break;
            }
        }
        visualPercent += windowProgress * windowWeight;
    }

    // Animowane ustawienie wysokości
    setTimeout(() => {
        activeLine.style.height = `${Math.min(visualPercent, 100)}%`;
    }, 400);
}

/**
 * KOMPONENT: POJEDYNCZE KÓŁKO
 */
function renderSingleNode(container, m, isAchieved, isCurrentGoal, customIcon = null) {
    const node = document.createElement('div');
    node.className = "flex items-center gap-8 h-20 relative";
    node.innerHTML = `
        <div class="relative z-10">
            <div class="w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-700 
                ${isAchieved ? 'bg-orange-500 border-orange-600 glow-orange' : 'bg-[#1e293b] border-gray-800'}">
                ${customIcon ? customIcon : (isAchieved ? '🏆' : isCurrentGoal ? '🎯' : '🔒')}
            </div>
        </div>
        <div>
            <p class="text-[10px] font-bold uppercase tracking-widest ${isAchieved ? 'text-orange-400' : 'text-gray-600'}">
                ${m.target_distance} km
            </p>
            <h3 class="text-lg font-black ${isAchieved ? 'text-white' : 'text-gray-500'}">${m.name}</h3>
        </div>
    `;
    container.appendChild(node);
}

/**
 * KOMPONENT: STOS UKRYTYCH ETAPÓW
 */
function renderStackedNode(container, count) {
    const node = document.createElement('div');
    node.className = "flex items-center gap-8 h-20 relative py-2";
    node.innerHTML = `
        <div class="relative z-10 ml-1">
            <div class="absolute -top-1 left-0 w-10 h-10 bg-orange-800 rounded-full border-2 border-orange-900 opacity-40"></div>
            <div class="absolute -top-0.5 left-0.5 w-10 h-10 bg-orange-700 rounded-full border-2 border-orange-800 opacity-60"></div>
            <div class="relative w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center border-2 border-orange-500 glow-orange">
                <span class="text-[10px] font-black text-white">+${count}</span>
            </div>
        </div>
        <div>
            <p class="text-[10px] font-black text-orange-500 uppercase tracking-tighter">Zaliczone etapy</p>
            <p class="text-xs text-gray-500 italic">Pominięto ${count} wcześniejszych wyzwań</p>
        </div>
    `;
    container.appendChild(node);
}

async function updateRecentLocations(totalKm) {
    console.log("Sprawdzam lokalizacje dla dystansu:", totalKm);

    const { data: locations, error } = await supabaseClient
        .from('locations')
        .select('*')
        .lte('distance', totalKm) // Pobierz tylko te, które już minąłeś
        .order('distance', { ascending: false });

    if (error) {
        console.error("Błąd pobierania lokalizacji:", error.message);
        return;
    }

    console.log("Znalezione lokalizacje:", locations);

    const marqueeEl = document.getElementById('marquee-text');
    const recentListEl = document.getElementById('recent-locations');

    // Jeśli lista jest pusta (totalKm jest mniejszy niż pierwsza lokalizacja w bazie)
    if (!locations || locations.length === 0) {
        if (marqueeEl) {
            marqueeEl.innerText = "🚩 RUSZAJ W DROGĘ! TWOJA WIELKA WYPRAWA WŁAŚNIE SIĘ ZACZYNA... NASTĘPNY CEL NA MAPIE CZEKA!";
        }
        if (recentListEl) {
            recentListEl.innerHTML = '<p class="text-[10px] text-gray-600 italic px-2">Brak zdobytych miast na tym etapie.</p>';
        }
        return;
    }

    // 1. Aktualizacja MARQUEE (Najnowsza lokalizacja)
    if (marqueeEl) {
        const latest = locations[0];
        // Dodajemy dużo spacji na końcu, żeby tekst się nie "sklejał" przy zapętleniu
        marqueeEl.innerText = `🌍 OSIĄGNIĘTO: ${latest.name} (${latest.distance} KM) • GRATULACJE! • TWOJA PODRÓŻ TRWA...             `;
    }

    // 2. Aktualizacja listy 3 ostatnich pod paskiem
    if (recentListEl) {
        const top3 = locations.slice(0, 3);
        recentListEl.innerHTML = top3.map(loc => `
            <div class="bg-brand-card/50 p-3 rounded-2xl border border-gray-800 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <span class="text-sm">📍</span>
                    <span class="text-xs font-black text-white uppercase tracking-tighter">${loc.name}</span>
                </div>
                <span class="text-[9px] font-black text-brand-primary italic">${loc.distance} km</span>
            </div>
        `).join('');
    }
}

async function sendIdea() {
    const ideaInput = document.getElementById('idea-text');
    const idea = ideaInput.value.trim();
    
    if (!idea) return;

    const { error } = await supabaseClient
        .from('ideas')
        .insert([{ content: idea }]);

    if (error) {
        alert("Błąd: " + error.message);
    } else {
        alert("Dzięki! Pomysł zapisany. 🚀");
        ideaInput.value = '';
    }
}


init();