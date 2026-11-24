// Service Nordic UART (NUS) exposé par la guirlande (MicroPython)
const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
// Caractéristique RX : c'est celle dans laquelle on ÉCRIT pour envoyer une commande
const TX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
// Nom annoncé en Bluetooth par la guirlande (self.nom dans le code MicroPython)
const DEVICE_NAME = 'MaGuirlande';

let device = null; // équipement bluetooth
let tx = null;     // caractéristique d'envoi

function setStatus(text) {
    const el = document.getElementById('status');
    if (el) el.textContent = text;
    console.log(text);
}

function init() {
    if (!('bluetooth' in navigator)) {
        alert('Désolé, votre navigateur ne supporte pas le bluetooth. Vous ne pouvez pas utiliser cette application.');
    }
}

// Appairage : ouvre la fenêtre de sélection (doit être déclenché par un clic)
async function pair() {
    try {
        device = await navigator.bluetooth.requestDevice({
            // La guirlande n'annonce que son NOM (pas son service) : on filtre donc par nom
            filters: [{ namePrefix: DEVICE_NAME }],
            // Indispensable pour pouvoir lire ensuite le service UART
            optionalServices: [SERVICE_UUID]
        });
        device.addEventListener('gattserverdisconnected', onDisconnected);
        setStatus('Appairé : ' + (device.name || 'appareil sans nom'));
    } catch (error) {
        setStatus('Appairage annulé ou échoué : ' + error.message);
    }
}

function onDisconnected() {
    tx = null;
    document.body.classList.remove('connected');
    setStatus('Déconnecté');
}

async function connect() {
    try {
        if (!device) {
            await pair();
            if (!device) return;
        }
        setStatus('Connexion en cours…');
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        tx = await service.getCharacteristic(TX_CHAR_UUID);
        document.body.classList.add('connected');
        setStatus('Connecté à ' + (device.name || 'la guirlande') + ' — prêt');
    } catch (error) {
        console.error(error);
        setStatus('Échec de connexion : ' + error.message);
        tx = null;
    }
}

function disconnect() {
    if (device && device.gatt.connected) {
        device.gatt.disconnect();
    } else {
        setStatus('Aucun appareil connecté');
    }
}

// Les commandes sont courtes (< 20 octets) : un seul paquet suffit
async function sendCmd(cmd) {
    if (!tx || !device || !device.gatt.connected) {
        setStatus('Non connecté : cliquez d\'abord sur « Connecter »');
        return;
    }
    try {
        await tx.writeValue(new TextEncoder().encode(cmd.toLowerCase()));
        setStatus('Commande envoyée : ' + cmd);
    } catch (error) {
        console.error(error);
        setStatus('Échec d\'envoi : ' + error.message);
    }
}

// Curseur de luminosité : affichage en direct, envoi au relâchement
function initBrightness() {
    const slider = document.getElementById('lum');
    const label = document.getElementById('lum-value');
    if (!slider) return;
    slider.addEventListener('input', () => { label.textContent = slider.value + ' %'; });
    slider.addEventListener('change', () => sendCmd('luminosite:' + slider.value));
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(() => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed: ', err));
    });
}

window.addEventListener('DOMContentLoaded', initBrightness);
init();
