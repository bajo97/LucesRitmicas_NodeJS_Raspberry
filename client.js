/*
CLIENTE PARA LA RASPBERRY
ESTE CLIENTE ESTA PENSADO PARA CONTROLAR 3 LUCES LED CON MOSFET DE CANAL N EN LOS PUERTOS GPIO ASIGNADOS
EN ESTE PROYECTO LOS MOSFET DE CANAL N SE ACTIVAN CON PULSOS A LA PUERTA CON LA RASPBERRY ACTIVANDO EL LED
*/

const WebSocket = require('ws');
const Gpio = require('pigpio').Gpio;

// Configurar LEDs
const led1 = new Gpio(7, { mode: Gpio.OUTPUT });  // Rojo - Bajos
const led2 = new Gpio(2, { mode: Gpio.OUTPUT }); // Azul - Medios
const led3 = new Gpio(15, { mode: Gpio.OUTPUT }); // Verde - Agudos

// Variables para suavizado
let currentBass = 0; // Valor actual del LED rojo
let currentMid = 0;  // Valor actual del LED azul
let currentTreble = 0; // Valor actual del LED verde

let targetBass = 0; // Valor objetivo para bajos
let targetMid = 0;  // Valor objetivo para medios
let targetTreble = 0; // Valor objetivo para agudos

const easingFactor = 0.2; // Factor de suavizado (entre 0 y 1)

// Función para actualizar suavemente los LEDs
function smoothUpdate() {
  // Interpolación lineal para suavizar los valores
  currentBass += easingFactor * (targetBass - currentBass);
  currentMid += easingFactor * (targetMid - currentMid);
  currentTreble += easingFactor * (targetTreble - currentTreble);

  // Escribir los valores suavizados a los LEDs
  led1.pwmWrite(Math.round(currentBass));
  led2.pwmWrite(Math.round(currentMid));
  led3.pwmWrite(Math.round(currentTreble));

  // Repetir suavizado en el próximo intervalo
  setTimeout(smoothUpdate, 20);
}

// Configurar el servidor WebSocket
const wss = new WebSocket.Server({ port: 4854, host: 'XXX.XXX.XXX.XXX' });

wss.on('connection', (ws) => {
  console.log('Cliente conectado');

  ws.on('message', (message) => {
    try {

      const { bass, mid, treble } = JSON.parse(message);

      // Actualizar los valores objetivo de forma segura
      targetBass = Math.min(255, Math.max(0, bass));
      targetMid = Math.min(255, Math.max(0, mid));
      targetTreble = Math.min(255, Math.max(0, treble));

    } catch (err) {
        led1.pwmWrite(0);
        led2.pwmWrite(0);
        led3.pwmWrite(0);
      console.error('Error al procesar mensaje:', err);
    }
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
    led1.pwmWrite(0);
    led2.pwmWrite(0);
    led3.pwmWrite(0);
  });
});

// Comienza la actualización suave de los LEDs
smoothUpdate();

console.log('Servidor de luces ejecutándose en el puerto 4854...');
