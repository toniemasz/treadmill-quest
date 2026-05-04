
        const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

        async function fetchHistory() {
            try {
                // Pobieramy treningi posortowane od najnowszych
                const { data, error } = await supabaseClient
                    .from('workouts')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                renderHistory(data);
            } catch (err) {
                console.error("Błąd pobierania historii:", err.message);
                document.getElementById('history-list').innerHTML = `<p class="text-red-500">Błąd ładowania danych</p>`;
            }
        }

        function renderHistory(workouts) {
            const listContainer = document.getElementById('history-list');
            const totalSessionsEl = document.getElementById('total-sessions');
            const sumKmEl = document.getElementById('sum-km');

            if (workouts.length === 0) {
                listContainer.innerHTML = `<p class="text-gray-600 italic text-sm">Brak zapisanych treningów. Czas wejść na bieżnię!</p>`;
                return;
            }

            let totalKm = 0;
            listContainer.innerHTML = ''; // Czyścimy loader

            workouts.forEach(w => {
                totalKm += w.distance;
                
                // Formatowanie daty na polski styl
                const date = new Date(w.created_at).toLocaleDateString('pl-PL', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                });

                const item = document.createElement('div');
                item.className = "bg-gray-800/50 p-4 rounded-2xl border border-gray-700 flex justify-between items-center transition-transform active:scale-95";
                
                item.innerHTML = `
                    <div>
                        <p class="text-white font-bold text-lg">${w.distance.toFixed(1)} km</p>
                        <p class="text-gray-500 text-xs">${date}</p>
                        ${w.note ? `<p class="text-orange-400/70 text-[10px] mt-1 italic">"${w.note}"</p>` : ''}
                    </div>
                    <div class="text-gray-700 text-2xl font-black">#</div>
                `;
                listContainer.appendChild(item);
            });

            // Aktualizacja liczników na górze
            totalSessionsEl.innerText = workouts.length;
            sumKmEl.innerText = totalKm.toFixed(1);
        }

        fetchHistory();