/*
IMPORTANTE INSTALAR SOX "SOX - Sound eXchange" EN EL SERVIDOR QUE VA A REPRODUCIR LA MUSICA
EN ESTE CASO SE USA MIC PARA GRABAR EL MEZCLADOR DE REALTEK 
*/
const WebSocket = require('ws');
const mic = require('mic');
const { fft, util } = require('fft-js');

// Configura la conexión WebSocket con el servidor de luces
const ws = new WebSocket('ws://XXX.XXX.XXX.XXX:4854');

// Variables para el ajuste dinámico
let bassMax = 0; // Máximo histórico para bajos
let midMax = 0; // Máximo histórico para medios
let trebleMax = 0; // Máximo histórico para agudos
const smoothingFactor = 0.98; // Factor para promediar los valores máximos

let todosLosCanales = true;
let soloBajos = false;
let soloMedios = false;
let soloAltos = false;

ws.on('open', () => {
  console.log('Conectado al servidor de luces');
});

ws.on('close', () => {
  console.log('Conexión cerrada');
});

// Configuración del micrófono
const micInstance = mic({
    rate: '44100',
    channels: '2',
    debug: false,
    device: 'Mezcla estéreo'
  });
  const micInputStream = micInstance.getAudioStream();
  
  micInputStream.on('data', (data) => {
  
    const signal = Array.from(new Int16Array(data.buffer));
    const fftSize = Math.pow(2, Math.floor(Math.log2(signal.length)));
    const croppedSignal = signal.slice(0, fftSize);
  
    try {
  
      // Calcular el nivel RMS
      let sum = 0;
      for (let i = 0; i < signal.length; i++) {
        sum += signal[i] * signal[i];  // Cuadrado de cada muestra
      }
  
      const rms = Math.sqrt(sum / signal.length);  // Raíz cuadrada del promedio de los cuadrados
      const dB = 20 * Math.log10(rms / 32768); // Convertir a decibelios
  
      const phasors = fft(croppedSignal);
      const magnitudes = util.fftMag(phasors);
  
      const bass = magnitudes.slice(0, 10).reduce((a, b) => a + b, 0);
      const mid = magnitudes.slice(10, 20).reduce((a, b) => a + b, 0);
      const treble = magnitudes.slice(20).reduce((a, b) => a + b, 0);
  
      // Actualiza los máximos históricos con suavizado
      bassMax = Math.max(bassMax * smoothingFactor, bass);
      midMax = Math.max(midMax * smoothingFactor, mid);
      trebleMax = Math.max(trebleMax * smoothingFactor, treble);
  
      // Normaliza los valores a un rango de 0-255
      const bassValue = Math.min(255, Math.round((bass / bassMax) * 255));
      const midValue = Math.min(255, Math.round((mid / midMax) * 255));
      const trebleValue = Math.min(255, Math.round((treble / trebleMax) * 255));
  
      if (ws.readyState === WebSocket.OPEN) {
  
        if (dB > -70) { // Solo procesar si hay audio (umbral ajustado a -70 dB)

            ws.send(
              JSON.stringify({
                bass: bassValue-140,
                mid: midValue-160,
                treble: trebleValue-130
              })
            );
  
        }else{
  
          ws.send(
            JSON.stringify({
              bass: 0,
              mid: 0,
              treble: 0,
            })
          );
  
        }
  
      }
  
    } catch (error) {
      console.error('Error al calcular la FFT:', error);
    }
  });
  
  micInputStream.on('error', (err) => {
    console.error('Error al capturar audio:', err);
  });
  
micInstance.start();
console.log('Iniciando captura de audio con normalización dinámica...');