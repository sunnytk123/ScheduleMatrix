const STORAGE_KEY = "schedule-matrix";

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
    const json = localStorage.getItem(STORAGE_KEY);

    if (!json) {
        return null;
    }

    return JSON.parse(json);
}

function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
}

window.saveData = saveData;
window.loadData = loadData;
window.clearStorage = clearStorage;