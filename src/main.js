// import '../style.css'; 

let schedule = [];

// Track expanded states for song lists
let expandedRows = new Set();

async function init() {
  try {
    const saved = localStorage.getItem('show-schedule');
    if (saved) {
      schedule = JSON.parse(saved);
      if (!Array.isArray(schedule)) schedule = [];
    }
  } catch (e) {
    console.error("Error loading localStorage", e);
  }

  if (!schedule || schedule.length === 0) {
    try {
      const response = await fetch('./src/initialData.json');
      if (!response.ok) throw new Error("JSON initialData not found");
      schedule = await response.json();
    } catch (e) {
      console.error("Error loading JSON", e);
      schedule = []; // Fallback to empty array to avoid crashes
    }
  }

  // Update schedule with songs from CSV if applicable
  try {
    await enrichScheduleWithCSV();
  } catch (e) {
    console.warn("CSV enrichment skipped:", e.message);
  }

  if (Array.isArray(schedule)) {
    schedule = schedule.map(item => ({
      ...item,
      chansons: Array.isArray(item.chansons) ? item.chansons : []
    }));
  } else {
    schedule = [];
  }

  renderTable();
}

async function enrichScheduleWithCSV() {
  try {
    // Look for CSV in src/ folder where we copied it
    const response = await fetch('./src/songs_list_links.csv');
    if (!response.ok) throw new Error("CSV not found at ./src/songs_list_links.csv");
    const text = await response.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return;

    // Simple parsing for this specific CSV
    const csvSongs = lines.slice(1).map(line => {
      // Split by comma but respect basic structure of this file
      const parts = line.split(',');
      return {
        titre: parts[0]?.trim(),
        artiste: parts[1]?.trim(),
        bpm: parts[2]?.trim(),
        key: parts[3]?.trim()
      };
    });

    // Check if André Guay's row (the main DJ set) exists and enrich it
    const andreRow = schedule.find(item => item.artiste === "André Guay");
    if (andreRow && (!andreRow.chansons || andreRow.chansons.length <= 11)) {
      // Only enrich if not already fully populated (11 was the original count)
      const existingTitles = new Set((andreRow.chansons || []).map(s => s.titre.toLowerCase()));
      
      csvSongs.forEach(song => {
        if (!existingTitles.has(song.titre.toLowerCase())) {
          // Add ok status from CSV
          const parts = lines.find(l => l.includes(song.titre))?.split(',');
          const okStatus = parts ? parts[parts.length - 1]?.trim().toUpperCase() === 'TRUE' : false;
          andreRow.chansons.push({ ...song, ok: okStatus });
        }
      });
    }
  } catch (e) {
    console.warn("Could not load CSV for enrichment", e);
  }
}




const tableBody = document.getElementById('table-body');
const addRowBtn = document.getElementById('add-row');
const saveAllBtn = document.getElementById('save-all');
const resetBtn = document.getElementById('reset-data');
const exportBtn = document.getElementById('export-csv');
const newDocBtn = document.getElementById('new-doc');
const loadJsonBtn = document.getElementById('load-json');
const saveJsonBtn = document.getElementById('save-json');
const fileInput = document.getElementById('file-input');

function calculateDuration(start, end) {
  if (!start || !end) return "0 min";
  
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  
  let totalMin1 = h1 * 60 + m1;
  let totalMin2 = h2 * 60 + m2;
  
  if (totalMin2 < totalMin1) {
    totalMin2 += 24 * 60;
  }
  
  const diff = totalMin2 - totalMin1;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  
  if (h > 0) {
    return `${h}h${m > 0 ? m.toString().padStart(2, '0') : '00'}m`;
  }
  return `${m} min`;
}

function renderTable() {
  if (!tableBody) return;
  tableBody.innerHTML = '';
  schedule.forEach((item, index) => {
    const isExpanded = expandedRows.has(index);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="date" value="${item.date}" data-index="${index}" data-key="date"></td>
      <td><input type="text" value="${item.scene}" data-index="${index}" data-key="scene"></td>
      <td><input type="text" value="${item.artiste}" data-index="${index}" data-key="artiste"></td>
      <td><input type="text" value="${item.formule}" data-index="${index}" data-key="formule"></td>
      <td><input type="text" value="${item.taches}" data-index="${index}" data-key="taches"></td>
      <td><input type="time" value="${item.debut}" data-index="${index}" data-key="debut"></td>
      <td><input type="time" value="${item.fin}" data-index="${index}" data-key="fin"></td>
      <td class="duration-cell" id="duration-${index}">${calculateDuration(item.debut, item.fin)}</td>
      <td class="song-list-cell">
        <div class="song-list-header">
          <span>${(item.chansons || []).length} chansons</span>
          <button class="toggle-songs-btn" data-index="${index}">${isExpanded ? 'Réduire' : 'Afficher'}</button>
        </div>
        <div class="song-list-container ${isExpanded ? 'expanded' : 'collapsed'}">
          ${(item.chansons || []).map((song, sIndex) => `
            <div class="song-item">
              <input type="checkbox" class="song-ok" ${song.ok ? 'checked' : ''} data-index="${index}" data-sindex="${sIndex}" data-key="ok">
              <input type="text" class="song-title" value="${song.titre || ''}" data-index="${index}" data-sindex="${sIndex}" data-key="titre" placeholder="Titre">
              <input type="text" class="song-artiste" value="${song.artiste || song.info || ''}" data-index="${index}" data-sindex="${sIndex}" data-key="artiste" placeholder="Artiste">
              <input type="text" class="song-bpm" value="${song.bpm || ''}" data-index="${index}" data-sindex="${sIndex}" data-key="bpm" placeholder="BPM">
              <input type="text" class="song-key" value="${song.key || ''}" data-index="${index}" data-sindex="${sIndex}" data-key="key" placeholder="Key">
              <span class="remove-song-btn" data-index="${index}" data-sindex="${sIndex}">&times;</span>
            </div>
          `).join('')}
          <button class="add-song-btn" data-index="${index}">+ Ajouter chanson</button>
        </div>
      </td>
      <td><button class="delete-btn" data-index="${index}">Suppr.</button></td>
    `;
    tableBody.appendChild(tr);
  });
}

function updateData(index, key, value, sIndex = null) {
  if (sIndex !== null) {
    schedule[index].chansons[sIndex][key] = value;
  } else {
    schedule[index][key] = value;
    if (key === 'debut' || key === 'fin') {
      const durationCell = document.getElementById(`duration-${index}`);
      if (durationCell) {
        durationCell.textContent = calculateDuration(schedule[index].debut, schedule[index].fin);
      }
    }
  }
}

if (tableBody) {
  tableBody.addEventListener('input', (e) => {
    const { index, key, sindex } = e.target.dataset;
    if (index !== undefined && key !== undefined) {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      updateData(parseInt(index), key, value, sindex !== undefined ? parseInt(sindex) : null);
    }
  });

  tableBody.addEventListener('click', (e) => {
    const index = parseInt(e.target.dataset.index);
    if (e.target.classList.contains('delete-btn')) {
      schedule.splice(index, 1);
      renderTable();
    } else if (e.target.classList.contains('toggle-songs-btn')) {
      if (expandedRows.has(index)) {
        expandedRows.delete(index);
      } else {
        expandedRows.add(index);
      }
      renderTable();
    } else if (e.target.classList.contains('add-song-btn')) {
      if (!schedule[index].chansons) schedule[index].chansons = [];
      schedule[index].chansons.push({ titre: '', artiste: '', bpm: '', key: '', ok: false });
      renderTable();
    } else if (e.target.classList.contains('remove-song-btn')) {
      const sIndex = parseInt(e.target.dataset.sindex);
      schedule[index].chansons.splice(sIndex, 1);
      renderTable();
    }
  });
}

if (addRowBtn) {
  addRowBtn.addEventListener('click', () => {
    const lastRow = schedule[schedule.length - 1] || { date: new Date().toISOString().split('T')[0], debut: '09:00' };
    schedule.push({
      date: lastRow.date,
      scene: lastRow.scene || "",
      artiste: "",
      formule: "",
      taches: "Nouveauté",
      debut: lastRow.fin || "09:00",
      fin: "",
      chansons: []
    });
    renderTable();
  });
}

if (newDocBtn) {
  newDocBtn.addEventListener('click', () => {
    if (confirm('Créer un nouveau document vide ?')) {
      schedule = [{
        date: new Date().toISOString().split('T')[0],
        scene: "",
        artiste: "",
        formule: "",
        taches: "Début",
        debut: "08:00",
        fin: "09:00",
        chansons: []
      }];
      renderTable();
    }
  });
}

if (saveJsonBtn) {
  saveJsonBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(schedule, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `show_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
  });
}

if (loadJsonBtn) {
  loadJsonBtn.addEventListener('click', () => fileInput.click());
}

if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loadedData = JSON.parse(event.target.result);
        if (Array.isArray(loadedData)) {
          schedule = loadedData;
          renderTable();
          alert("JSON chargé avec succès !");
        } else {
          alert("Format JSON invalide (doit être un tableau)");
        }
      } catch (err) { alert("Erreur chargement JSON"); }
    };
    reader.readAsText(file);
  });
}

if (saveAllBtn) {
  saveAllBtn.addEventListener('click', () => {
    localStorage.setItem('show-schedule', JSON.stringify(schedule));
    alert('Enregistré dans le navigateur !');
  });
}

if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const headers = ["Date", "Scène", "Artiste", "Formule", "Tâches", "Début", "Fin", "Durée", "Chansons"];
    const rows = schedule.map(item => [
      item.date,
      item.scene,
      item.artiste,
      item.formule,
      item.taches,
      item.debut,
      item.fin,
      calculateDuration(item.debut, item.fin),
      `"${(item.chansons || []).map(s => `${s.ok ? '[OK] ' : ''}${s.titre} (${s.artiste || ''}) [BPM:${s.bpm || '-'}, Key:${s.key || '-'}]`).join(' | ').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "export_show.csv";
    link.click();
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (confirm('Reset aux données initiales ?')) {
      schedule = JSON.parse(JSON.stringify(initialData));
      localStorage.removeItem('show-schedule');
      renderTable();
    }
  });
}

init();


