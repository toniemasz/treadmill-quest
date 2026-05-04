const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
let allWorkouts = []; // Tu przechowamy wszystkie dane z bazy
let myChart = null;   // Zmienna przechowująca instancję wykresu

async function initStats() {
    try {
        const { data, error } = await supabaseClient
            .from('workouts')
            .select('distance, created_at')
            .order('created_at', { ascending: true });

        if (error) throw error;
        
        allWorkouts = data;
        updateFilter('all'); // Na start pokazujemy wszystko

    } catch (err) {
        console.error("Błąd statystyk:", err.message);
    }
}

function updateFilter(range) {
    // 1. Wizualna zmiana przycisków
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-orange-600', 'text-white');
        btn.classList.add('text-gray-400');
    });
    document.getElementById(`btn-${range}`).classList.add('bg-orange-600', 'text-white');
    document.getElementById(`btn-${range}`).classList.remove('text-gray-400');

    // 2. Filtrowanie danych
    const now = new Date();
    let filteredData = allWorkouts;

    if (range !== 'all') {
        const daysMap = { '7d': 7, '30d': 30, '1y': 365 };
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - daysMap[range]);
        
        filteredData = allWorkouts.filter(w => new Date(w.created_at) >= cutoffDate);
    }

    // 3. Przetworzenie na format skumulowany i rysowanie
    const processed = processCumulativeData(filteredData);
    renderChart(processed);
}

function processCumulativeData(workouts) {
    const dailySums = {};
    workouts.forEach(w => {
        const date = new Date(w.created_at).toLocaleDateString('pl-PL');
        dailySums[date] = (dailySums[date] || 0) + w.distance;
    });

    const labels = Object.keys(dailySums);
    const values = [];
    let runningTotal = 0;

    labels.forEach(date => {
        runningTotal += dailySums[date];
        values.push(runningTotal);
    });

    return { labels, values };
}

function renderChart(data) {
    const ctx = document.getElementById('progressChart').getContext('2d');

    // Kluczowe: niszczymy stary wykres przed stworzeniem nowego
    if (myChart) {
        myChart.destroy();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(249, 115, 22, 0.4)');
    gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Suma km',
                data: data.values,
                borderColor: '#f97316',
                backgroundColor: gradient,
                fill: true,
                tension: 0.3,
                borderWidth: 4,
                pointRadius: 4,
                pointBackgroundColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(75, 85, 99, 0.2)' }, ticks: { color: '#9ca3af' } },
                x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
            }
        }
    });
}

initStats();