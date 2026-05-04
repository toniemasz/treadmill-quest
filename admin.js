// Połącz się z Supabase
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const msg = document.getElementById('message');

// --- LOGIKA FORMULARZY ---

// 1. OBSŁUGA TRENINGÓW
const workoutForm = document.getElementById('workout-form');
if (workoutForm) {
    workoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const distance = parseFloat(document.getElementById('distance').value);
        const note = document.getElementById('note').value;

        const { error } = await supabaseClient
            .from('workouts')
            .insert([{ distance, note }]);

        if (error) {
            msg.innerText = "Błąd: " + error.message;
            msg.className = "mt-6 text-center text-sm font-bold text-red-500";
        } else {
            msg.innerText = "Trening dodany! 🏃";
            msg.className = "mt-6 text-center text-sm font-bold text-green-500";
            workoutForm.reset();
        }
    });
}

// 2. OBSŁUGA MILESTONÓW
const milestoneForm = document.getElementById('milestone-form');
if (milestoneForm) {
    milestoneForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('ms-name').value;
        const target_distance = parseFloat(document.getElementById('ms-distance').value);
        const icon = document.getElementById('ms-icon').value || '🏆';

        const { error } = await supabaseClient
            .from('milestones')
            .insert([{ name, target_distance, icon }]);

        if (error) {
            msg.innerText = "Błąd: " + error.message;
            msg.className = "mt-6 text-center text-sm font-bold text-red-500";
        } else {
            msg.innerText = "Milestone stworzony! 🎖️";
            msg.className = "mt-6 text-center text-sm font-bold text-green-500";
            milestoneForm.reset();
        }
    });
}

// 3. OBSŁUGA LOKALIZACJI
const locationForm = document.getElementById('location-form');
if (locationForm) {
    locationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('loc-name').value;
        const distance = parseFloat(document.getElementById('loc-distance').value);

        const { error } = await supabaseClient
            .from('locations')
            .insert([{ name, distance }]);

        if (error) {
            msg.innerText = "Błąd: " + error.message;
            msg.className = "mt-6 text-center text-sm font-bold text-red-500";
        } else {
            msg.innerText = "Lokalizacja dodana! 🌍";
            msg.className = "mt-6 text-center text-sm font-bold text-green-500";
            locationForm.reset();
        }
    });
}

// --- ZARZĄDZANIE POMYSŁAMI ---

window.deleteIdea = async function(id) {
    if (!confirm("Czy na pewno chcesz usunąć ten pomysł?")) return;

    const { error } = await supabaseClient
        .from('ideas')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Błąd: " + error.message);
    } else {
        fetchIdeas(); 
    }
};

async function fetchIdeas() {
    const list = document.getElementById('ideas-list');
    list.innerHTML = '<p class="text-gray-600 italic">Ładowanie...</p>';

    const { data, error } = await supabaseClient
        .from('ideas')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        list.innerHTML = "Błąd: " + error.message;
        return;
    }

    list.innerHTML = '';
    if (data && data.length > 0) {
        data.forEach(idea => {
            const item = document.createElement('div');
            item.className = "bg-gray-800 p-4 rounded-2xl border border-gray-700 relative group mb-3";
            item.innerHTML = `
            <div class="pr-8">
                <p class="text-gray-200 text-sm">${idea.content}</p>
                <p class="text-[9px] text-gray-600 mt-2">${new Date(idea.created_at).toLocaleDateString()}</p>
            </div>
            <button onclick="deleteIdea('${idea.id}')" class="absolute top-2 right-2 text-gray-600 hover:text-red-500 p-1">
                usuń
            </button>
        `;
            list.appendChild(item);
        });
    } else {
        list.innerHTML = '<p class="text-gray-600 text-xs text-center">Brak pomysłów.</p>';
    }
}

// --- UI I ZAKŁADKI ---

window.showTab = function(tabName) {
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-brand-primary', 'text-white');
        btn.classList.add('text-gray-500');
    });

    const targetPanel = document.getElementById(`panel-${tabName}`);
    if (targetPanel) targetPanel.classList.remove('hidden');

    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-500');
        activeBtn.classList.add('bg-brand-primary', 'text-white');
    }

    if (tabName === 'ideas') fetchIdeas();
    if (msg) msg.innerText = "";
};

// --- LOGIKA AUTORYZACJI ---

window.login = async function() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        errorEl.innerText = "Błąd: " + error.message;
        errorEl.classList.remove('hidden');
    } else {
        checkUser();
    }
};

async function checkUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const loginSection = document.getElementById('login-section');
    const adminSection = document.getElementById('admin-section');
    
    if (session) {
        loginSection.classList.add('hidden');
        adminSection.classList.remove('hidden');
    } else {
        loginSection.classList.remove('hidden');
        adminSection.classList.add('hidden');
    }
}

window.logout = async function() {
    await supabaseClient.auth.signOut();
    checkUser();
};

checkUser();